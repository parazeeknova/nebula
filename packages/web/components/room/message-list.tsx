"use client";

import { useEffect, useMemo, useRef } from "react";

import type { Agent, ChatMessage, ThreadView } from "@/lib/room-types";

import { MessageItem } from "./message-item";

export const MessageList = ({
  messages,
  agents,
  roomName,
  threadSummaries,
  onOpenThread,
}: {
  messages: ChatMessage[];
  agents: Agent[];
  roomName: string;
  threadSummaries?: Map<string, ThreadView>;
  onOpenThread?: (threadId: bigint) => void;
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const compactFlags = useMemo(
    () =>
      messages.map((m, i) => {
        if (i === 0 || (m.role !== 0 && m.role !== 1)) {
          return false;
        }
        const prev = messages[i - 1];
        if (!prev) {
          return false;
        }
        return (
          prev.authorHex === m.authorHex &&
          prev.role === m.role &&
          !m.streaming &&
          !prev.streaming &&
          !m.toolCall
        );
      }),
    [messages]
  );

  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto pb-4"
      aria-live="polite"
      aria-label="Messages"
    >
      {/* room intro */}
      <div className="px-4 pt-6 pb-4">
        <div className="from-blurple font-display shadow-pop grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br to-[#8b5cf6] text-3xl font-bold text-white ring-1 ring-white/10">
          {roomName.slice(0, 1).toUpperCase()}
        </div>
        <h2 className="font-display mt-3 text-2xl font-bold tracking-tight text-white">
          Welcome to {roomName}
        </h2>
        <p className="text-ink-dim mt-1 max-w-xl text-[14px] leading-relaxed">
          One shared brain per room — tag an agent with{" "}
          <span className="bg-blurple-soft rounded px-1 font-semibold text-[#c3cbff]">
            @
          </span>{" "}
          or just ask. Memory compounds across every thread.
        </p>
      </div>

      {messages.map((m, i) => {
        const summary = threadSummaries?.get(String(m.threadId));
        const threadFooter =
          m.role === 0 && onOpenThread
            ? {
                lastAgentName: summary?.lastAgentName,
                onOpen: () => onOpenThread(m.threadId),
                replyCount: summary?.replyCount ?? 0,
                streaming: summary?.streaming,
              }
            : undefined;

        return (
          <MessageItem
            key={String(m.messageId)}
            msg={m}
            agents={agents}
            compact={compactFlags[i] ?? false}
            threadFooter={threadFooter}
          />
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
};
