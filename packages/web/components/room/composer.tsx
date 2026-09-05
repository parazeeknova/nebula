"use client";

import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";

import type { Agent, RoomHuman } from "@/lib/room-types";

import { PlusIcon, SendIcon } from "../icons";
import { Avatar } from "./avatar";

interface Props {
  agents: Agent[];
  humans: RoomHuman[];
  typingNames: string[];
  connected: boolean;
  onSend: (body: string, mentions: bigint[]) => void;
}

export const Composer = ({
  agents,
  humans,
  typingNames,
  connected,
  onSend,
}: Props) => {
  const [value, setValue] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  const candidates = useMemo(() => {
    const q = mentionQuery.toLowerCase();
    const agentHits = agents
      .filter(
        (a) =>
          a.handle.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
      )
      .map((a) => ({
        bot: true,
        color: "#5865f2",
        id: a.agentId,
        kind: "agent" as const,
        label: a.handle,
        sub: a.blurb,
      }));
    const humanHits = humans
      .filter((h) => h.displayName.toLowerCase().includes(q))
      .slice(0, 4)
      .map((h) => ({
        bot: false,
        color: h.color,
        id: null,
        kind: "human" as const,
        label: h.displayName,
        sub: h.roleLabel ?? "member",
      }));
    return [...agentHits, ...humanHits].slice(0, 7);
  }, [agents, humans, mentionQuery]);

  const handleChange = (v: string) => {
    setValue(v);
    const m = v.match(/@(?<handle>[\w-]*)$/u);
    if (m) {
      setMentionOpen(true);
      setMentionQuery(m.groups?.handle ?? "");
    } else {
      setMentionOpen(false);
    }
    const ta = taRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
    }
  };

  const insertMention = (label: string) => {
    const next = value.replace(/@[\w-]*$/u, `@${label} `);
    setValue(next);
    setMentionOpen(false);
    taRef.current?.focus();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = value.trim();
    if (!body || !connected) {
      return;
    }
    const mentionedHandles = new Set(
      [...body.matchAll(/@(?<handle>[\w-]+)/gu)].map((m) =>
        (m.groups?.handle ?? "").toLowerCase()
      )
    );
    const mentions = agents
      .filter((a) => mentionedHandles.has(a.handle.toLowerCase()))
      .map((a) => a.agentId);
    onSend(body, mentions);
    setValue("");
    setMentionOpen(false);
    if (taRef.current) {
      taRef.current.style.height = "auto";
    }
  };

  return (
    <div className="shrink-0 px-4 pb-4">
      {typingNames.length > 0 && (
        <p className="text-ink-faint mb-1.5 flex items-center gap-1.5 px-1 text-[12px] font-medium">
          <span className="inline-flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="animate-typing bg-ink-faint h-1 w-1 rounded-full"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </span>
          <span className="truncate">
            <strong className="text-ink-dim">{typingNames.join(", ")}</strong>{" "}
            {typingNames.length === 1 ? "is" : "are"} typing…
          </span>
        </p>
      )}

      <div className="relative">
        {mentionOpen && candidates.length > 0 && (
          <div className="bg-panel-2 shadow-pop absolute inset-x-0 bottom-full z-20 mb-2 overflow-hidden rounded-xl border border-white/10">
            <p className="text-ink-faint border-b border-white/[0.06] px-3 py-2 font-mono text-[10px] font-bold tracking-[0.12em] uppercase">
              Mention — agents first
            </p>
            <ul className="max-h-56 overflow-y-auto p-1.5">
              {candidates.map((c) => (
                <li key={`${c.kind}-${c.label}`}>
                  <button
                    onClick={() =>
                      insertMention(
                        c.kind === "agent"
                          ? c.label
                          : (c.label.split(" ")[0] ?? c.label)
                      )
                    }
                    className="hover:bg-blurple/15 flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition"
                  >
                    <Avatar
                      name={c.label}
                      color={c.color}
                      size={28}
                      bot={c.bot}
                    />
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="text-ink flex items-center gap-1.5 text-[13px] font-bold">
                        @{c.label}
                        {c.kind === "agent" && (
                          <span className="bg-blurple rounded px-1 py-px text-[9px] font-extrabold text-white">
                            BOT
                          </span>
                        )}
                      </span>
                      <span className="text-ink-faint block truncate text-[11px]">
                        {c.sub}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form
          onSubmit={submit}
          className={`bg-input flex items-end gap-2 rounded-xl px-3 py-2.5 ring-1 transition ${
            mentionOpen
              ? "ring-blurple/60"
              : "focus-within:ring-blurple/50 ring-white/10"
          }`}
        >
          <button
            type="button"
            aria-label="Attach"
            className="text-ink-dim hover:text-ink mb-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.06] transition hover:bg-white/10"
          >
            <PlusIcon />
          </button>
          <textarea
            ref={taRef}
            rows={1}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                (e.target as HTMLTextAreaElement).form?.requestSubmit();
              }
              if (e.key === "Escape") {
                setMentionOpen(false);
              }
            }}
            placeholder="Message the room — @neb, @marketing, @researcher…"
            disabled={!connected}
            aria-label="Message the room"
            className="text-ink placeholder:text-ink-ghost max-h-[140px] min-h-[24px] w-full resize-none bg-transparent text-[14px] leading-relaxed outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!value.trim() || !connected}
            aria-label="Send message"
            className={`mb-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full transition-all ${
              value.trim() && connected
                ? "bg-blurple hover:bg-blurple-deep text-white shadow-[0_4px_14px_rgba(88,101,242,0.55)]"
                : "text-ink-ghost bg-white/[0.06]"
            }`}
          >
            <SendIcon className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
      <p className="text-ink-ghost mt-1.5 hidden px-1 font-mono text-[10px] sm:block">
        Enter to send · Shift+Enter newline · @ mentions an agent · answers
        stream for the whole room
      </p>
    </div>
  );
};
