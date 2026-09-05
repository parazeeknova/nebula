"use client";

import type { Room } from "@/lib/room-types";

import { PlusIcon, XIcon } from "../icons";

interface Props {
  openRooms: Room[];
  activeRoomId: bigint;
  connected: boolean;
  onActivate: (roomId: bigint) => void;
  onClose: (roomId: bigint) => void;
  onNew: () => void;
}

const dotFor = (name: string): string => {
  const palette = [
    "#5865f2",
    "#57f287",
    "#eb459e",
    "#fee75c",
    "#00a8fc",
    "#ed7842",
  ];
  let h = 0;
  for (const c of name) {
    h = (h * 31 + (c.codePointAt(0) ?? 0)) % palette.length;
  }
  return palette[h] ?? "#5865f2";
};

export const ChromeTabs = ({
  openRooms,
  activeRoomId,
  connected,
  onActivate,
  onClose,
  onNew,
}: Props) => (
  <div className="flex h-11 shrink-0 items-stretch gap-1 overflow-hidden border-b border-white/[0.06] bg-black px-2 pt-1.5">
    <div
      className="flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto"
      role="tablist"
      aria-label="Open rooms"
    >
      {openRooms.map((room) => {
        const active = room.roomId === activeRoomId;
        return (
          <div
            key={String(room.roomId)}
            role="tab"
            aria-selected={active}
            onClick={() => onActivate(room.roomId)}
            className={`group relative flex max-w-56 min-w-32 flex-1 cursor-pointer items-center gap-2 rounded-t-lg px-3 text-[13px] transition-all duration-150 select-none ${
              active
                ? "bg-panel shadow-tab ring-b-0 font-semibold text-white ring-1 ring-white/[0.06]"
                : "text-ink-dim hover:text-ink font-medium hover:bg-white/[0.05]"
            }`}
          >
            {active && (
              <span className="from-blurple to-blurple absolute inset-x-3 top-0 h-[2px] rounded-full bg-gradient-to-r via-[#8b9bff]" />
            )}
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: dotFor(room.name) }}
            />
            <span className="min-w-0 flex-1 truncate">{room.name}</span>
            {room.unread && !active && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(room.roomId);
              }}
              aria-label={`Close ${room.name}`}
              className={`shrink-0 rounded p-0.5 transition hover:bg-white/10 hover:text-white ${
                active ? "opacity-100" : "opacity-0 group-hover:opacity-70"
              }`}
            >
              <XIcon />
            </button>
          </div>
        );
      })}
      <button
        onClick={onNew}
        aria-label="Open next room"
        title="Open next room"
        className="text-ink-faint hover:text-ink mb-1 grid w-8 shrink-0 place-items-center self-center rounded-md p-1.5 transition hover:bg-white/5"
      >
        <PlusIcon className="h-3.5 w-3.5" />
      </button>
    </div>

    <div className="mb-1 hidden shrink-0 items-center gap-2 pl-2 sm:flex">
      <span className="text-ink-ghost hidden font-mono text-[11px] xl:block">
        12ms
      </span>
      <span
        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
          connected
            ? "bg-mint/10 text-mint ring-mint/25"
            : "bg-gold/10 text-gold ring-gold/25"
        }`}
        role="status"
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-mint animate-pulse-dot" : "bg-gold animate-pulse"}`}
        />
        {connected ? "Live" : "Syncing"}
      </span>
    </div>
  </div>
);
