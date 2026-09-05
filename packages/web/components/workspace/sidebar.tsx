"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { Room } from "@/lib/room-types";

import {
  ChevronLeftIcon,
  CompassIcon,
  GearIcon,
  HashIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  XIcon,
} from "../icons";
import { DeleteRoomModal } from "../room/delete-room-modal";
import { RenameRoomModal } from "../room/rename-room-modal";

interface Props {
  rooms: Room[];
  activeRoomId: bigint;
  openRoomIds: bigint[];
  collapsed: boolean;
  onlineCounts: Record<string, number>;
  me: { displayName: string; online: boolean };
  onSelect: (roomId: bigint) => void;
  onCreateRoom: () => void;
  onRenameMe: (name: string) => void;
  onRenameRoom?: (roomId: bigint, newName: string) => void;
  onDeleteRoom?: (roomId: bigint) => void;
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

interface RoomMenuProps {
  onDeleteRoom?: (room: Room) => void;
  onRenameRoom?: (room: Room) => void;
  room: Room;
}

const RoomMenu = ({ onDeleteRoom, onRenameRoom, room }: RoomMenuProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  if (!onRenameRoom && !onDeleteRoom) {
    return null;
  }

  return (
    <div className="absolute top-1/2 right-1.5 -translate-y-1/2" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((curr) => !curr);
        }}
        className={`text-ink-faint rounded p-1 transition hover:text-white ${
          menuOpen
            ? "bg-white/10 opacity-100"
            : "opacity-0 group-hover/room:opacity-100"
        }`}
        title="Channel options"
        aria-label="Channel options"
      >
        <MoreHorizontalIcon className="h-3.5 w-3.5" />
      </button>

