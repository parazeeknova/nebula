"use client";

import { useEffect, useState } from "react";
import { useSpacetimeDB } from "spacetimedb/react";

import { useSteerThread, useStreamTicks, useThreadDetails } from "@/lib/live";
import type { Agent, RoomHuman } from "@/lib/room-types";

import { ChevronLeftIcon, XIcon } from "../icons";
import { AgentWorkTab } from "./agent-work-tab";
import { Avatar } from "./avatar";
import { Composer } from "./composer";
import { SteeringNotice } from "./steering-notice";

export const ThreadPane = ({
  threadId,
  roomId,
  agents,
  humans,
  onClose,
}: {
  threadId: bigint;
  roomId: bigint;
  agents: Agent[];
  humans: RoomHuman[];
  onClose: () => void;
}) => {
  const { isActive: connected } = useSpacetimeDB();
  const ticks = useStreamTicks();
  const { thread, originMessage, steeringNotices, agentWork } =
    useThreadDetails(threadId, roomId, agents, ticks);
  const steer = useSteerThread(threadId);

  const [expandedAgentId, setExpandedAgentId] = useState<bigint | null>(null);

  // Auto-expand first working agent or first agent with work
  useEffect(() => {
    if (expandedAgentId === null && agentWork.length > 0) {
      const working = agentWork.find((w) => w.status === "working");
      const done = agentWork.find((w) => w.messages.length > 0);
      const target = working || done || agentWork[0];
      if (target) {
        setExpandedAgentId(target.agent.agentId);
      }
    }
  }, [agentWork, expandedAgentId]);

  const typingNames = humans
    .filter((h) => h.isTyping)
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
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {/* origin user prompt */}
        {originMessage && (
          <div className="bg-panel border border-white/[0.08] p-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <Avatar
                name={originMessage.authorName}
                color={originMessage.authorColor}
                size={28}
              />
              <span className="text-[13px] font-semibold text-white">
                {originMessage.authorName}
              </span>
              <span className="text-ink-ghost font-mono text-[10.5px]">
                {originMessage.createdAt}
              </span>
            </div>
            <p className="text-ink/90 mt-2 text-[13.5px] leading-relaxed whitespace-pre-wrap">
              {originMessage.body}
            </p>
          </div>
        )}

        {/* steering notices */}
        {steeringNotices.length > 0 && (
          <div className="space-y-2">
            {steeringNotices.map((notice) => (
              <SteeringNotice key={String(notice.messageId)} msg={notice} />
            ))}
          </div>
        )}

        {/* agent work tabs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-0.5 pb-0.5">
            <span className="text-ink-faint font-mono text-[9.5px] font-semibold tracking-[0.14em] uppercase">
              Agents — {agentWork.length}
            </span>
          </div>
          {agentWork.map((work) => (
            <AgentWorkTab
              key={String(work.agent.agentId)}
              work={work}
              expanded={expandedAgentId === work.agent.agentId}
              onToggle={() =>
                setExpandedAgentId((curr) =>
                  curr === work.agent.agentId ? null : work.agent.agentId
                )
              }
            />
          ))}
        </div>
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
        />
      </div>
    </aside>
  );
};
