"use client";

import type { ChatMessage } from "@/lib/room-types";
import { fullText } from "@/lib/room-types";

import { SparkleIcon } from "../icons";
import { Avatar } from "./avatar";
import { PrettyBody } from "./pretty-body";
import { SpeakButton } from "./speak-button";

/**
 * The thread's final agent reply, rendered outside the per-agent process
 * dropdowns so the answer is always visible without expanding anything.
 */
export const FinalAnswerCard = ({ msg }: { msg: ChatMessage }) => {
  const text = fullText(msg);
  const thinking = msg.streaming
    ? (msg.ticks?.find((t) => t.kind === "thinking")?.payload ?? "Thinking…")
    : null;
  return (
    <div className="border-blurple/30 bg-blurple/[0.07] overflow-hidden border shadow-sm">
      <div className="border-blurple/20 flex items-center gap-2 border-b px-3 py-1.5">
        <SparkleIcon className="h-3 w-3 text-[#8b9bff]" />
        <span className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-[#aab4ff] uppercase">
          Final answer
        </span>
        <span className="text-ink-ghost font-mono text-[10px]">
          {msg.createdAt}
        </span>
        {!msg.streaming && text.trim().length > 0 && (
          <SpeakButton
            id={`final:${String(msg.messageId)}`}
            text={text}
            className="ml-auto"
          />
        )}
      </div>
      <div className="flex gap-2.5 px-3 py-2.5">
        <Avatar
          name={msg.authorName}
          color={msg.authorColor}
          size={28}
          bot={msg.authorAgent !== null}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span
              className="text-[13px] font-semibold"
              style={{ color: msg.authorColor }}
            >
              {msg.authorName}
            </span>
            {thinking && (
              <span className="text-ink-faint text-[11px] italic">
                {thinking}
              </span>
            )}
          </div>
          <div className="mt-1.5">
            {text.trim().length > 0 ? (
              <PrettyBody text={text} streaming={msg.streaming} />
            ) : (
              <p className="text-ink-faint text-[12px] italic">
                Agent is writing the answer…
              </p>
            )}
          </div>
          {msg.streaming && (
            <div className="stream-shimmer mt-2 h-[2px] w-28" aria-hidden />
          )}
        </div>
      </div>
    </div>
  );
};