      {menuOpen && (
        <div className="bg-panel-2 shadow-pop absolute top-full right-0 z-50 mt-1 w-36 border border-white/10 py-1">
          {onRenameRoom && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onRenameRoom(room);
              }}
              className="text-ink-dim hover:text-ink flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition hover:bg-white/[0.06]"
            >
              <PencilIcon className="h-3 w-3" />
              <span>Rename</span>
            </button>
          )}
          {onDeleteRoom && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onDeleteRoom(room);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300"
            >
              <TrashIcon className="h-3 w-3" />
              <span>Delete</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

interface RoomListItemProps {
  active: boolean;
  collapsed: boolean;
  online: number;
  onDeleteRoom?: (room: Room) => void;
  onRenameRoom?: (room: Room) => void;
  onSelect: (roomId: bigint) => void;
  room: Room;
}

const RoomListItem = ({
  active,
  collapsed,
  online,
  onDeleteRoom,
  onRenameRoom,
  onSelect,
  room,
}: RoomListItemProps) => (
  <li className="group/room relative flex items-center">
    {active && !collapsed && (
      <span className="bg-blurple absolute top-1.5 bottom-1.5 left-0 w-1 shadow-[0_0_8px_rgba(88,101,242,0.8)]" />
    )}
    <button
      onClick={() => onSelect(room.roomId)}
      title={collapsed ? room.name : undefined}
      className={`group relative flex min-w-0 flex-1 items-center gap-2 px-2 py-[7px] text-left text-[13.5px] transition-all duration-150 ${rowTone(active, room.unread)} ${collapsed ? "justify-center px-0 py-1.5" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      {collapsed ? (
        <span
          className={`relative grid h-9 w-9 place-items-center text-[14px] font-bold transition ${
            active
              ? "bg-blurple text-white shadow-[0_4px_14px_rgba(88,101,242,0.5)]"
              : "text-ink-dim group-hover:text-ink bg-white/[0.05] group-hover:bg-white/10"
          }`}
        >
          {room.name.slice(0, 1).toUpperCase()}
          {room.unread && !active && (
            <span className="bg-blurple absolute top-0.5 right-0.5 h-2 w-2 ring-2 ring-[#0a0b0d]" />
          )}
        </span>
      ) : (
        <>
          <HashIcon
            className={`h-4 w-4 shrink-0 transition ${
              active
                ? "text-blurple"
                : "text-ink-ghost group-hover:text-ink-dim"
            }`}
          />
          <span className="min-w-0 flex-1 truncate">{room.name}</span>
          {room.unread && !active ? (
            <span
              className="bg-blurple h-2 w-2 shrink-0 shadow-[0_0_6px_rgba(88,101,242,0.8)]"
              aria-label="Unread messages"
            />
          ) : (
            <span
              className={`text-ink-ghost hidden shrink-0 items-center gap-1 font-mono text-[10px] ${
                onRenameRoom || onDeleteRoom
                  ? "group-hover/room:hidden"
                  : "group-hover/room:flex"
              }`}
            >
              <span className="bg-mint h-1.5 w-1.5" />
              {online}
            </span>
          )}
        </>
      )}
    </button>

    {!collapsed && (
      <RoomMenu
        room={room}
        onRenameRoom={onRenameRoom}
        onDeleteRoom={onDeleteRoom}
      />
    )}
  </li>
);

export const Sidebar = ({
  rooms,
  activeRoomId,
  collapsed,
  onlineCounts,
  me,
  onSelect,
  onCreateRoom,
  onRenameMe,
  onRenameRoom,
  onDeleteRoom,
  onToggleCollapse,
  onCloseMobile,
}: Props) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [renamingRoom, setRenamingRoom] = useState<Room | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);

  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) {
      return rooms;
    }
    const q = searchQuery.toLowerCase().trim();
    return rooms.filter((r) => r.name.toLowerCase().includes(q));
  }, [rooms, searchQuery]);

  const width = collapsed ? "w-[68px]" : "w-60";
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");

  const initials = me.displayName
    .split(" ")
    .filter((w) => w.length > 0)
    .slice(0, 2)
    .map((w) => w.slice(0, 1).toUpperCase())
    .join("");

  const saveName = () => {
    setEditingName(false);
    if (draftName.trim() && draftName.trim() !== me.displayName) {
      onRenameMe(draftName);
    }
  };

  return (
    <aside
      className={`${width} bg-panel max-md:shadow-pop flex h-full shrink-0 flex-col border-r border-white/[0.06] transition-[width] duration-200 ease-out select-none max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:w-72`}
      aria-label="Sidebar navigation"
    >
      {/* brand header aligned flush with chrome tabs */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/[0.06] px-3">
        {collapsed ? (
          <button
            onClick={onToggleCollapse}
            title="Expand sidebar (⌘B)"
            className="bg-blurple-soft mx-auto grid h-7 w-7 place-items-center text-xs font-bold text-[#8b9bff] transition hover:brightness-125"
          >
            N
          </button>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="bg-blurple-soft grid h-7 w-7 shrink-0 place-items-center text-xs font-bold text-[#8b9bff] shadow-[0_0_12px_rgba(88,101,242,0.35)]">
                N
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="font-display truncate text-[14px] font-bold tracking-tight text-white">
                  Nebula
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onToggleCollapse}
                className="text-ink-faint hover:text-ink hidden p-1.5 transition hover:bg-white/5 md:block"
                aria-label="Collapse sidebar"
                title="Collapse sidebar (⌘B)"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              {onCloseMobile ? (
                <button
                  onClick={onCloseMobile}
                  className="text-ink-faint hover:text-ink p-1.5 transition hover:bg-white/5 md:hidden"
                  aria-label="Close sidebar"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>

      {/* search box */}
      {!collapsed && (
        <div className="px-2 pt-2.5">
          <label className="group text-ink-faint focus-within:ring-blurple/60 focus-within:text-ink flex h-8 cursor-text items-center gap-2 bg-black/60 px-2.5 text-[13px] ring-1 ring-white/10 transition">
            <SearchIcon className="h-3.5 w-3.5 shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rooms..."
              className="text-ink placeholder:text-ink-ghost w-full min-w-0 bg-transparent text-[13px] outline-none"
              aria-label="Search rooms"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="text-ink-ghost hover:text-ink"
                aria-label="Clear search"
              >
                <XIcon className="h-3 w-3" />
              </button>
            ) : (
              <kbd className="text-ink-faint hidden border border-white/10 bg-white/5 px-1 font-mono text-[10px] lg:block">
                ⌘K
              </kbd>
            )}
          </label>
        </div>
      )}

      {/* room list & workspace tools */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {!collapsed && (
          <div className="mb-1.5 flex items-center justify-between px-2">
            <span className="text-ink-faint font-mono text-[10px] font-semibold tracking-[0.14em] uppercase">
              Channels — {filteredRooms.length}
            </span>
            <button
              className="text-ink-faint hover:text-ink p-1 transition hover:bg-white/5"
              aria-label="Create channel"
              title="Create channel"
              onClick={onCreateRoom}
            >
              <PlusIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <ul className="flex flex-col gap-[2px]">
          {filteredRooms.map((room) => (
            <RoomListItem
              key={String(room.roomId)}
              room={room}
              active={room.roomId === activeRoomId}
              collapsed={collapsed}
              online={onlineCounts[String(room.roomId)] ?? 0}
              onSelect={onSelect}
              onRenameRoom={onRenameRoom ? setRenamingRoom : undefined}
              onDeleteRoom={onDeleteRoom ? setDeletingRoom : undefined}
            />
          ))}
          {filteredRooms.length === 0 && !collapsed && (
            <li className="px-2 py-4 text-center">
              <p className="text-ink-ghost text-xs">No rooms found</p>
            </li>
          )}
        </ul>

        {!collapsed && (
          <>
            <div className="mt-5 mb-1.5 px-2">
              <span className="text-ink-faint font-mono text-[10px] font-semibold tracking-[0.14em] uppercase">
                Workspace
              </span>
            </div>
            <ul className="flex flex-col gap-[2px]">
              <li>
                <button className="text-ink-dim hover:text-ink flex w-full items-center gap-2 px-2 py-[7px] text-left text-[13.5px] font-medium transition hover:bg-white/[0.04]">
                  <CompassIcon className="text-ink-ghost h-4 w-4" />
                  <span className="flex-1 truncate">Overview</span>
                  <span className="bg-blurple-soft px-1.5 py-px font-mono text-[10px] font-semibold text-[#8b9bff]">
                    live
                  </span>
                </button>
              </li>
            </ul>
          </>
        )}
      </nav>

      {/* me profile card + collapse */}
      <div className="bg-panel-2 shrink-0 border-t border-white/[0.06] px-2 py-2">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 py-1 max-md:hidden">
            <span className="relative" title={me.displayName}>
              <span className="bg-blurple grid h-9 w-9 place-items-center text-xs font-extrabold text-white">
                {initials}
              </span>
              <span
                className={`border-panel-2 absolute -right-0.5 -bottom-0.5 h-3 w-3 border-[2.5px] ${
                  me.online ? "bg-mint" : "bg-ink-ghost"
                }`}
              />
            </span>
            <button
              onClick={onToggleCollapse}
              className="text-ink-faint hover:text-ink rotate-180 p-1.5 transition hover:bg-white/5"
              aria-label="Expand sidebar"
              title="Expand sidebar (⌘B)"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-1.5 py-1.5">
            <span className="relative shrink-0">
              <span className="bg-blurple grid h-8 w-8 place-items-center text-xs font-extrabold text-white">
                {initials}
              </span>
              <span
                className={`border-panel-2 absolute -right-0.5 -bottom-0.5 h-3 w-3 border-[2.5px] ${
                  me.online ? "bg-mint" : "bg-ink-ghost"
                }`}
              />
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              {editingName ? (
                <input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      saveName();
                    }
                    if (e.key === "Escape") {
                      setEditingName(false);
                    }
                  }}
                  aria-label="Display name"
                  className="font-display text-ink ring-blurple/60 w-full bg-black/60 px-1 text-[13px] font-semibold ring-1 outline-none"
                />
              ) : (
                <button
                  onClick={() => {
                    setDraftName(me.displayName);
                    setEditingName(true);
                  }}
                  title="Click to rename"
                  className="font-display text-ink block w-full truncate text-left text-[13px] font-semibold hover:underline"
                >
                  {me.displayName}
                </button>
              )}
              <span className="text-ink-faint block truncate text-[11px]">
                {me.online ? "online" : "connecting…"}
              </span>
            </span>
            <button
              className="text-ink-faint hover:text-ink p-1.5 transition hover:bg-white/5"
              aria-label="Settings"
              title="Settings"
            >
              <GearIcon className="h-4 w-4" />
            </button>
            <button
              onClick={onToggleCollapse}
              className="text-ink-faint hover:text-ink p-1.5 transition hover:bg-white/5 max-md:hidden"
              aria-label="Collapse sidebar"
              title="Collapse sidebar (⌘B)"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {renamingRoom && (
        <RenameRoomModal
          initialName={renamingRoom.name}
          isOpen={true}
          onClose={() => setRenamingRoom(null)}
          onRename={(newName) => {
            onRenameRoom?.(renamingRoom.roomId, newName);
          }}
        />
      )}

      {deletingRoom && (
        <DeleteRoomModal
          isOpen={true}
          roomName={deletingRoom.name}
          onClose={() => setDeletingRoom(null)}
          onConfirm={() => {
            onDeleteRoom?.(deletingRoom.roomId);
          }}
        />
      )}
    </aside>
  );
};
