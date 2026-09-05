"use client";

import { useTts } from "@/lib/tts";

import { VolumeIcon } from "../icons";

export const SpeakButton = ({
  id,
  text,
  className = "",
}: {
  id: string;
  text: string;
  className?: string;
}) => {
  const { isSpeaking, speak, speakingId, stop } = useTts();
  const active = isSpeaking && speakingId === id;

  return (
    <button
      type="button"
      aria-label={active ? "Stop reading aloud" : "Read aloud"}
      aria-pressed={active}
      onClick={(e) => {
        e.stopPropagation();
        if (active) {
          stop();
        } else {
          speak(id, text);
        }
      }}
      className={`inline-flex items-center justify-center rounded transition ${
        active
          ? "text-blurple animate-pulse"
          : "text-ink-faint hover:text-ink hover:bg-white/5"
      } ${className}`}
    >
      <VolumeIcon className="h-3.5 w-3.5" />
    </button>
  );
};
