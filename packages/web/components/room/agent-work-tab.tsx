"use client";

import type { AgentWork } from "@/lib/room-types";
import { fullText } from "@/lib/room-types";

import { ChevronDownIcon, SparkleIcon } from "../icons";
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

export const AgentWorkTab = ({
  work,
  expanded,
  onToggle,
}: {
  work: AgentWork;
  expanded: boolean;
  onToggle: () => void;
}) => {
  const { agent, messages, status, preview } = work;
  const isStreaming = messages.some((m) => m.streaming);

  const statusBadge = () => {
    switch (status) {
      case "working": {
        return (
          <span className="bg-blurple-soft ring-blurple/40 flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold text-[#aab4ff] ring-1">
            <span className="bg-blurple animate-pulse-dot h-1.5 w-1.5 rounded-full" />
            working…
          </span>
        );
      }
      case "done": {
        return (
          <span className="bg-mint/10 text-mint ring-mint/25 flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ring-1">
            <span className="bg-mint h-1.5 w-1.5 rounded-full" />✓ done
          </span>
        );
      }
      case "failed": {
        return (
          <span className="bg-rose/10 ring-rose/30 flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold text-[#ff8a8d] ring-1">
            <span className="bg-rose h-1.5 w-1.5 rounded-full" />
            failed
          </span>
        );
      }
      default: {
        return (
          <span className="text-ink-ghost flex items-center gap-1.5 rounded-full bg-white/5 px-2 py-0.5 font-mono text-[10px] font-semibold ring-1 ring-white/10">
            <span className="bg-ink-ghost h-1.5 w-1.5 rounded-full" />
            idle
          </span>
        );
      }
    }
  };

  return (
    <div className="bg-panel overflow-hidden rounded-xl border border-white/[0.08] transition-all">
      {/* accordion tab header */}
      <button
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-3 p-3 text-left transition hover:bg-white/[0.03]"
        aria-expanded={expanded}
      >
        <Avatar name={agent.name} color="#5865f2" size={32} bot />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13.5px] font-semibold text-white">
              {agent.name}
            </span>
            <span className="text-ink-ghost font-mono text-[11px]">
              @{agent.handle}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {statusBadge()}
          <ChevronDownIcon
            className={`text-ink-ghost h-4 w-4 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* collapsed preview */}
      {!expanded && (
        <div className="border-t border-white/[0.04] px-3.5 py-2">
          <p className="text-ink-dim line-clamp-2 text-[12.5px] leading-relaxed">
            {preview || "No activity yet."}
          </p>
          {isStreaming && (
            <div
              className="stream-shimmer mt-2 h-[2px] w-32 rounded-full"
              aria-hidden
            />
          )}
        </div>
      )}

      {/* expanded work stream */}
      {expanded && (
        <div className="border-t border-white/[0.06] bg-black/30 p-3.5">
          <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <p className="text-ink-ghost py-2 text-[13px] italic">
                {status === "working"
                  ? "Agent is spinning up and processing prompt…"
                  : "No messages from this agent in this thread yet."}
              </p>
            ) : (
              messages.map((m) => {
                const text = fullText(m);
                return (
                  <div key={String(m.messageId)} className="space-y-1.5">
                    {/* tool call status if any */}
                    {m.toolCall && (
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ring-1 ${
                            TOOL_STYLE[m.toolCall.status] ?? TOOL_STYLE[0]
                          }`}
                        >
                          {m.toolCall.status === 1 && (
                            <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                          )}
                          {m.toolCall.tool} ·{" "}
                          {TOOL_LABEL[m.toolCall.status] ?? "pending"}
                        </span>
                      </div>
                    )}

                    {/* thinking / stream ticks */}
                    {m.ticks?.some((t) => t.kind === "thinking") &&
                      m.streaming && (
                        <p className="text-ink-faint flex items-center gap-1.5 text-[11.5px] italic">
                          <SparkleIcon className="h-3 w-3 text-[#8b9bff]" />
                          {m.ticks.find((t) => t.kind === "thinking")
                            ?.payload ?? "Thinking…"}
                        </p>
                      )}

                    {/* body */}
                    <div className="text-ink/90 text-[13.5px] leading-relaxed whitespace-pre-wrap">
                      {text}
                      {m.streaming && <StreamingTail />}
                    </div>

                    {m.streaming && (
                      <div
                        className="stream-shimmer h-[2px] w-36 rounded-full"
                        aria-hidden
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
