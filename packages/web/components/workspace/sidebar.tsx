"use client";

import type { Room } from "@/lib/room-types";

import {
  ChevronLeftIcon,
  CompassIcon,
  DbIcon,
  GearIcon,
  PlusIcon,
  SearchIcon,
} from "../icons";

interface Props {
  rooms: Room[];
  activeRoomId: bigint;
  openRoomIds: bigint[];
  collapsed: boolean;
  onlineCounts: Record<string, number>;
  onSelect: (roomId: bigint) => void;
  onToggleCollapse: () => void;
  onCloseMobile?: () => void;
}

const rowTone = (active: boolean, unread: boolean | undefined): string => {
  if (active) {
    return "bg-white/[0.08] font-semibold text-white";
  }
  if (unread) {
    return "text-ink font-semibold hover:bg-white/[0.04]";
  }
  return "text-ink-dim hover:text-ink font-medium hover:bg-white/[0.04]";
};

export const Sidebar = ({
  rooms,
  activeRoomId,
  collapsed,
  onlineCounts,
  onSelect,
  onToggleCollapse,
}: Props) => {
  const width = collapsed ? "w-[68px]" : "w-60";

  return (
    <aside
      className={`${width} bg-panel max-md:shadow-pop flex shrink-0 flex-col border-r border-white/[0.06] transition-[width] duration-200 ease-out max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:w-72`}
      aria-label="Rooms"
    >
      {/* search */}
      {!collapsed && (
        <div className="px-2 pt-2">
          <label className="group text-ink-faint focus-within:ring-blurple/60 flex h-8 cursor-text items-center gap-2 rounded-md bg-black/60 px-2.5 text-[13px] ring-1 ring-white/10 transition">
            <SearchIcon className="h-3.5 w-3.5" />
            <input
              placeholder="Search rooms"
              className="text-ink placeholder:text-ink-ghost w-full bg-transparent outline-none"
              aria-label="Search rooms"
            />
            <kbd className="text-ink-faint hidden rounded border border-white/10 bg-white/5 px-1 font-mono text-[10px] lg:block">
              ⌘K
            </kbd>
          </label>
        </div>
      )}

      {/* room list */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {!collapsed && (
          <div className="mb-1 flex items-center justify-between px-2">
            <span className="text-ink-faint font-mono text-[10px] font-semibold tracking-[0.14em] uppercase">
              Text rooms — {rooms.length}
            </span>
            <button
              className="text-ink-faint hover:text-ink rounded p-1 transition hover:bg-white/5"
              aria-label="Create room"
              title="Create room"
            >
              <PlusIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <ul className="flex flex-col gap-[2px]">
          {rooms.map((room) => {
            const active = room.roomId === activeRoomId;
            const online = onlineCounts[String(room.roomId)] ?? 0;
            return (
              <li key={String(room.roomId)} className="relative">
                {active && (
                  <span className="bg-ink absolute top-1/2 left-[-8px] h-8 w-1 -translate-y-1/2 rounded-r-full" />
                )}
                <button
                  onClick={() => onSelect(room.roomId)}
                  title={collapsed ? room.name : undefined}
                  className={`group flex w-full items-center gap-2 rounded-md px-2 py-[7px] text-left text-[14px] transition-all duration-150 ${rowTone(active, room.unread)} ${collapsed ? "justify-center px-0" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  {collapsed ? (
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-xl text-[15px] font-bold transition ${
                        active
                          ? "bg-blurple text-white shadow-[0_4px_14px_rgba(88,101,242,0.5)]"
                          : "text-ink-dim group-hover:text-ink bg-white/[0.06] group-hover:bg-white/10"
                      }`}
                    >
                      {room.name.slice(0, 1).toUpperCase()}
                    </span>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 truncate">
                        {room.name}
                      </span>
                      {room.unread && !active ? (
                        <span
                          className="bg-ink h-2 w-2 shrink-0 rounded-full"
                          aria-label="Unread"
                        />
                      ) : (
                        <span className="text-ink-ghost hidden shrink-0 items-center gap-1 font-mono text-[10px] group-hover:flex">
                          <span className="bg-mint h-1.5 w-1.5 rounded-full" />
                          {online}
                        </span>
                      )}
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {!collapsed && (
          <>
            <div className="mt-5 mb-1 px-2">
              <span className="text-ink-faint font-mono text-[10px] font-semibold tracking-[0.14em] uppercase">
                Workspace
              </span>
            </div>
            <ul className="flex flex-col gap-[2px]">
              <li>
                <button className="text-ink-dim hover:text-ink flex w-full items-center gap-2 rounded-md px-2 py-[7px] text-left text-[14px] font-medium transition hover:bg-white/[0.04]">
                  <CompassIcon className="text-ink-ghost h-[18px] w-[18px]" />
                  <span className="flex-1 truncate">Overview</span>
                  <span className="bg-blurple-soft rounded px-1.5 py-px font-mono text-[10px] font-semibold text-[#8b9bff]">
                    live
                  </span>
                </button>
              </li>
              <li>
                <button className="text-ink-dim hover:text-ink flex w-full items-center gap-2 rounded-md px-2 py-[7px] text-left text-[14px] font-medium transition hover:bg-white/[0.04]">
                  <DbIcon className="text-ink-ghost h-[18px] w-[18px]" />
                  <span className="flex-1 truncate">Memory</span>
                  <span className="text-ink-faint rounded bg-white/5 px-1.5 py-px font-mono text-[10px]">
                    soon
                  </span>
                </button>
              </li>
            </ul>
          </>
        )}
      </nav>

      {/* me card + collapse */}
      <div className="bg-panel-2 shrink-0 border-t border-white/[0.06] px-2 py-2">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 py-1 max-md:hidden">
            <span className="relative">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#5865f2] to-[#00a8fc] text-xs font-extrabold text-white">
                AC
              </span>
              <span className="border-panel-2 bg-mint absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-[2.5px]" />
            </span>
            <button
              onClick={onToggleCollapse}
              className="text-ink-faint hover:text-ink rotate-180 rounded p-1.5 transition hover:bg-white/5"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md px-1.5 py-1.5">
            <span className="relative shrink-0">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#5865f2] to-[#00a8fc] text-xs font-extrabold text-white">
                AC
              </span>
              <span className="border-panel-2 bg-mint absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-[2.5px]" />
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="font-display text-ink block truncate text-[13px] font-semibold">
                Ava Chen
              </span>
              <span className="text-ink-faint block truncate text-[11px]">
                online · growth
              </span>
            </span>
            <button
              className="text-ink-faint hover:text-ink rounded p-1.5 transition hover:bg-white/5"
              aria-label="Settings"
            >
              <GearIcon className="h-4 w-4" />
            </button>
            <button
              onClick={onToggleCollapse}
              className="text-ink-faint hover:text-ink rounded p-1.5 transition hover:bg-white/5 max-md:hidden"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
