"use client";

import { useEffect, useMemo, useRef } from "react";

import type { Agent, ChatMessage, Thread, ThreadView } from "@/lib/room-types";
import { ThreadStatus } from "@/lib/room-types";

import { MessageItem } from "./message-item";

interface ThreadGroup {
  threadId: bigint;
  items: ChatMessage[];
}

const threadLabel = (status: number): string => {
  if (status === ThreadStatus.Streaming) {
    return "live";
  }
  if (status === ThreadStatus.Merged) {
    return "merged";
  }
  if (status === ThreadStatus.Closed) {
    return "closed";
  }
  return "open";
};

const ThreadDivider = ({
  title,
  status,
  count,
}: {
  title: string;
  status: number;
  count: number;
}) => (
  <div className="flex items-center gap-3 px-4 pt-5 pb-1">
    <span className="h-px flex-1 bg-white/[0.07]" />
    <span className="max-w-full truncate text-[13px] font-semibold text-white">
      {title}
    </span>
    <span className="bg-blurple-soft px-1.5 py-px font-mono text-[10px] font-bold tracking-[0.1em] text-[#c3cbff] uppercase">
      {threadLabel(status)}
    </span>
    <span className="text-ink-ghost font-mono text-[10px]">
      {count} {count === 1 ? "msg" : "msgs"}
    </span>
    <span className="h-px flex-1 bg-white/[0.07]" />
  </div>
);

const isCompact = (m: ChatMessage, prev: ChatMessage | undefined): boolean => {
  if (!prev || (m.role !== 0 && m.role !== 1)) {
    return false;
  }
  return (
    prev.authorHex === m.authorHex &&
    prev.role === m.role &&
    !m.streaming &&
    !prev.streaming &&
    !m.toolCall
  );
};

export const MessageList = ({
  messages,
  threads,
  agents,
  roomName,
  threadSummaries,
  onOpenThread,
}: {
  messages: ChatMessage[];
  threads: Thread[];
  agents: Agent[];
  roomName: string;
  threadSummaries?: Map<string, ThreadView>;
  onOpenThread?: (threadId: bigint) => void;
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const titles = useMemo(() => {
    const map = new Map<string, Thread>();
    for (const t of threads) {
      map.set(String(t.threadId), t);
    }
    return map;
  }, [threads]);

  // First (origin) user message id per thread. Only origins appear in the main
  // chat; follow-up steering messages live inside the thread pane.
  const threadOrigins = useMemo(() => {
    const first = new Map<string, bigint>();
    for (const m of messages) {
      if (m.role !== 0) {
        continue;
      }
      const key = String(m.threadId);
      const current = first.get(key);
      if (current === undefined || m.messageId < current) {
        first.set(key, m.messageId);
      }
    }
    return first;
  }, [messages]);

  // Contiguous runs per thread in time order. The main chat only shows each
  // thread's origin prompt (plus system rows) — agent replies and in-thread
  // steering stay inside the thread pane.
  const groups = useMemo(() => {
    const out: ThreadGroup[] = [];
    for (const m of messages) {
      const isOrigin =
        m.role === 0 && threadOrigins.get(String(m.threadId)) === m.messageId;
      if (m.role !== 3 && !isOrigin) {
        continue;
      }
      const last = out.at(-1);
      if (last && last.threadId === m.threadId) {
        last.items.push(m);
      } else {
        out.push({ items: [m], threadId: m.threadId });
      }
    }
    return out;
  }, [messages, threadOrigins]);

  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto pb-4"
      aria-live="polite"
      aria-label="Messages"
    >
      {/* room intro */}
      <div className="px-4 pt-6 pb-4">
        <div className="bg-blurple font-display shadow-pop grid h-16 w-16 place-items-center text-3xl font-bold text-white ring-1 ring-white/10">
          {roomName.slice(0, 1).toUpperCase()}
        </div>
        <h2 className="font-display mt-3 text-2xl font-bold tracking-tight text-white">
          Welcome to {roomName}
        </h2>
        <p className="text-ink-dim mt-1 max-w-xl text-[14px] leading-relaxed">
          One shared brain per room —{" "}
          <span className="bg-blurple-soft px-1 font-semibold text-[#c3cbff]">
            @neb
          </span>{" "}
          routes,{" "}
          <span className="bg-blurple-soft px-1 font-semibold text-[#c3cbff]">
            @researcher
          </span>{" "}
          searches,{" "}
          <span className="bg-blurple-soft px-1 font-semibold text-[#c3cbff]">
            @marketing
          </span>{" "}
          analyzes,{" "}
          <span className="bg-blurple-soft px-1 font-semibold text-[#c3cbff]">
            @evaluator
          </span>{" "}
          decides. Memory compounds across every thread.
        </p>
      </div>

      {groups.map((g, gi) => {
        const t = titles.get(String(g.threadId));
        const summary = threadSummaries?.get(String(g.threadId));
        const isGeneral =
          t?.title === "General" ||
          (t?.status === ThreadStatus.Open && (summary?.replyCount ?? 0) === 0);
        const hasThreadActivity =
          (summary?.replyCount ?? 0) > 0 || Boolean(summary?.streaming);
        return (
          <div key={`${String(g.threadId)}-${gi}`}>
            {!isGeneral && (
              <ThreadDivider
                title={t?.title ?? "Thread"}
                status={t?.status ?? ThreadStatus.Open}
                count={g.items.length}
              />
            )}
            {g.items.map((m, j) => {
              const threadFooter =
                m.role === 0 &&
                onOpenThread &&
                (!isGeneral || hasThreadActivity)
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
                  compact={isCompact(m, g.items[j - 1])}
                  threadFooter={threadFooter}
                />
              );
            })}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
};
