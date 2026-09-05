"use client";

import { useEffect, useRef, useState } from "react";

import {
  MenuIcon,
  MoreHorizontalIcon,
  PanelIcon,
  PencilIcon,
  PlusIcon,
  ShareIcon,
  TrashIcon,
} from "../icons";

interface Props {
  membersOpen: boolean;
  name: string;
  newThreadArmed: boolean;
  onDelete?: () => void;
  onNewThread: () => void;
  onOpenNav: () => void;
  onRename?: (newName: string) => void;
  onShare: () => void;
  onToggleMembers: () => void;
  topic: string;
}

export const RoomHeader = ({
  name,
  topic,
  membersOpen,
  newThreadArmed,
  onToggleMembers,
  onNewThread,
  onShare,
  onOpenNav,
  onRename,
  onDelete,
}: Props) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const menuRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraftName(name);
  }, [name]);

  useEffect(() => {
    if (editingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [editingName]);

  const saveName = () => {
    setEditingName(false);
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== name) {
      onRename?.(trimmed);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  return (
    <header className="bg-chat/95 flex h-12 shrink-0 items-center gap-2 border-b border-white/[0.06] px-3 backdrop-blur">
      <button
        className="text-ink-dim hover:text-ink p-1.5 transition hover:bg-white/5 md:hidden"
        onClick={onOpenNav}
        aria-label="Open rooms"
      >
        <MenuIcon />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="bg-blurple font-display grid h-7 w-7 shrink-0 place-items-center text-[13px] font-bold text-white">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <div className="group flex min-w-0 items-center gap-1.5">
          {editingName ? (
            <input
              ref={nameInputRef}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  saveName();
                }
                if (e.key === "Escape") {
                  setDraftName(name);
                  setEditingName(false);
                }
              }}
              aria-label="Room name"
              maxLength={64}
              className="ring-blurple/60 font-display text-ink min-w-0 bg-black/60 px-1 text-[15px] font-bold tracking-tight ring-1 outline-none"
            />
          ) : (
            <h1
              onDoubleClick={() => {
                if (onRename) {
                  setDraftName(name);
                  setEditingName(true);
                }
              }}
              className={`font-display truncate text-[15px] font-bold tracking-tight text-white ${onRename ? "cursor-text" : ""}`}
              title={onRename ? "Double-click to rename" : undefined}
            >
              {name}
            </h1>
          )}
          {onRename && (
            <button
              onClick={() => {
                setDraftName(name);
                setEditingName(true);
              }}
              className="text-ink-faint hover:text-ink opacity-0 transition group-hover:opacity-100"
              title="Rename room"
              aria-label="Rename room"
            >
              <PencilIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <span className="text-ink-faint hidden truncate border-l border-white/10 pl-3 text-[13px] lg:block">
          {topic}
        </span>
      </div>

      <div className="text-ink-dim flex shrink-0 items-center gap-0.5">
        <button
          onClick={onShare}
          aria-label="Share room"
          title="Share room invite"
          className="hover:text-ink rounded p-2 transition hover:bg-white/5"
        >
          <ShareIcon />
        </button>
        <button
          onClick={onNewThread}
          aria-label="Start new thread"
          aria-pressed={newThreadArmed}
          title="Next message starts a new thread"
          className={`p-2 transition ${
            newThreadArmed
              ? "bg-blurple-soft text-[#8b9bff]"
              : "hover:text-ink hover:bg-white/5"
          }`}
        >
          <PlusIcon />
        </button>
        <button
          onClick={onToggleMembers}
          aria-label="Toggle members"
          aria-pressed={membersOpen}
          title="Toggle members"
          className={`p-2 transition ${
            membersOpen
              ? "bg-blurple-soft text-[#8b9bff]"
              : "hover:text-ink hover:bg-white/5"
          }`}
        >
          <PanelIcon />
        </button>

        {/* Room options dropdown */}
        {(onRename || onDelete) && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Room options"
              aria-expanded={menuOpen}
              title="Room options"
              className={`p-2 transition ${
                menuOpen
                  ? "bg-white/10 text-white"
                  : "hover:text-ink hover:bg-white/5"
              }`}
            >
              <MoreHorizontalIcon className="h-4 w-4" />
            </button>

            {menuOpen && (
              <div className="bg-panel-2 shadow-pop absolute top-full right-0 z-50 mt-1.5 w-44 border border-white/10 py-1">
                {onRename && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setDraftName(name);
                      setEditingName(true);
                    }}
                    className="text-ink-dim hover:text-ink flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition hover:bg-white/[0.06]"
                  >
                    <PencilIcon className="h-3.5 w-3.5" />
                    <span>Rename room</span>
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete();
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                    <span>Delete room</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
