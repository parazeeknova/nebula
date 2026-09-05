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
  onVoiceChange?: (recording: boolean) => void;
}

interface ModelOption {
  id: string;
  label: string;
  provider?: string;
}

const DEFAULT_MODEL = "openai::gpt-5.6-luna";

const formatRef = (ref: string): { label: string; provider?: string } => {
  const sep = ref.indexOf("::");
  if (sep !== -1) {
    return {
      label: ref.slice(sep + 2),
      provider: ref.slice(0, sep),
    };
  }
  return { label: ref };
};

const getModelOptionClassName = (
  isHighlighted: boolean,
  isSelected: boolean
): string => {
  if (isHighlighted) {
    return isSelected
      ? "bg-blurple/25 text-ink ring-1 ring-blurple/50"
      : "bg-white/[0.08] text-ink ring-1 ring-white/10";
  }
  return isSelected
    ? "bg-blurple/15 text-ink"
    : "text-ink-dim hover:bg-white/[0.06]";
};

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
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const openMenu = () => {
    setOpen(true);
    const idx = models.findIndex((m) => m.id === value);
    setHighlightedIndex(Math.max(idx, 0));
  };

  const closeMenu = (refocus = true) => {
    setOpen(false);
    if (refocus) {
      triggerRef.current?.focus();
    }
  };

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
          const { label, provider } = formatRef(id);
          opts.push({ id, label, provider });
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

  useEffect(() => {
    if (open && highlightedIndex >= 0) {
      optionRefs.current[highlightedIndex]?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [open, highlightedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (!open) {
      if (
        e.key === "ArrowDown" ||
        e.key === "ArrowUp" ||
        e.key === "Enter" ||
        e.key === " "
      ) {
        e.preventDefault();
        openMenu();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (models.length > 0) {
        setHighlightedIndex((i) => (i + 1) % models.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (models.length > 0) {
        setHighlightedIndex((i) => (i - 1 + models.length) % models.length);
      }
    } else if (e.key === "Home") {
      e.preventDefault();
      if (models.length > 0) {
        setHighlightedIndex(0);
      }
    } else if (e.key === "End") {
      e.preventDefault();
      if (models.length > 0) {
        setHighlightedIndex(models.length - 1);
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const selected = models[highlightedIndex];
      if (selected) {
        onChange(selected.id);
        closeMenu(true);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeMenu(true);
    } else if (e.key === "Tab") {
      closeMenu(false);
    }
  };

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
    body = models.map((m, idx) => (
      <li key={m.id} role="presentation">
        <button
          ref={(el) => {
            optionRefs.current[idx] = el;
          }}
          type="button"
          role="option"
          id={`model-opt-${m.id}`}
          tabIndex={-1}
          aria-selected={m.id === value}
          onMouseEnter={() => setHighlightedIndex(idx)}
          onClick={() => {
            onChange(m.id);
            closeMenu(true);
          }}
          className={`flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left transition ${getModelOptionClassName(
            idx === highlightedIndex,
            m.id === value
          )}`}
        >
          <span className="min-w-0 flex-1 truncate font-mono text-[12px]">
            {m.label}
          </span>
          {m.provider && (
            <span className="bg-blurple-soft shrink-0 px-1.5 py-px font-mono text-[9px] font-semibold text-[#8b9bff] uppercase">
              {m.provider}
            </span>
          )}
          {m.id === value && (
            <span className="bg-blurple h-1.5 w-1.5 shrink-0" />
          )}
        </button>
      </li>
    ));
  }

  return (
    <div ref={rootRef} className="relative" onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (open) {
            closeMenu(false);
          } else {
            openMenu();
          }
        }}
        id="model-dropdown-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? "model-dropdown-list" : undefined}
        aria-activedescendant={
          open && models[highlightedIndex]
            ? `model-opt-${models[highlightedIndex].id}`
            : undefined
        }
        className="text-ink-dim hover:text-ink inline-flex max-w-[200px] items-center gap-1.5 bg-white/[0.04] px-2 py-1 font-mono text-[11px] font-medium ring-1 ring-white/[0.08] transition hover:bg-white/[0.08]"
        title="Model for this message"
      >
        <SparkleIcon className="h-3 w-3 shrink-0 text-[#8b9bff]" />
        <span className="truncate">
          {formatRef(value || DEFAULT_MODEL).label}
        </span>
        <ChevronDownIcon className="h-3 w-3 shrink-0" />
      </button>

      {open && (
        <div className="bg-panel-2 shadow-pop absolute bottom-full left-0 z-30 mb-2 w-64 overflow-hidden border border-white/10">
          <p className="text-ink-faint border-b border-white/[0.06] px-3 py-2 font-mono text-[10px] font-bold tracking-[0.12em] uppercase">
            Model
          </p>
          <ul
            id="model-dropdown-list"
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
  onVoiceChange,
}: Props) => {
  const [value, setValue] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const mentionItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const candidates = useMemo(() => {
    const q = mentionQuery.toLowerCase();
    const agentHits = agents
      .filter(
        (a) =>
          a.handle.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
      )
      .map((a) => ({
        bot: true,
        color: a.color,
        icon: a.icon,
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
        icon: undefined,
        id: null,
        kind: "human" as const,
        label: h.displayName,
        sub: h.roleLabel ?? "member",
      }));
    return [...agentHits, ...humanHits].slice(0, 7);
  }, [agents, humans, mentionQuery]);

  useEffect(() => {
    setMentionIndex(0);
  }, [mentionQuery]);

  const activeMentionIndex =
    candidates.length > 0
      ? Math.max(0, Math.min(mentionIndex, candidates.length - 1))
      : 0;

  useEffect(() => {
    if (mentionOpen && candidates.length > 0) {
      mentionItemRefs.current[activeMentionIndex]?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [mentionOpen, activeMentionIndex, candidates.length]);

  useEffect(() => {
    if (!mentionOpen) {
      return;
    }
    const onPointerDown = (e: PointerEvent): void => {
      if (
        composerRef.current &&
        !composerRef.current.contains(e.target as Node)
      ) {
        setMentionOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [mentionOpen]);

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
    <div ref={composerRef} className="shrink-0 px-4 pb-4">
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
            <ul
              id="mention-candidates-list"
              role="listbox"
              aria-label="Mention candidates"
              className="max-h-56 overflow-y-auto p-1.5"
            >
              {candidates.map((c, idx) => (
                <li key={`${c.kind}-${c.label}`} role="presentation">
                  <button
                    ref={(el) => {
                      mentionItemRefs.current[idx] = el;
                    }}
                    type="button"
                    role="option"
                    id={`mention-opt-${idx}`}
                    tabIndex={-1}
                    aria-selected={idx === activeMentionIndex}
                    onMouseEnter={() => setMentionIndex(idx)}
                    onClick={() =>
                      insertMention(
                        c.kind === "agent"
                          ? c.label
                          : (c.label.split(" ")[0] ?? c.label)
                      )
                    }
                    className={`flex w-full items-center gap-2.5 px-2 py-1.5 text-left transition ${
                      idx === activeMentionIndex
                        ? "bg-blurple/25 text-ink ring-blurple/50 ring-1"
                        : "text-ink-dim hover:bg-blurple/15"
                    }`}
                  >
                    <Avatar
                      name={c.label}
                      color={c.color}
                      size={28}
                      bot={c.bot}
                      icon={c.icon}
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
              if (mentionOpen && candidates.length > 0) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setMentionIndex((i) => (i + 1) % candidates.length);
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setMentionIndex(
                    (i) => (i - 1 + candidates.length) % candidates.length
                  );
                  return;
                }
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  const target = candidates[activeMentionIndex];
                  if (target) {
                    insertMention(
                      target.kind === "agent"
                        ? target.label
                        : (target.label.split(" ")[0] ?? target.label)
                    );
                  }
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setMentionOpen(false);
                  return;
                }
              }

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
                : "Message the room — @neb, @mkt, @res…"
            }
            disabled={!connected}
            aria-expanded={mentionOpen}
            aria-autocomplete="list"
            aria-controls={
              mentionOpen && candidates.length > 0
                ? "mention-candidates-list"
                : undefined
            }
            aria-activedescendant={
              mentionOpen && candidates.length > 0
                ? `mention-opt-${activeMentionIndex}`
                : undefined
            }
            aria-label={
              variant === "thread" ? "Steer thread agents" : "Message the room"
            }
            className="text-ink placeholder:text-ink-ghost max-h-[140px] min-h-[24px] w-full resize-none bg-transparent text-[14px] leading-relaxed outline-none disabled:opacity-50"
          />
          <MicButton
            connected={connected}
            onText={appendVoiceText}
            onRecordingChange={onVoiceChange}
          />
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
