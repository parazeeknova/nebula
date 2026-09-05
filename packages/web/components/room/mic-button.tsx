"use client";

import { useStt } from "@/lib/stt";

import { MicIcon } from "../icons";

export const MicButton = ({
  connected,
  onText,
}: {
  connected: boolean;
  onText: (text: string) => void;
}) => {
  const { status, supported, toggle } = useStt(onText);
  const recording = status === "recording";
  const transcribing = status === "transcribing";
  const disabled = !supported || !connected || transcribing;

  let label = "Record voice message";
  if (!supported) {
    label = "Speech input is not supported in this browser";
  } else if (recording) {
    label = "Stop and transcribe";
  } else if (transcribing) {
    label = "Transcribing…";
  }

  let style = "text-ink-dim hover:text-ink bg-white/[0.06] hover:bg-white/10";
  if (recording) {
    style = "bg-rose/15 text-rose animate-pulse";
  } else if (disabled) {
    style = "text-ink-ghost bg-white/[0.06]";
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={toggle}
      className={`mb-0.5 grid h-8 w-8 shrink-0 place-items-center transition ${style}`}
    >
      <MicIcon className="h-3.5 w-3.5" />
    </button>
  );
};
