"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSpacetimeDB } from "spacetimedb/react";

import {
  useCreateRoom,
  useDeleteRoom,
  useJoinByLink,
  useJoinRoom,
  useLiveRooms,
  useMyProfile,
  usePresenceCounts,
  useRenameRoom,
  useWorkspace,
} from "@/lib/live";

import { CanvasSkeleton } from "../room/placeholders";
import { RoomView } from "../room/room-view";
import { EntryFlowModal } from "./entry-flow-modal";
import { Sidebar } from "./sidebar";

const EmptyCanvas = ({ onCreate }: { onCreate: () => void }) => (
  <div className="grid h-full place-items-center px-6">
    <div className="max-w-sm text-center">
      <div className="bg-blurple-soft mx-auto grid h-16 w-16 place-items-center text-2xl font-bold text-[#8b9bff]">
        N
      </div>
      <h2 className="font-display mt-4 text-xl font-bold text-white">
        No rooms yet
      </h2>
      <p className="text-ink-dim mt-2 text-[14px] leading-relaxed">
        Create a room to start a shared brain for your team.
      </p>
      <button
        onClick={onCreate}
        className="bg-blurple hover:bg-blurple-deep mt-4 px-4 py-2 text-[14px] font-bold text-white shadow-[0_4px_14px_rgba(88,101,242,0.55)] transition"
      >
        Create a room
      </button>
    </div>
  </div>
);

