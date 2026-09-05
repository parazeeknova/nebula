"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import type { Agent, RoomHuman } from "@/lib/room-types";

import { ChevronDownIcon, PlusIcon, SendIcon, SparkleIcon } from "../icons";
import { Avatar } from "./avatar";
import { MicButton } from "./mic-button";

interface Props {
  agents: Agent[];
  humans: RoomHuman[];
  typingNames: string[];
  connected: boolean;
  variant?: "room" | "thread";
  onSend: (body: string, mentions: bigint[], model?: string) => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
}

interface ModelOption {
  id: string;
  label: string;
}

const DEFAULT_MODEL = "gpt-oss-120b";

const ModelDropdown = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (model: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/models");
        if (!res.ok) {
          throw new Error(`models request failed (${res.status})`);
        }
        const data = (await res.json()) as { models?: string[] };
        if (cancelled) {
          return;
        }
        const ids = Array.isArray(data.models) ? data.models : [];
        const seen = new Set<string>();
        const opts: ModelOption[] = [];
        for (const id of ids) {
          if (typeof id !== "string" || seen.has(id)) {
            continue;
          }
          seen.add(id);
          opts.push({ id, label: id });
        }
        setModels(opts);
        const [first] = opts;
        if (
          opts.length > 0 &&
          first !== undefined &&
          !opts.some((o) => o.id === value)
        ) {
          onChange(first.id);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "failed to load models"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only load on mount
  }, []);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent): void => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  let body: ReactNode;
  if (loading) {
    body = (
      <li className="text-ink-faint px-2 py-2 text-[12px]">Loading models…</li>
    );
  } else if (error) {
    body = <li className="px-2 py-2 text-[12px] text-[#ff8a8d]">{error}</li>;
  } else if (models.length === 0) {
    body = (
      <li className="text-ink-faint px-2 py-2 text-[12px]">
        No models available
      </li>
    );
  } else {
    body = models.map((m) => (
      <li key={m.id}>
        <button
          type="button"
          role="option"
          aria-selected={m.id === value}
          onClick={() => {
            onChange(m.id);
            setOpen(false);
          }}
          className={`flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left transition ${
            m.id === value
              ? "bg-blurple/15 text-ink"
              : "text-ink-dim hover:bg-white/[0.06]"
          }`}
        >
          <span className="truncate font-mono text-[12px]">{m.label}</span>
          {m.id === value && (
            <span className="bg-blurple h-1.5 w-1.5 shrink-0" />
          )}
        </button>
      </li>
    ));
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="text-ink-dim hover:text-ink inline-flex max-w-[200px] items-center gap-1.5 bg-white/[0.04] px-2 py-1 font-mono text-[11px] font-medium ring-1 ring-white/[0.08] transition hover:bg-white/[0.08]"
        title="Model for this message"
      >
        <SparkleIcon className="h-3 w-3 shrink-0 text-[#8b9bff]" />
        <span className="truncate">{value || DEFAULT_MODEL}</span>
        <ChevronDownIcon className="h-3 w-3 shrink-0" />
      </button>

      {open && (
        <div className="bg-panel-2 shadow-pop absolute bottom-full left-0 z-30 mb-2 w-64 overflow-hidden border border-white/10">
          <p className="text-ink-faint border-b border-white/[0.06] px-3 py-2 font-mono text-[10px] font-bold tracking-[0.12em] uppercase">
            Model
          </p>
          <ul
            role="listbox"
            aria-label="Select model"
            className="max-h-60 overflow-y-auto p-1.5"
          >
            {body}
          </ul>
        </div>
      )}
    </div>
  );
};

export const Composer = ({
  agents,
  humans,
  typingNames,
  connected,
  variant = "room",
  onSend,
  onTyping,
  onStopTyping,
}: Props) => {
  const [value, setValue] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
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

  useEffect(
    () => () => {
      onStopTyping?.();
    },
    [onStopTyping]
  );

  const handleChange = (v: string) => {
    setValue(v);
    if (v.trim()) {
      onTyping?.();
    } else {
      onStopTyping?.();
    }
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

  const appendVoiceText = (text: string) => {
    const current = value.trim();
    handleChange(current.length > 0 ? `${current} ${text}` : text);
    taRef.current?.focus();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onStopTyping?.();
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
    onSend(body, mentions, model);
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
                className="animate-typing bg-ink-faint h-1 w-1"
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
          <div className="bg-panel-2 shadow-pop absolute inset-x-0 bottom-full z-20 mb-2 overflow-hidden border border-white/10">
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
                    className="hover:bg-blurple/15 flex w-full items-center gap-2.5 px-2 py-1.5 text-left transition"
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
                          <span className="bg-blurple px-1 py-px text-[9px] font-extrabold text-white">
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

        <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
          <ModelDropdown value={model} onChange={setModel} />
          <span className="text-ink-ghost truncate font-mono text-[10px]">
            {variant === "thread" ? "steer model" : "room model"}
          </span>
        </div>

        <form
          onSubmit={submit}
          className={`bg-input flex items-end gap-2 px-3 py-2.5 ring-1 transition ${
            mentionOpen
              ? "ring-blurple/60"
              : "focus-within:ring-blurple/50 ring-white/10"
          }`}
        >
          <button
            type="button"
            aria-label="Attach"
            className="text-ink-dim hover:text-ink mb-0.5 grid h-8 w-8 shrink-0 place-items-center bg-white/[0.06] transition hover:bg-white/10"
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
            placeholder={
              variant === "thread"
                ? "Steer agents in this thread — @mention to focus…"
                : "Message the room — @neb, @marketing, @researcher…"
            }
            disabled={!connected}
            aria-label={
              variant === "thread" ? "Steer thread agents" : "Message the room"
            }
            className="text-ink placeholder:text-ink-ghost max-h-[140px] min-h-[24px] w-full resize-none bg-transparent text-[14px] leading-relaxed outline-none disabled:opacity-50"
          />
          <MicButton connected={connected} onText={appendVoiceText} />
          <button
            type="submit"
            disabled={!value.trim() || !connected}
            aria-label={variant === "thread" ? "Send steer" : "Send message"}
            className={`mb-0.5 grid h-8 w-8 shrink-0 place-items-center transition-all ${
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
        {variant === "thread"
          ? "Enter to steer · Shift+Enter newline · @ mentions a specific agent"
          : "Enter to send · Shift+Enter newline · @ mentions an agent · answers stream for the whole room"}
      </p>
    </div>
  );
};
