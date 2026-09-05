"use client";

import { useState } from "react";

import { prettifyJson } from "@/lib/prettify";
import type {
  Agent,
  ChatMessage,
  ThreadTimelineItem,
  ToolCallInfo,
} from "@/lib/room-types";
import { fullText } from "@/lib/room-types";

import { ChevronDownIcon, SparkleIcon } from "../icons";
import { Avatar } from "./avatar";
import { MentionText } from "./mention-text";
import { PrettyBody } from "./pretty-body";
import { SpeakButton } from "./speak-button";

const agentById = (agents: Agent[], id: bigint | null): Agent | undefined => {
  if (id === null) {
    return undefined;
  }
  return agents.find((a) => a.agentId === id);
};

const TOOL_STYLE: Record<number, string> = {
  0: "bg-white/5 text-ink-dim ring-white/10",
  1: "bg-blurple-soft text-[#aab4ff] ring-blurple/40",
  2: "bg-mint/10 text-mint ring-mint/25",
  3: "bg-rose/10 text-[#ff8a8d] ring-rose/30",
};
const TOOL_LABEL = ["pending", "running", "done", "failed"] as const;

const PrettyPayload = ({ label, raw }: { label: string; raw: string }) => {
  const pretty = prettifyJson(raw) ?? raw;
  return (
    <div className="border border-white/[0.06] bg-black/40">
      <div className="text-ink-ghost border-b border-white/[0.05] px-2.5 py-1 font-mono text-[9.5px] tracking-wider uppercase">
        {label}
      </div>
      <pre className="overflow-x-auto px-2.5 py-2 font-mono text-[11px] leading-relaxed whitespace-pre text-[#c8cdd6]">
        {pretty}
      </pre>
    </div>
  );
};

const UserMessage = ({
  msg,
  agents,
}: {
  msg: ChatMessage;
  agents: Agent[];
}) => (
  <div className="flex gap-2.5">
    <Avatar name={msg.authorName} color={msg.authorColor} size={28} />
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline gap-2">
        <span className="text-[13px] font-semibold text-white">
          {msg.authorName}
        </span>
        <span className="text-ink-ghost font-mono text-[10px]">
          {msg.createdAt}
        </span>
        {msg.body.trim().length > 0 && (
          <SpeakButton
            id={`steer:${String(msg.messageId)}`}
            text={msg.body}
            className="ml-auto"
          />
        )}
      </div>
      <p className="text-ink/90 mt-1 text-[13.5px] leading-relaxed whitespace-pre-wrap">
        <MentionText body={msg.body} agents={agents} />
      </p>
    </div>
  </div>
);