export const WorkspaceShell = () => {
  const { isActive: connected } = useSpacetimeDB();
  const { workspace, ready: wsReady } = useWorkspace();
  const { rooms, ready: roomsReady } = useLiveRooms();
  const onlineCounts = usePresenceCounts();
  const createRoom = useCreateRoom();
  const renameRoom = useRenameRoom();
  const deleteRoom = useDeleteRoom();
  const me = useMyProfile();
  const inviteId = useJoinByLink();
  const ready = connected && wsReady && roomsReady;

  const [openRoomIds, setOpenRoomIds] = useState<bigint[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<bigint | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const pendingSelect = useRef(false);

  const [showEntryFlow, setShowEntryFlow] = useState(false);
  const joinRoom = useJoinRoom();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const hasEntryParam =
      params.get("entry") === "1" || params.get("entry") === "true";
    const hasOnboarded = localStorage.getItem("nebula_onboarded") === "true";
    if (hasEntryParam || (!hasOnboarded && rooms.length === 0)) {
      setShowEntryFlow(true);
    }
  }, [rooms.length]);

  const handleSaveProfile = useCallback(
    (name: string, email: string) => {
      if (name.trim()) {
        me.rename(name.trim());
        localStorage.setItem("nebula_user_name", name.trim());
      }
      if (email.trim()) {
        localStorage.setItem("nebula_user_email", email.trim());
      }
    },
    [me]
  );

  const handleEntryCreateRoom = useCallback(() => {
    if (!workspace) {
      return;
    }
    pendingSelect.current = true;
    createRoom(workspace.workspaceId, `Room ${rooms.length + 1}`);
    setShowEntryFlow(false);
    localStorage.setItem("nebula_onboarded", "true");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("entry");
      window.history.replaceState({}, "", url.pathname + (url.search || ""));
    }
  }, [workspace, rooms.length, createRoom]);

  const handleEntryJoinRoom = useCallback(
    async (roomId: bigint): Promise<boolean> => {
      const ok = await joinRoom(roomId);
      if (!ok) {
        return false;
      }
      setOpenRoomIds((prev) =>
        prev.includes(roomId) ? prev : [...prev, roomId]
      );
      setActiveRoomId(roomId);
      setShowEntryFlow(false);
      localStorage.setItem("nebula_onboarded", "true");
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("entry");
        window.history.replaceState({}, "", url.pathname + (url.search || ""));
      }
      return true;
    },
    [joinRoom]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const activeRoom =
    activeRoomId === null
      ? undefined
      : rooms.find((r) => r.roomId === activeRoomId);

  // An invite link overrides the default: once ready, open and select
  // the shared room (and join it) instead of the first room.
  useEffect(() => {
    if (!ready || inviteId === null || activeRoom !== undefined) {
      return;
    }
    const invited = rooms.find((r) => r.roomId === inviteId);
    if (!invited) {
      return;
    }
    setOpenRoomIds((prev) =>
      prev.includes(invited.roomId) ? prev : [...prev, invited.roomId]
    );
    setActiveRoomId(invited.roomId);
  }, [ready, inviteId, rooms, activeRoom]);

  // Open the first room once the list loads. Also recovers when the
  // active id goes stale (e.g. the room was archived elsewhere).
  useEffect(() => {
    if (!ready || rooms.length === 0 || activeRoom !== undefined) {
      return;
    }
    const [first] = rooms;
    if (first) {
      setOpenRoomIds((prev) =>
        prev.includes(first.roomId) ? prev : [...prev, first.roomId]
      );
      setActiveRoomId(first.roomId);
    }
  }, [rooms, activeRoom, ready]);

  // Jump to a freshly created room once it arrives over the subscription.
  useEffect(() => {
    if (!pendingSelect.current || rooms.length === 0) {
      return;
    }
    pendingSelect.current = false;
    const [firstRoom] = rooms;
    let newest = firstRoom;
    for (const r of rooms) {
      if (!newest || r.roomId > newest.roomId) {
        newest = r;
      }
    }
    if (!newest) {
      return;
    }
    const id = newest.roomId;
    setOpenRoomIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setActiveRoomId(id);
  }, [rooms]);

  const select = useCallback((roomId: bigint) => {
    setOpenRoomIds((prev) =>
      prev.includes(roomId) ? prev : [...prev, roomId]
    );
    setActiveRoomId(roomId);
    setMobileNav(false);
  }, []);

  const handleCreate = useCallback(() => {
    if (!workspace) {
      return;
    }
    pendingSelect.current = true;
    createRoom(workspace.workspaceId, `Room ${rooms.length + 1}`);
  }, [workspace, rooms.length, createRoom]);

  const canvas = (() => {
    if (activeRoom) {
      return (
        <RoomView
          key={String(activeRoom.roomId)}
          roomId={activeRoom.roomId}
          ready={ready}
          onOpenNav={() => setMobileNav(true)}
        />
      );
    }
    // Before subscriptions deliver, show a skeleton — never the
    // "No rooms yet" empty state, which would flash on every refresh.
    if (!ready) {
      return <CanvasSkeleton />;
    }
    return <EmptyCanvas onCreate={handleCreate} />;
  })();

  return (
    <div className="bg-abyss text-ink flex h-dvh overflow-hidden">
      {/* desktop sidebar */}
      <div className="hidden shrink-0 md:flex">
        <Sidebar
          rooms={rooms}
          activeRoomId={activeRoomId ?? 0n}
          openRoomIds={openRoomIds}
          collapsed={collapsed}
          onlineCounts={onlineCounts}
          me={me}
          onSelect={select}
          onCreateRoom={handleCreate}
          onRenameMe={me.rename}
          onRenameRoom={renameRoom}
          onDeleteRoom={deleteRoom}
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
            activeRoomId={activeRoomId ?? 0n}
            openRoomIds={openRoomIds}
            collapsed={false}
            onlineCounts={onlineCounts}
            me={me}
            onSelect={select}
            onCreateRoom={handleCreate}
            onRenameMe={me.rename}
            onRenameRoom={renameRoom}
            onDeleteRoom={deleteRoom}
            onToggleCollapse={() => setCollapsed((c) => !c)}
            onCloseMobile={() => setMobileNav(false)}
          />
        </div>
      )}

      {/* main canvas */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <main className="bg-chat relative min-h-0 min-w-0 flex-1">
          {canvas}
        </main>
      </div>

      <EntryFlowModal
        isOpen={showEntryFlow}
        canClose={rooms.length > 0}
        onClose={() => {
          setShowEntryFlow(false);
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            url.searchParams.delete("entry");
            window.history.replaceState(
              {},
              "",
              url.pathname + (url.search || "")
            );
          }
        }}
        initialName={
          me.displayName.startsWith("…") || me.displayName.endsWith("…")
            ? ""
            : me.displayName
        }
        onSaveProfile={handleSaveProfile}
        onCreateRoom={handleEntryCreateRoom}
        onJoinRoom={handleEntryJoinRoom}
      />
    </div>
  );
};
