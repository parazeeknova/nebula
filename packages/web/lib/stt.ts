import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const TARGET_RATE = 16_000;

const pickMimeType = (): string | undefined => {
  if (typeof MediaRecorder === "undefined") {
    return undefined;
  }
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((mime) => MediaRecorder.isTypeSupported(mime));
};

const stopTracks = (stream: MediaStream | null): void => {
  if (stream === null) {
    return;
  }
  for (const track of stream.getTracks()) {
    track.stop();
  }
};

const writeAscii = (view: DataView, offset: number, text: string): void => {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.codePointAt(i) ?? 0);
  }
};

/** Decode any recorded blob and re-encode as mono 16 kHz 16-bit PCM WAV. */
export const toWavPcm16 = async (blob: Blob): Promise<Blob> => {
  const AudioCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (AudioCtor === undefined) {
    throw new Error("WebAudio is not supported in this browser");
  }
  const context = new AudioCtor();
  try {
    const raw = await blob.arrayBuffer();
    const decoded = await context.decodeAudioData(raw);
    const frames = Math.max(1, Math.ceil(decoded.duration * TARGET_RATE));
    const offline = new OfflineAudioContext(1, frames, TARGET_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start(0);
    const rendered = await offline.startRendering();
    const samples = rendered.getChannelData(0);

    const dataSize = samples.length * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    writeAscii(view, 0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeAscii(view, 8, "WAVE");
    writeAscii(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, TARGET_RATE, true);
    view.setUint32(28, TARGET_RATE * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeAscii(view, 36, "data");
    view.setUint32(40, dataSize, true);
    for (let i = 0; i < samples.length; i += 1) {
      const clamped = Math.max(-1, Math.min(1, samples[i] ?? 0));
      const value =
        clamped < 0
          ? Math.round(clamped * 32_768)
          : Math.round(clamped * 32_767);
      view.setInt16(44 + i * 2, value, true);
    }
    return new Blob([buffer], { type: "audio/wav" });
  } finally {
    void context.close();
  }
};

export const transcribeBlob = async (blob: Blob): Promise<string> => {
  const wav = await toWavPcm16(blob);
  const response = await fetch("/api/stt", {
    body: new Uint8Array(await wav.arrayBuffer()),
    headers: { "Content-Type": "audio/wav" },
    method: "POST",
  });
  if (!response.ok) {
    let message = `STT request failed (${response.status})`;
    try {
      const json = (await response.json()) as { error?: string };
      if (typeof json.error === "string") {
        message = json.error;
      }
    } catch {
      // keep generic message
    }
    throw new Error(message);
  }
  const json = (await response.json()) as { transcription?: unknown };
  const transcription =
    typeof json.transcription === "string" ? json.transcription.trim() : "";
  if (transcription.length === 0) {
    throw new Error("No speech was recognized");
  }
  return transcription;
};

export type VoiceStatus = "idle" | "recording" | "transcribing";

const SILENCE_MS = 2000;
const LEVEL_POLL_MS = 200;
// RMS floor, scaled x1000.
const SILENCE_LEVEL = 8;

interface SilenceHandle {
  stop: () => void;
}

const noopStop = (): void => undefined;

/**
 * Watches a live mic stream and fires onSilence after SILENCE_MS of quiet.
 * Uses an AnalyserNode's time-domain RMS so the recorder is never consulted.
 */
const attachSilenceDetector = (
  stream: MediaStream,
  onSilence: () => void
): SilenceHandle => {
  const AudioCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (AudioCtor === undefined) {
    return { stop: noopStop };
  }
  const context = new AudioCtor();
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);
  const data = new Uint8Array(analyser.fftSize);
  let silentSince = 0;

  const timer = window.setInterval(() => {
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (const sample of data) {
      const v = (sample - 128) / 128;
      sum += v * v;
    }
    const level = Math.sqrt(sum / data.length) * 1000;
    if (level < SILENCE_LEVEL) {
      const now = performance.now();
      if (silentSince === 0) {
        silentSince = now;
      } else if (now - silentSince >= SILENCE_MS) {
        onSilence();
      }
    } else {
      silentSince = 0;
    }
  }, LEVEL_POLL_MS);

  return {
    stop: () => {
      window.clearInterval(timer);
      void context.close();
    },
  };
};

/** Records the microphone, transcribes via the server proxy, fires onResult. */
export const useStt = (
  onResult: (text: string) => void
): {
  status: VoiceStatus;
  supported: boolean;
  toggle: () => void;
} => {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceRef = useRef<SilenceHandle>({ stop: noopStop });
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const supported = useMemo(
    () =>
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== "undefined",
    []
  );

  useEffect(
    () => () => {
      silenceRef.current.stop();
      const recorder = recorderRef.current;
      if (recorder !== null && recorder.state !== "inactive") {
        recorder.stop();
      }
      stopTracks(streamRef.current);
    },
    []
  );

  const toggle = useCallback(() => {
    if (status === "recording") {
      const recorder = recorderRef.current;
      if (recorder !== null && recorder.state !== "inactive") {
        recorder.stop();
      }
      return;
    }
    if (status === "transcribing") {
      return;
    }
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        streamRef.current = stream;
        chunksRef.current = [];
        const mimeType = pickMimeType();
        const recorder =
          mimeType === undefined
            ? new MediaRecorder(stream)
            : new MediaRecorder(stream, { mimeType });
        recorder.addEventListener("dataavailable", (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        });
        recorder.addEventListener("stop", () => {
          silenceRef.current.stop();
          void (async () => {
            stopTracks(streamRef.current);
            setStatus("transcribing");
            try {
              const type = recorder.mimeType || "audio/webm";
              const blob = new Blob(chunksRef.current, { type });
              const text = await transcribeBlob(blob);
              onResultRef.current(text);
            } catch (error) {
              console.warn(
                "[stt]",
                error instanceof Error ? error.message : error
              );
            } finally {
              setStatus("idle");
            }
          })();
        });
        recorderRef.current = recorder;
        recorder.start();
        setStatus("recording");
        silenceRef.current.stop();
        silenceRef.current = attachSilenceDetector(stream, () => {
          if (recorder.state !== "inactive") {
            recorder.stop();
          }
        });
      } catch (error) {
        console.warn(
          "[stt] mic error",
          error instanceof Error ? error.message : error
        );
        setStatus("idle");
      }
    })();
  }, [status]);

  return { status, supported, toggle };
};