const ReplyLabel = ({ isFinal, role }: { isFinal: boolean; role: number }) => {
  if (isFinal) {
    return (
      <span className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-[#aab4ff] uppercase">
        Final answer
      </span>
    );
  }
  return (
    <span className="text-ink-faint font-mono text-[9.5px] font-bold tracking-[0.14em] uppercase">
      {role === 2 ? "Synthesis" : "Reply"}
    </span>
  );
};

const AgentReply = ({
  msg,
  agent,
  isFinal,
}: {
  msg: ChatMessage;
  agent: Agent | undefined;
  isFinal: boolean;
}) => {
  const text = fullText(msg);
  const color = agent?.color ?? msg.authorColor;
  const thinking = msg.streaming
    ? (msg.ticks?.find((t) => t.kind === "thinking")?.payload ?? "Thinking…")
    : null;

  return (
    <div
      className={`overflow-hidden border shadow-sm ${
        isFinal
          ? "border-blurple/30 bg-blurple/[0.07]"
          : "bg-panel border-white/[0.08]"
      }`}
    >
      <div
        className={`flex items-center gap-2 border-b px-3 py-1.5 ${
          isFinal ? "border-blurple/20" : "border-white/[0.05]"
        }`}
      >
        {isFinal && <SparkleIcon className="h-3 w-3 text-[#8b9bff]" />}
        <ReplyLabel isFinal={isFinal} role={msg.role} />
        <span className="text-ink-ghost font-mono text-[10px]">
          {msg.createdAt}
        </span>
        {!msg.streaming && text.trim().length > 0 && (
          <SpeakButton
            id={`reply:${String(msg.messageId)}`}
            text={text}
            className="ml-auto"
          />
        )}
      </div>
      <div className="flex gap-2.5 px-3 py-2.5">
        <Avatar
          name={msg.authorName}
          color={color}
          size={28}
          bot
          icon={agent?.icon}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[13px] font-semibold" style={{ color }}>
              {msg.authorName}
            </span>
            {agent && (
              <span className="text-ink-ghost font-mono text-[10px]">
                @{agent.handle}
              </span>
            )}
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

/** A single tool-call step, individually collapsible. */
const ToolCallItem = ({
  tool,
  agent,
}: {
  tool: ToolCallInfo;
  agent: Agent | undefined;
}) => {
  const [open, setOpen] = useState(false);
  const color = agent?.color ?? "#5865f2";

  return (
    <div className="bg-panel overflow-hidden border border-white/[0.08]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left transition hover:bg-white/[0.03]"
        aria-expanded={open}
      >
        <Avatar
          name={agent?.name ?? tool.tool}
          color={color}
          size={20}
          bot
          icon={agent?.icon}
        />
        <span className="min-w-0 flex-1">
          <span
            className={`inline-flex items-center px-1.5 py-0.5 font-mono text-[9.5px] font-semibold ring-1 ${
              TOOL_STYLE[tool.status] ?? TOOL_STYLE[0]
            }`}
          >
            {tool.status === 1 && (
              <span className="mr-1 inline-block h-1 w-1 animate-pulse bg-current" />
            )}
            {tool.tool} · {TOOL_LABEL[tool.status] ?? "pending"}
          </span>
          {agent && (
            <span className="text-ink-ghost ml-2 font-mono text-[10px]">
              @{agent.handle}
            </span>
          )}
        </span>
        <ChevronDownIcon
          className={`text-ink-ghost h-3 w-3 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="space-y-1.5 border-t border-white/[0.06] px-2.5 py-2">
          {tool.input ? <PrettyPayload label="input" raw={tool.input} /> : null}
          {tool.output ? (
            <PrettyPayload label="findings" raw={tool.output} />
          ) : null}
          {!tool.input && !tool.output && (
            <p className="text-ink-ghost text-[11px] italic">No details.</p>
          )}
        </div>
      )}
    </div>
  );
};

/** One timeline entry rendered as either a message or a tool-call step. */
const TimelineEntry = ({
  item,
  agents,
  lastAgentId,
}: {
  item: ThreadTimelineItem;
  agents: Agent[];
  lastAgentId: bigint | null;
}) => {
  if (item.kind === "tool") {
    return <ToolCallItem tool={item.tool} agent={item.agent} />;
  }
  const { msg } = item;
  if (msg.role === 0) {
    return <UserMessage msg={msg} agents={agents} />;
  }
  const agent = agentById(agents, msg.authorAgent);
  const isFinal = !msg.streaming && msg.messageId === lastAgentId;
  return <AgentReply msg={msg} agent={agent} isFinal={isFinal} />;
};

/**
 * The thread as one unified, time-ordered timeline. Steers, agent replies,
 * and tool-call progress all appear in the order they happened, and every
 * tool call is individually collapsible.
 */
export const ThreadFeed = ({
  timeline,
  agents,
}: {
  timeline: ThreadTimelineItem[];
  agents: Agent[];
}) => {
  // The latest agent message (has text or streaming) is the "final answer".
  const lastAgentId = (() => {
    for (const item of timeline.toReversed()) {
      if (
        item.kind === "message" &&
        item.msg.authorAgent !== null &&
        (item.msg.streaming || fullText(item.msg).trim().length > 0)
      ) {
        return item.msg.messageId;
      }
    }
    return null;
  })();

  return (
    <div className="space-y-3">
      {timeline.map((item, i) => (
        <TimelineEntry
          key={
            item.kind === "message"
              ? `m:${String(item.msg.messageId)}`
              : `t:${String(item.tool.callId ?? i)}`
          }
          item={item}
          agents={agents}
          lastAgentId={lastAgentId}
        />
      ))}
    </div>
  );
};
