"use client";

import { useState } from "react";

import type { Agent, RoomHuman } from "@/lib/room-types";

import { ChevronDownIcon, MicIcon } from "../icons";
import { Avatar } from "./avatar";

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="mb-4">
    <h3 className="text-ink-faint px-2 pt-1 pb-1.5 font-mono text-[10px] font-bold tracking-[0.14em] uppercase">
      {title}
    </h3>
    <div className="flex flex-col gap-[1px]">{children}</div>
  </section>
);

const presenceDot = (presence: string): string => {
  if (presence === "working") {
    return "bg-gold animate-pulse";
  }
  if (presence === "active") {
    return "bg-mint";
  }
  return "bg-ink-ghost";
};

const AgentCard = ({ agent }: { agent: Agent }) => {
  const Icon = agent.icon;
  return (
    <div className="group flex cursor-pointer items-start gap-2.5 px-2 py-2 transition hover:bg-white/[0.05]">
      <span className="relative shrink-0">
        <span
          className="grid h-9 w-9 place-items-center text-white ring-1 ring-white/10 transition group-hover:ring-white/20"
          style={{ background: agent.color }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span
          className={`border-panel absolute -right-0.5 -bottom-0.5 h-3 w-3 border-[2.5px] ${presenceDot(agent.presence)}`}
        />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="flex items-center gap-1.5">
          <span className="text-ink truncate text-[13px] font-bold">
            {agent.name}
          </span>
        </span>
        <span className="block truncate font-mono text-[10px] text-[#8b9bff]">
          @{agent.handle}
        </span>
        <span className="mt-1 flex flex-wrap gap-1">
          {(agent.currentTool
            ? [
                agent.currentTool,
                ...agent.tools
                  .filter((t) => t !== agent.currentTool)
                  .slice(0, 1),
              ]
            : agent.tools.slice(0, 2)
          ).map((t) => (
            <span
              key={t}
              className={`px-1.5 py-px font-mono text-[10px] ring-1 ${
                t === agent.currentTool
                  ? "bg-gold/10 text-gold ring-gold/30"
                  : "text-ink-faint bg-white/5 ring-white/10"
              }`}
            >
              {t === agent.currentTool ? `◉ ${t}` : t}
            </span>
          ))}
        </span>
      </span>
    </div>
  );
};

export const MembersPanel = ({
  agents,
  humans,
}: {
  agents: Agent[];
  humans: RoomHuman[];
}) => {
  const online = humans.filter((h) => h.isOnline);
  const activeAgents = agents.filter((a) => a.presence === "working");
  const inactiveAgents = agents.filter((a) => a.presence !== "working");
  const [expanded, setExpanded] = useState(false);

  const allInactive = [...activeAgents, ...inactiveAgents];
  const collapsedCount = 5;
  const visibleInactive = expanded
    ? allInactive
    : allInactive.slice(0, collapsedCount);
  const hiddenCount = Math.max(0, allInactive.length - collapsedCount);
  const showToggle =
    allInactive.length > collapsedCount || activeAgents.length > 0;

  return (
    <aside
      className="bg-panel flex w-60 shrink-0 flex-col overflow-y-auto border-l border-white/[0.06] px-2 py-3"
      aria-label="Members and agents"
    >
      {activeAgents.length > 0 && (
        <Section title={`Active agents — ${activeAgents.length}`}>
          {activeAgents.map((a) => (
            <AgentCard key={String(a.agentId)} agent={a} />
          ))}
        </Section>
      )}

      {inactiveAgents.length > 0 && (
        <Section title={`Agents — ${inactiveAgents.length}`}>
          {visibleInactive.map((a) => (
            <AgentCard key={String(a.agentId)} agent={a} />
          ))}
          {showToggle && hiddenCount > 0 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-left font-mono text-[10px] font-semibold text-[#8b9bff] transition hover:bg-white/[0.05]"
              aria-expanded={expanded}
            >
              <ChevronDownIcon
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  expanded ? "rotate-180" : ""
                }`}
              />
              {expanded ? "Show less" : `Show more — ${hiddenCount} more`}
            </button>
          )}
        </Section>
      )}

      <Section title={`Members — ${online.length} online`}>
        {online.map((h) => {
          const isTyping = h.isTyping && h.roleLabel !== "you";
          const isSpeaking = h.isSpeaking && h.roleLabel !== "you";
          let statusLabel = h.roleLabel ?? "member";
          if (isTyping) {
            statusLabel = "typing…";
          } else if (isSpeaking) {
            statusLabel = "speaking…";
          }
          return (
            <div
              key={h.hex}
              className="flex cursor-pointer items-center gap-2.5 px-2 py-1.5 transition hover:bg-white/[0.05]"
            >
              <Avatar name={h.displayName} color={h.color} size={32} online />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="text-ink block truncate text-[13px] font-semibold">
                  {h.displayName}
                </span>
                <span
                  className={`block truncate text-[11px] ${isTyping || isSpeaking ? "font-semibold text-white" : "text-ink-faint"}`}
                >
                  {statusLabel}
                </span>
              </span>
              {isTyping && (
                <span className="flex shrink-0 gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="animate-typing bg-ink-faint h-1 w-1"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </span>
              )}
              {isSpeaking && (
                <span className="text-rose h-3 w-3 shrink-0 animate-pulse">
                  <MicIcon className="h-3 w-3" />
                </span>
              )}
            </div>
          );
        })}
      </Section>
    </aside>
  );
};
