"use client";

import type { Agent, ChatMessage } from "@/lib/room-types";
import { fullText } from "@/lib/room-types";

import { DbIcon, SparkleIcon } from "../icons";
import { Avatar } from "./avatar";
import { SpeakButton } from "./speak-button";

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
        className="animate-typing bg-ink-faint h-1.5 w-1.5"
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
        className={`px-1 py-px font-semibold ${
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

export interface ThreadFooterInfo {
  replyCount: number;
  lastAgentName?: string;
  streaming?: boolean;
  onOpen: () => void;
}

const SystemMessage = ({ body }: { body: string }) => (
  <div className="flex items-center gap-3 px-4 py-1.5">
    <span className="h-px flex-1 bg-white/[0.07]" />
    <span className="text-ink-ghost max-w-full truncate font-mono text-[11px]">
      {body}
    </span>
    <span className="h-px flex-1 bg-white/[0.07]" />
  </div>
);

const MaybeSpeak = ({
  className,
  id,
  streaming = false,
  text,
}: {
  className?: string;
  id: string;
  streaming?: boolean;
  text: string;
}) => {
  if (streaming || text.trim().length === 0) {
    return null;
  }
  return <SpeakButton id={id} text={text} className={className} />;
};

const SynthesisMessage = ({
  msg,
  text,
  agents,
}: {
  msg: ChatMessage;
  text: string;
  agents: Agent[];
}) => (
  <div className="msg-row px-4 py-2">
    <div className="border-gold/25 bg-gold/[0.08] overflow-hidden border">
      <div className="border-gold/15 flex items-center gap-2 border-b px-4 py-2">
        <SparkleIcon className="text-gold h-4 w-4" />
        <span className="text-gold font-mono text-[11px] font-bold tracking-[0.12em] uppercase">
          Synthesized answer
        </span>
        <span className="text-ink-ghost font-mono text-[11px]">
          {msg.createdAt}
        </span>
        <MaybeSpeak id={`synth:${String(msg.messageId)}`} text={text} />
      </div>
      <div className="flex gap-3 px-4 py-3">
        <Avatar name={msg.authorName} color={msg.authorColor} size={36} bot />
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

const MemoryIndicator = ({ msg }: { msg: ChatMessage }) => {
  if (!msg.ticks?.some((t) => t.kind === "memory_used")) {
    return null;
  }
  return (
    <span className="text-blurple mt-1 inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-wide">
      <DbIcon className="h-3 w-3" />
      {msg.ticks.find((t) => t.kind === "memory_used")?.payload ??
        "Used room memory"}
    </span>
  );
};

const ThreadFooterButton = ({ info }: { info: ThreadFooterInfo }) => (
  <div className="mt-2.5">
    <button
      onClick={(e) => {
        e.stopPropagation();
        info.onOpen();
      }}
      className="text-ink-dim inline-flex items-center gap-2 bg-white/[0.04] px-2.5 py-1.5 text-[12px] font-medium ring-1 ring-white/[0.08] transition hover:bg-white/[0.08] hover:text-white"
      aria-label={`View thread with ${info.replyCount} replies`}
    >
      <span className="text-blurple text-[13px]">💬</span>
      <span className="font-semibold text-white">
        {info.replyCount > 0
          ? `${info.replyCount} ${info.replyCount === 1 ? "reply" : "replies"}`
          : "View thread"}
      </span>
      {info.lastAgentName && (
        <span className="text-ink-faint hidden sm:inline">
          · last from{" "}
          <strong className="text-ink-dim">{info.lastAgentName}</strong>
        </span>
      )}
      {info.streaming && (
        <span className="flex items-center gap-1 font-mono text-[11px] font-semibold text-[#8b9bff]">
          <span className="animate-pulse-dot bg-blurple h-1.5 w-1.5" />
          streaming
        </span>
      )}
    </button>
  </div>
);

export const MessageItem = ({
  msg,
  agents,
  compact,
  threadFooter,
}: {
  msg: ChatMessage;
  agents: Agent[];
  compact: boolean;
  threadFooter?: ThreadFooterInfo;
}) => {
  if (msg.role === 3) {
    return <SystemMessage body={msg.body} />;
  }

  const text = fullText(msg);
  const isAgent = msg.authorAgent !== null;

  if (msg.role === 2) {
    return <SynthesisMessage msg={msg} text={text} agents={agents} />;
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
            <span className="bg-blurple px-1.5 py-px text-[10px] font-extrabold tracking-wide text-white">
              BOT
            </span>
          )}
          {msg.toolCall && (
            <span
              className={`px-2 py-px font-mono text-[10px] font-semibold ring-1 ${TOOL_STYLE[msg.toolCall.status] ?? TOOL_STYLE[0]}`}
            >
              {msg.toolCall.status === 1 && (
                <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse bg-current" />
              )}
              {msg.toolCall.tool} ·{" "}
              {TOOL_LABEL[msg.toolCall.status] ?? "pending"}
            </span>
          )}
          <span className="text-ink-ghost font-mono text-[11px]">
            {msg.createdAt}
          </span>
          <MaybeSpeak
            id={`msg:${String(msg.messageId)}`}
            text={text}
            streaming={msg.streaming}
            className="ml-auto"
          />
        </div>

        {msg.ticks?.some((t) => t.kind === "thinking") && msg.streaming && (
          <p className="text-ink-faint mt-0.5 flex items-center gap-1.5 text-[12px] italic">
            <SparkleIcon className="h-3 w-3 text-[#8b9bff]" />
            {msg.ticks.find((t) => t.kind === "thinking")?.payload ??
              "Thinking…"}
          </p>
        )}

        <MemoryIndicator msg={msg} />

        <p className="text-ink/90 mt-0.5 text-[14px] leading-relaxed break-words whitespace-pre-wrap">
          {renderBody(text, agents)}
          {msg.streaming && <StreamingTail />}
        </p>

        {msg.streaming && (
          <div className="stream-shimmer mt-2 h-[3px] w-48" aria-hidden />
        )}

        {threadFooter && <ThreadFooterButton info={threadFooter} />}
      </div>
    </div>
  );
};
