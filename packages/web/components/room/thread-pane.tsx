"use client";

import { useSpacetimeDB } from "spacetimedb/react";

import { useSteerThread, useStreamTicks, useThreadDetails } from "@/lib/live";
import type { Agent, RoomHuman } from "@/lib/room-types";

import { ChevronLeftIcon, XIcon } from "../icons";
import { Composer } from "./composer";
import { ThreadFeed } from "./thread-feed";

export const ThreadPane = ({
  threadId,
  roomId,
  agents,
  humans,
  onClose,
  onTyping,
  onStopTyping,
  onVoiceChange,
}: {
  threadId: bigint;
  roomId: bigint;
  agents: Agent[];
  humans: RoomHuman[];
  onClose: () => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
  onVoiceChange?: (recording: boolean) => void;
}) => {
  const { isActive: connected } = useSpacetimeDB();
  const ticks = useStreamTicks();
  const { thread, timeline } = useThreadDetails(
    threadId,
    roomId,
    agents,
    ticks
  );
  const steer = useSteerThread(threadId);

  const typingNames = humans
    .filter((h) => h.isTyping && h.roleLabel !== "you")
    .map((h) => h.displayName.split(" ")[0] ?? h.displayName);

  return (
    <aside
      className="flex h-full w-full flex-col border-l border-white/[0.06] bg-[#07080a]"
      aria-label="Thread pane"
    >
      {/* header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.06] px-4 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={onClose}
            className="text-ink-dim hover:text-ink -ml-1 p-1.5 transition hover:bg-white/5 lg:hidden"
            aria-label="Back to main chat"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <span className="font-display truncate text-[14px] font-bold text-white">
            # {thread?.title || "Thread"}
          </span>
          <span className="bg-blurple h-1.5 w-1.5 shrink-0 shadow-[0_0_6px_rgba(88,101,242,0.8)]" />
        </div>
        <button
          onClick={onClose}
          className="text-ink-dim hover:text-ink p-1.5 transition hover:bg-white/5"
          aria-label="Close thread"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      {/* body */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        {/* unified, time-ordered timeline: steers + agent replies + tool calls */}
        <ThreadFeed timeline={timeline} agents={agents} />
      </div>

      {/* thread composer */}
      <div className="border-t border-white/[0.06] pt-3">
        <Composer
          agents={agents}
          humans={humans}
          typingNames={typingNames}
          connected={connected}
          variant="thread"
          onSend={(body, mentions) => steer(body, mentions)}
          onTyping={onTyping}
          onStopTyping={onStopTyping}
          onVoiceChange={onVoiceChange}
        />
      </div>
    </aside>
  );
};
