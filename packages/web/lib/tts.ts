"use client";

import { useSyncExternalStore } from "react";

let audio: HTMLAudioElement | null = null;
let speakingId: string | null = null;
let generation = 0;
const subscribers = new Set<() => void>();

const setSpeakingId = (id: string | null): void => {
  speakingId = id;
  for (const notify of subscribers) {
    notify();
  }
};

const stopAudio = (): void => {
  if (audio !== null) {
    audio.pause();
    audio = null;
  }
};

const finish = (gen: number): void => {
  if (gen !== generation) {
    return;
  }
  generation += 1;
  stopAudio();
  setSpeakingId(null);
};

export const getSpeakingId = (): string | null => speakingId;

export const subscribeTts = (listener: () => void): (() => void) => {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
};

export const stopSpeaking = (): void => {
  generation += 1;
  stopAudio();
  setSpeakingId(null);
};

export const speakText = async (id: string, text: string): Promise<void> => {
  if (speakingId === id && audio !== null) {
    stopSpeaking();
    return;
  }
  stopSpeaking();
  const gen = generation;
  setSpeakingId(id);
  try {
    const response = await fetch("/api/tts", {
      body: JSON.stringify({ text: text.slice(0, 8000) }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    if (!response.ok) {
      let message = `TTS request failed (${response.status})`;
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
    if (gen !== generation) {
      return;
    }
    const blob = await response.blob();
    if (gen !== generation) {
      return;
    }
    const url = URL.createObjectURL(blob);
    const next = new Audio(url);
    next.addEventListener("ended", () => finish(gen), { once: true });
    next.addEventListener("error", () => finish(gen), { once: true });
    audio = next;
    await next.play();
  } catch (error) {
    if (gen === generation) {
      finish(gen);
    }
    console.warn("[tts]", error instanceof Error ? error.message : error);
  }
};

export const useTts = (): {
  isSpeaking: boolean;
  speakingId: string | null;
  speak: (id: string, text: string) => void;
  stop: () => void;
} => {
  const currentId = useSyncExternalStore(
    subscribeTts,
    getSpeakingId,
    getSpeakingId
  );
  return {
    isSpeaking: currentId !== null,
    speak: (id, text) => {
      void speakText(id, text);
    },
    speakingId: currentId,
    stop: stopSpeaking,
  };
};
