"use client";

import { prettifyJson, segmentContent } from "@/lib/prettify";
import type { AgentWork } from "@/lib/room-types";
import { fullText } from "@/lib/room-types";

import { ChevronDownIcon, SparkleIcon } from "../icons";
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
    className="ml-1.5 inline-flex translate-y-[2px] items-center gap-0.5"
    aria-label="Streaming"
  >
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="animate-typing bg-ink-faint h-1 w-1"
        style={{ animationDelay: `${i * 0.18}s` }}
      />
    ))}
  </span>
);

const PrettyBody = ({
  text,
  streaming,
}: {
  text: string;
  streaming?: boolean;
}) => {
  const segments = segmentContent(text);
  return (
    <div className="space-y-2">
      {segments.map((seg, i) => {
        if (seg.kind === "code") {
          return (
            <pre
              key={i}
              className="overflow-x-auto border border-white/[0.08] bg-black/50 px-3 py-2.5 font-mono text-[11.5px] leading-relaxed text-[#c8cdd6]"
            >
              {seg.lang ? (
                <span className="text-ink-ghost mb-2 block text-[9.5px] tracking-wider uppercase">
                  {seg.lang}
                </span>
              ) : null}
              <code className="whitespace-pre">{seg.value}</code>
            </pre>
          );
        }
        return (
          <div
            key={i}
            className="text-ink/90 text-[12.5px] leading-relaxed whitespace-pre-wrap"
          >
            {seg.value}
            {streaming && i === segments.length - 1 ? <StreamingTail /> : null}
          </div>
        );
      })}
    </div>
  );
};

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
          <span className="text-ink-faint inline-flex items-baseline font-mono text-[10px]">
            working
            <span className="inline-flex w-[1.1em]" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="animate-typing inline-block"
                  style={{ animationDelay: `${i * 0.18}s` }}
                >
                  .
                </span>
              ))}
            </span>
          </span>
        );
      }
      case "done": {
        return (
          <span className="text-mint flex items-center gap-1 font-mono text-[10px]">
            <span aria-hidden>✓</span>
            done
          </span>
        );
      }
      case "failed": {
        return (
          <span className="font-mono text-[10px] text-[#ff8a8d]">failed</span>
        );
      }
      default: {
        return (
          <span className="text-ink-ghost font-mono text-[10px]">idle</span>
        );
      }
    }
  };

  return (
    <div className="bg-panel overflow-hidden border border-white/[0.08] transition-all">
      <button
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left transition hover:bg-white/[0.03]"
        aria-expanded={expanded}
      >
        <Avatar name={agent.name} color="#5865f2" size={24} bot />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-[12.5px] font-semibold text-white">
              {agent.name}
            </span>
            <span className="text-ink-ghost shrink-0 font-mono text-[10px]">
              @{agent.handle}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {statusBadge()}
          <ChevronDownIcon
            className={`text-ink-ghost h-3.5 w-3.5 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {!expanded && (
        <div className="border-t border-white/[0.04] px-3 py-1.5">
          <p className="text-ink-dim line-clamp-1 text-[11.5px] leading-relaxed">
            {preview || "No activity yet."}
          </p>
          {isStreaming && (
            <div className="stream-shimmer mt-1.5 h-[2px] w-24" aria-hidden />
          )}
        </div>
      )}

      {expanded && (
        <div className="border-t border-white/[0.06] bg-black/30 px-3 py-2.5">
          <div className="max-h-[40vh] space-y-2.5 overflow-y-auto pr-0.5">
            {messages.length === 0 ? (
              <p className="text-ink-ghost py-1.5 text-[12px] italic">
                {status === "working"
                  ? "Agent is spinning up and processing prompt…"
                  : "No messages from this agent in this thread yet."}
              </p>
            ) : (
              messages.map((m) => {
                const text = fullText(m);
                return (
                  <div key={String(m.messageId)} className="space-y-1.5">
                    {m.toolCall && (
                      <div className="space-y-1.5">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 font-mono text-[9.5px] font-semibold ring-1 ${
                            TOOL_STYLE[m.toolCall.status] ?? TOOL_STYLE[0]
                          }`}
                        >
                          {m.toolCall.status === 1 && (
                            <span className="mr-1 inline-block h-1 w-1 animate-pulse bg-current" />
                          )}
                          {m.toolCall.tool} ·{" "}
                          {TOOL_LABEL[m.toolCall.status] ?? "pending"}
                        </span>
                        {m.toolCall.input ? (
                          <PrettyPayload label="input" raw={m.toolCall.input} />
                        ) : null}
                        {m.toolCall.output ? (
                          <PrettyPayload
                            label="output"
                            raw={m.toolCall.output}
                          />
                        ) : null}
                      </div>
                    )}

                    {m.ticks?.some((t) => t.kind === "thinking") &&
                      m.streaming && (
                        <p className="text-ink-faint flex items-center gap-1 text-[11px] italic">
                          <SparkleIcon className="h-2.5 w-2.5 text-[#8b9bff]" />
                          {m.ticks.find((t) => t.kind === "thinking")
                            ?.payload ?? "Thinking…"}
                        </p>
                      )}

                    <PrettyBody text={text} streaming={m.streaming} />

                    {!m.streaming && text.trim().length > 0 && (
                      <div className="flex justify-end">
                        <SpeakButton
                          id={`agent-msg:${String(m.messageId)}`}
                          text={text}
                        />
                      </div>
                    )}

                    {m.streaming && (
                      <div
                        className="stream-shimmer h-[2px] w-28"
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
