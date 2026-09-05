"use client";

import type { Agent, RoomHuman } from "@/lib/room-types";

import { BotIcon } from "../icons";
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

const AgentCard = ({ agent }: { agent: Agent }) => (
  <div
    className="group flex cursor-pointer items-start gap-2.5 px-2 py-2 transition hover:bg-white/[0.05]"
    title={agent.systemPrompt}
  >
    <span className="relative shrink-0">
      <span className="text-ink-dim group-hover:text-ink grid h-9 w-9 place-items-center bg-[#26292f] ring-1 ring-white/10 transition group-hover:ring-white/20">
        <BotIcon className="h-4 w-4" />
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
      <span className="text-ink-faint mt-0.5 block truncate text-[11px]">
        {agent.blurb}
      </span>
      <span className="mt-1 flex flex-wrap gap-1">
        {(agent.currentTool
          ? [
              agent.currentTool,
              ...agent.tools.filter((t) => t !== agent.currentTool).slice(0, 1),
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
        <Section title={`Inactive agents — ${inactiveAgents.length}`}>
          {inactiveAgents.map((a) => (
            <AgentCard key={String(a.agentId)} agent={a} />
          ))}
        </Section>
      )}

      <Section title={`Members — ${online.length} online`}>
        {online.map((h) => {
          const isTyping = h.isTyping && h.roleLabel !== "you";
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
                  className={`block truncate text-[11px] ${isTyping ? "font-semibold text-white" : "text-ink-faint"}`}
                >
                  {isTyping ? "typing…" : (h.roleLabel ?? "member")}
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
            </div>
          );
        })}
      </Section>
    </aside>
  );
};
