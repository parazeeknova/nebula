"use client";

import type { Room } from "@/lib/room-types";

import { MenuIcon, PlusIcon, XIcon } from "../icons";

interface Props {
  openRooms: Room[];
  activeRoomId: bigint;
  connected: boolean;
  onActivate: (roomId: bigint) => void;
  onClose: (roomId: bigint) => void;
  onNew: () => void;
  onOpenNav?: () => void;
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
  onOpenNav,
}: Props) => {
  const handleKeyDown = (
    e: React.KeyboardEvent,
    roomId: bigint,
    idx: number
  ) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const nextRoom = openRooms[(idx + 1) % openRooms.length];
      if (nextRoom) {onActivate(nextRoom.roomId);}
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prevRoom =
        openRooms[(idx - 1 + openRooms.length) % openRooms.length];
      if (prevRoom) {onActivate(prevRoom.roomId);}
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate(roomId);
    } else if (e.key === "Delete") {
      e.preventDefault();
      onClose(roomId);
    }
  };

  return (
    <div className="flex h-11 shrink-0 items-stretch gap-1 overflow-hidden border-b border-white/[0.06] bg-black px-2 pt-1.5 select-none">
      {onOpenNav && (
        <button
          onClick={onOpenNav}
          aria-label="Open navigation drawer"
          className="text-ink-dim hover:text-ink focus-visible:ring-blurple mr-0.5 mb-1 grid w-8 shrink-0 place-items-center self-center rounded-md p-1.5 transition hover:bg-white/5 focus-visible:ring-2 focus-visible:outline-none md:hidden"
        >
          <MenuIcon className="h-4 w-4" />
        </button>
      )}
      <div
        className="flex min-w-0 flex-1 [scrollbar-width:none] items-stretch gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Open rooms"
      >
        {openRooms.map((room, idx) => {
          const active = room.roomId === activeRoomId;
          return (
            <div
              key={String(room.roomId)}
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onActivate(room.roomId)}
              onKeyDown={(e) => handleKeyDown(e, room.roomId, idx)}
              className={`group focus-visible:ring-blurple relative flex max-w-56 min-w-32 flex-1 cursor-pointer items-center gap-2 rounded-t-lg px-3 text-[13px] transition-all duration-150 select-none focus-visible:ring-2 focus-visible:outline-none ${
                active
                  ? "shadow-tab ring-b-0 bg-[#0b0c10] font-semibold text-white ring-1 ring-white/[0.08]"
                  : "text-ink-dim hover:text-ink font-medium hover:bg-white/[0.04]"
              }`}
            >
              {active && (
                <span className="from-blurple to-blurple absolute inset-x-2.5 top-0 h-[2px] rounded-full bg-gradient-to-r via-[#8b9bff] shadow-[0_0_8px_rgba(88,101,242,0.8)]" />
              )}
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: dotFor(room.name) }}
              />
              <span className="min-w-0 flex-1 truncate">{room.name}</span>
              {room.unread && !active && (
                <span className="bg-blurple h-1.5 w-1.5 shrink-0 rounded-full" />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(room.roomId);
                }}
                aria-label={`Close tab ${room.name}`}
                className={`focus-visible:ring-blurple shrink-0 rounded p-0.5 transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:outline-none ${
                  active ? "opacity-100" : "opacity-0 group-hover:opacity-70"
                }`}
              >
                <XIcon className="h-3 w-3" />
              </button>
            </div>
          );
        })}
        <button
          onClick={onNew}
          aria-label="Open new room tab"
          title="Open new room tab"
          className="text-ink-faint hover:text-ink focus-visible:ring-blurple mb-1 grid h-7 w-7 shrink-0 place-items-center self-center rounded-md transition hover:bg-white/5 focus-visible:ring-2 focus-visible:outline-none"
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
            className={`h-1.5 w-1.5 rounded-full ${
              connected ? "bg-mint animate-pulse-dot" : "bg-gold animate-pulse"
            }`}
          />
          {connected ? "Live" : "Syncing"}
        </span>
      </div>
    </div>
  );
};
