"use client";

import { useCallback, useMemo, useState } from "react";
import { useSpacetimeDB } from "spacetimedb/react";

import { mockSource } from "@/lib/room-adapter";

import { RoomView } from "../room/room-view";
import { ChromeTabs } from "./chrome-tabs";
import { Sidebar } from "./sidebar";

const EmptyCanvas = () => (
  <div className="grid h-full place-items-center px-6">
    <div className="max-w-sm text-center">
      <div className="bg-blurple-soft mx-auto grid h-16 w-16 place-items-center rounded-2xl text-2xl font-bold text-[#8b9bff]">
        N
      </div>
      <h2 className="font-display mt-4 text-xl font-bold text-white">
        No rooms yet
      </h2>
      <p className="text-ink-dim mt-2 text-[14px] leading-relaxed">
        Select or create a room to start a shared brain for your team.
      </p>
    </div>
  </div>
);

export const WorkspaceShell = () => {
  const { isActive: connected } = useSpacetimeDB();
  const rooms = useMemo(() => mockSource.listRooms(), []);

  const [openRoomIds, setOpenRoomIds] = useState<bigint[]>([1n, 3n, 2n]);
  const [activeRoomId, setActiveRoomId] = useState<bigint>(1n);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const openRooms = useMemo(
    () =>
      openRoomIds
        .map((id) => rooms.find((r) => r.roomId === id))
        .filter((r): r is NonNullable<typeof r> => Boolean(r)),
    [openRoomIds, rooms]
  );

  const onlineCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rooms) {
      m[String(r.roomId)] = mockSource.onlineCount(r.roomId);
    }
    return m;
  }, [rooms]);

  const select = useCallback((roomId: bigint) => {
    setOpenRoomIds((prev) =>
      prev.includes(roomId) ? prev : [...prev, roomId]
    );
    setActiveRoomId(roomId);
    setMobileNav(false);
    mockSource.joinRoom(roomId);
    mockSource.heartbeat(roomId);
  }, []);

  const close = useCallback(
    (roomId: bigint) => {
      setOpenRoomIds((prev) => {
        if (prev.length === 1) {
          return prev;
        }
        const next = prev.filter((id) => id !== roomId);
        if (roomId === activeRoomId) {
          const fallback = next.at(-1);
          if (fallback !== undefined) {
            setActiveRoomId(fallback);
          }
        }
        return next;
      });
    },
    [activeRoomId]
  );

  const openNext = useCallback(() => {
    const unopened = rooms.find((r) => !openRoomIds.includes(r.roomId));
    if (unopened) {
      select(unopened.roomId);
    }
  }, [rooms, openRoomIds, select]);

  const activeRoom = rooms.find((r) => r.roomId === activeRoomId) ?? rooms[0];

  return (
    <div className="bg-abyss text-ink flex h-dvh flex-col overflow-hidden">
      <ChromeTabs
        openRooms={openRooms}
        activeRoomId={activeRoomId}
        connected={connected}
        onActivate={select}
        onClose={close}
        onNew={openNext}
      />

      <div className="relative flex min-h-0 flex-1">
        {/* desktop sidebar */}
        <div className="hidden shrink-0 md:flex">
          <Sidebar
            rooms={rooms}
            activeRoomId={activeRoomId}
            openRoomIds={openRoomIds}
            collapsed={collapsed}
            onlineCounts={onlineCounts}
            onSelect={select}
            onToggleCollapse={() => setCollapsed((c) => !c)}
          />
        </div>

        {/* mobile drawer */}
        {mobileNav && (
          <div className="absolute inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
              onClick={() => setMobileNav(false)}
            />
            <Sidebar
              rooms={rooms}
              activeRoomId={activeRoomId}
              openRoomIds={openRoomIds}
              collapsed={false}
              onlineCounts={onlineCounts}
              onSelect={select}
              onToggleCollapse={() => setCollapsed((c) => !c)}
              onCloseMobile={() => setMobileNav(false)}
            />
          </div>
        )}

        {/* canvas — single active room fills it */}
        <main className="grain bg-chat relative min-w-0 flex-1">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-40"
            style={{
              background:
                "radial-gradient(600px 160px at 30% 0%, rgba(88,101,242,0.12), transparent 70%)",
            }}
          />
          {activeRoom ? (
            <RoomView
              key={String(activeRoom.roomId)}
              roomId={activeRoom.roomId}
              onOpenNav={() => setMobileNav(true)}
            />
          ) : (
            <EmptyCanvas />
          )}
        </main>
      </div>
    </div>
  );
};
