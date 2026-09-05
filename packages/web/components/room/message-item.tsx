"use client";

import type { Agent, ChatMessage } from "@/lib/room-types";
import { fullText } from "@/lib/room-types";

import { SparkleIcon } from "../icons";
import { Avatar } from "./avatar";

const TOOL_STYLE: Record<number, string> = {
  0: "bg-white/5 text-ink-dim ring-white/10",
  1: "bg-blurple-soft text-[#aab4ff] ring-blurple/40",
  2: "bg-mint/10 text-mint ring-mint/25",
  3: "bg-rose/10 text-[#ff8a8d] ring-rose/30",
};
const TOOL_LABEL = ["pending", "running", "done", "failed"] as const;

const StreamingTail = () => (
  <span
    className="ml-2 inline-flex translate-y-[3px] items-center gap-1"
    aria-label="Streaming"
  >
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="animate-typing bg-ink-faint h-1.5 w-1.5 rounded-full"
        style={{ animationDelay: `${i * 0.18}s` }}
      />
    ))}
  </span>
);

const renderBody = (body: string, agents: Agent[]) => {
  // highlight @handles; mocks store mentions separately but body keeps @text
  const parts = body.split(/(?<mention>@[\w-]+)/u);
  return parts.map((p, i) => {
    if (!p.startsWith("@")) {
      return <span key={i}>{p}</span>;
    }
    const handle = p.slice(1);
    const known = agents.some((a) => a.handle === handle);
    return (
      <span
        key={i}
        className={`rounded px-1 py-px font-semibold ${
          known
            ? "bg-blurple-soft ring-blurple/30 hover:bg-blurple/30 text-[#c3cbff] ring-1"
            : "text-ink bg-white/10"
        }`}
      >
        {p}
      </span>
    );
  });
};

export const MessageItem = ({
  msg,
  agents,
  compact,
}: {
  msg: ChatMessage;
  agents: Agent[];
  compact: boolean;
}) => {
  if (msg.role === 3) {
    return (
      <div className="flex items-center gap-3 px-4 py-1.5">
        <span className="h-px flex-1 bg-white/[0.07]" />
        <span className="text-ink-ghost max-w-full truncate font-mono text-[11px]">
          {msg.body}
        </span>
        <span className="h-px flex-1 bg-white/[0.07]" />
      </div>
    );
  }

  const text = fullText(msg);
  const isAgent = msg.authorAgent !== null;
  const isSynthesis = msg.role === 2;

  if (isSynthesis) {
    return (
      <div className="msg-row px-4 py-2">
        <div className="border-gold/25 from-gold/[0.08] overflow-hidden rounded-xl border bg-gradient-to-br to-transparent">
          <div className="border-gold/15 flex items-center gap-2 border-b px-4 py-2">
            <SparkleIcon className="text-gold h-4 w-4" />
            <span className="text-gold font-mono text-[11px] font-bold tracking-[0.12em] uppercase">
              Synthesized answer
            </span>
            <span className="text-ink-ghost ml-auto font-mono text-[11px]">
              {msg.createdAt}
            </span>
          </div>
          <div className="flex gap-3 px-4 py-3">
            <Avatar
              name={msg.authorName}
              color={msg.authorColor}
              size={36}
              bot
            />
            <div className="min-w-0">
              <p className="text-ink text-[14px] leading-relaxed">
                {renderBody(text, agents)}
              </p>
              <p className="text-ink-faint mt-1.5 text-[12px]">
                Pinned as the room answer · from 2 merged threads
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="msg-row group px-4 py-[3px] pl-[68px]">
        <p className="text-ink/90 text-[14px] leading-relaxed break-words">
          {renderBody(text, agents)}
          {msg.streaming && <StreamingTail />}
        </p>
      </div>
    );
  }

  return (
    <div className="msg-row group animate-rise flex gap-3 px-4 pt-4 pb-1">
      <div className="pt-0.5">
        <Avatar
          name={msg.authorName}
          color={msg.authorColor}
          size={40}
          bot={isAgent}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span
            className="cursor-pointer text-[14px] font-semibold hover:underline"
            style={{ color: isAgent ? msg.authorColor : "#fff" }}
          >
            {msg.authorName}
          </span>
          {isAgent && (
            <span className="bg-blurple rounded px-1.5 py-px text-[10px] font-extrabold tracking-wide text-white">
              BOT
            </span>
          )}
          {msg.toolCall && (
            <span
              className={`rounded-full px-2 py-px font-mono text-[10px] font-semibold ring-1 ${TOOL_STYLE[msg.toolCall.status] ?? TOOL_STYLE[0]}`}
            >
              {msg.toolCall.status === 1 && (
                <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
              )}
              {msg.toolCall.tool} ·{" "}
              {TOOL_LABEL[msg.toolCall.status] ?? "pending"}
            </span>
          )}
          <span className="text-ink-ghost font-mono text-[11px]">
            {msg.createdAt}
          </span>
        </div>

        {msg.ticks?.some((t) => t.kind === "thinking") && msg.streaming && (
          <p className="text-ink-faint mt-0.5 flex items-center gap-1.5 text-[12px] italic">
            <SparkleIcon className="h-3 w-3 text-[#8b9bff]" />
            {msg.ticks.find((t) => t.kind === "thinking")?.payload ??
              "Thinking…"}
          </p>
        )}

        <p className="text-ink/90 mt-0.5 text-[14px] leading-relaxed break-words whitespace-pre-wrap">
          {renderBody(text, agents)}
          {msg.streaming && <StreamingTail />}
        </p>

        {msg.streaming && (
          <div
            className="stream-shimmer mt-2 h-[3px] w-48 rounded-full"
            aria-hidden
          />
        )}
      </div>
    </div>
  );
};
