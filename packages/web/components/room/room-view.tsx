"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSpacetimeDB } from "spacetimedb/react";

import {
  useDeleteRoom,
  useMarkRoomRead,
  useMyProfile,
  useRenameRoom,
  useRoomData,
  useRoomPresence,
  useSendMessage,
  useStreamTicks,
  useTypingNotifier,
  useVoiceNotifier,
} from "@/lib/live";
import type { Agent, RoomHuman } from "@/lib/room-types";

import { XIcon } from "../icons";
import { Composer } from "./composer";
import { DeleteRoomModal } from "./delete-room-modal";
import { MembersPanel } from "./members-panel";
import { MergeBanner } from "./merge-banner";
import { MessageList } from "./message-list";
import { ChatSkeleton, PeopleSkeleton } from "./placeholders";
import { RoomHeader } from "./room-header";
import { ShareModal } from "./share-modal";
import { ThreadPane } from "./thread-pane";

const MIN_THREAD_WIDTH = 340;
const MIN_MAINFRAME_WIDTH = 380;
const DEFAULT_THREAD_WIDTH = 420;

const BusyNoticeBanner = ({
  notice,
  onOpenThread,
  onDismiss,
}: {
  notice: { message: string; threadId?: bigint } | null;
  onOpenThread: (threadId: bigint) => void;
  onDismiss: () => void;
}) => {
  if (!notice) {
    return null;
  }
  return (
    <div className="border-gold/30 bg-gold/10 text-gold mx-4 mb-2 flex items-center justify-between border px-3 py-2 text-[12.5px]">
      <div className="flex items-center gap-2">
        <span aria-hidden>⚠️</span>
        <span>{notice.message}</span>
      </div>
      <div className="flex items-center gap-3">
        {notice.threadId ? (
          <button
            onClick={() => {
              if (notice.threadId) {
                onOpenThread(notice.threadId);
              }
            }}
            className="cursor-pointer font-semibold underline hover:text-white"
          >
            Open thread →
          </button>
        ) : null}
        <button
          onClick={onDismiss}
          className="text-gold/60 hover:text-gold cursor-pointer text-xs"
          aria-label="Dismiss notice"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

const MobileMembersDrawer = ({
  open,
  onClose,
  shown,
  agents,
  humans,
}: {
  open: boolean;
  onClose: () => void;
  shown: boolean;
  agents: Agent[];
  humans: RoomHuman[];
}) => {
  if (!open) {
    return null;
  }
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Members and agents"
        className="bg-panel-2 shadow-pop absolute inset-y-0 right-0 flex h-full w-72 max-w-[85vw] flex-col border-l border-white/10"
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.06] px-4 backdrop-blur">
          <span className="font-display text-[14px] font-bold text-white">
            Members & Agents
          </span>
          <button
            onClick={onClose}
            className="text-ink-dim hover:text-ink p-1.5 transition hover:bg-white/5"
            aria-label="Close members panel"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {shown ? (
            <MembersPanel
              agents={agents}
              humans={humans}
              className="h-full w-full border-l-0"
            />
          ) : (
            <PeopleSkeleton className="h-full w-full border-l-0" />
          )}
        </div>
      </div>
    </div>
  );
};

const DesktopMembersSidebar = ({
  open,
  activeThreadId,
  shown,
  agents,
  humans,
}: {
  open: boolean;
  activeThreadId: bigint | null;
  shown: boolean;
  agents: Agent[];
  humans: RoomHuman[];
}) => {
  if (!open) {
    return null;
  }
  return (
    <div
      className={`${
        activeThreadId === null ? "hidden lg:flex" : "hidden xl:flex"
      } h-full shrink-0`}
    >
      {shown ? (
        <MembersPanel agents={agents} humans={humans} />
      ) : (
        <PeopleSkeleton />
      )}
    </div>
  );
};

export const RoomView = ({
  roomId,
  ready,
  onOpenNav,
}: {
  roomId: bigint;
  ready: boolean;
  onOpenNav: () => void;
}) => {
  const { isActive: connected } = useSpacetimeDB();
  const ticks = useStreamTicks();
  const data = useRoomData(roomId, ticks);
  const me = useMyProfile();
  const renameRoom = useRenameRoom();
  const deleteRoom = useDeleteRoom();

  const { startTyping, stopTyping } = useTypingNotifier(
    roomId,
    me.identityHex,
    me.displayName
  );
  const { setSpeaking } = useVoiceNotifier(roomId, me.identityHex);
  const { send, armNewThread, newThreadArmed, busyNotice, clearBusyNotice } =
    useSendMessage(roomId, data.generalThread, data.agents, data.jobs);
  useRoomPresence(roomId, connected && ready);
  useMarkRoomRead(roomId, connected && ready, data.ready);

  const [activeThreadId, setActiveThreadId] = useState<bigint | null>(null);
  const [membersOpen, setMembersOpen] = useState(true);
  const [mobileMembersOpen, setMobileMembersOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    setMobileMembersOpen(false);
  }, [roomId]);

  useEffect(() => {
    if (!mobileMembersOpen) {
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMembersOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMembersOpen]);

  const handleToggleMembers = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileMembersOpen((v) => !v);
    } else {
      setMembersOpen((v) => !v);
    }
  };

  const [threadWidth, setThreadWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("nebula_thread_width");
      if (saved) {
        const parsed = Math.trunc(Number(saved));
        if (!Number.isNaN(parsed) && parsed >= MIN_THREAD_WIDTH) {
          return parsed;
        }
      }
    }
    return DEFAULT_THREAD_WIDTH;
  });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ startX: number; startWidth: number } | null>(
    null
  );

  useEffect(() => {
    if (isDragging) {
      const prevCursor = document.body.style.cursor;
      const prevUserSelect = document.body.style.userSelect;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      return () => {
        document.body.style.cursor = prevCursor;
        document.body.style.userSelect = prevUserSelect;
      };
    }
  }, [isDragging]);

  const handleResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    dragStartRef.current = { startWidth: threadWidth, startX: e.clientX };
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) {
      return;
    }
    const containerWidth =
      containerRef.current?.getBoundingClientRect().width ?? window.innerWidth;
    const isMembersVisible = membersOpen && window.innerWidth >= 1280;
    const membersWidth = isMembersVisible ? 240 : 0;
    const maxAllowed = Math.max(
      MIN_THREAD_WIDTH,
      containerWidth - MIN_MAINFRAME_WIDTH - membersWidth
    );
    const deltaX = dragStartRef.current.startX - e.clientX;
    const rawWidth = dragStartRef.current.startWidth + deltaX;
    const clamped = Math.min(Math.max(rawWidth, MIN_THREAD_WIDTH), maxAllowed);
    setThreadWidth(clamped);
  };

  const handleResizeEnd = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      dragStartRef.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* empty */
      }
      localStorage.setItem("nebula_thread_width", String(threadWidth));
    }
  };

  const handleResizeKeyDown = (e: React.KeyboardEvent) => {
    const containerWidth =
      containerRef.current?.getBoundingClientRect().width ?? window.innerWidth;
    const isMembersVisible = membersOpen && window.innerWidth >= 1280;
    const membersWidth = isMembersVisible ? 240 : 0;
    const maxAllowed = Math.max(
      MIN_THREAD_WIDTH,
      containerWidth - MIN_MAINFRAME_WIDTH - membersWidth
    );
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setThreadWidth((w) => {
        const next = Math.min(w + 20, maxAllowed);
        localStorage.setItem("nebula_thread_width", String(next));
        return next;
      });
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setThreadWidth((w) => {
        const next = Math.max(w - 20, MIN_THREAD_WIDTH);
        localStorage.setItem("nebula_thread_width", String(next));
        return next;
      });
    }
  };

  const prevThreadCount = useRef(data.threads.length);
  useEffect(() => {
    if (data.threads.length > prevThreadCount.current) {
      const [newest] = data.threads;
      if (
        newest &&
        newest.title !== "General" &&
        newest.title !== data.room?.name
      ) {
        setActiveThreadId(newest.threadId);
      }
    }
    prevThreadCount.current = data.threads.length;
  }, [data.threads, data.room?.name]);

  // Show skeleton placeholders until the subscription is live —
  // with a fallback timeout so a dead backend never traps the UI.
  useEffect(() => {
    if (ready) {
      setFallback(true);
      return;
    }
    const t = setTimeout(() => setFallback(true), 2500);
    return () => {
      clearTimeout(t);
    };
  }, [ready]);

  const shown = ready || fallback;
  const { room } = data;

  if (!room) {
    if (!shown) {
      return (
        <div className="flex h-full min-h-0">
          <div className="flex min-w-0 flex-1 flex-col">
            <ChatSkeleton roomName="Room" />
          </div>
        </div>
      );
    }
    return null;
  }

  const typingNames = data.humans
    .filter(
      (h) => h.isTyping && h.hex !== me.identityHex && h.roleLabel !== "you"
    )
    .map((h) => h.displayName.split(" ")[0] ?? h.displayName);
  const [activeMerge] = data.merges;

  return (
    <div
      ref={containerRef}
      className="relative flex h-full min-h-0 w-full overflow-hidden"
    >
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden md:min-w-[380px]">
        <RoomHeader
          name={room.name}
          topic={room.topic}
          membersOpen={membersOpen}
          mobileMembersOpen={mobileMembersOpen}
          newThreadArmed={newThreadArmed}
          onToggleMembers={handleToggleMembers}
          onNewThread={armNewThread}
          onShare={() => setShareOpen(true)}
          onOpenNav={onOpenNav}
          onRename={(newName) => renameRoom(room.roomId, newName)}
          onDelete={() => setDeleteOpen(true)}
        />

        {activeMerge && shown && (
          <MergeBanner roomName={room.name} angles={activeMerge.angles} />
        )}

        {shown ? (
          <MessageList
            messages={data.messages}
            threads={data.threads}
            agents={data.agents}
            roomName={room.name}
            threadSummaries={data.threadSummaries}
            firstUnreadId={data.firstUnreadId}
            onOpenThread={(id) => {
              setActiveThreadId(id);
              setMobileMembersOpen(false);
            }}
          />
        ) : (
          <ChatSkeleton roomName={room.name} />
        )}

        <BusyNoticeBanner
          notice={busyNotice}
          onOpenThread={setActiveThreadId}
          onDismiss={clearBusyNotice}
        />

        <Composer
          agents={data.agents}
          humans={data.humans}
          typingNames={typingNames}
          connected={connected}
          variant="room"
          onSend={send}
          onTyping={startTyping}
          onStopTyping={stopTyping}
          onVoiceChange={(recording) => setSpeaking(recording)}
        />
      </div>

      {activeThreadId !== null && (
        <>
          {/* Desktop resize separator handle */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize thread window"
            aria-valuenow={threadWidth}
            aria-valuemin={MIN_THREAD_WIDTH}
            tabIndex={0}
            onPointerDown={handleResizeStart}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
            onKeyDown={handleResizeKeyDown}
            className={`group relative z-30 hidden w-2 shrink-0 cursor-col-resize items-center justify-center transition-colors outline-none select-none lg:flex ${
              isDragging
                ? "bg-blurple/30"
                : "hover:bg-blurple/20 focus-visible:bg-blurple/30"
            }`}
            title="Drag to resize thread window (or use arrow keys)"
          >
            <div className="absolute inset-y-0 -right-1.5 -left-1.5 cursor-col-resize" />
            <div
              className={`h-8 w-1 rounded-full transition-colors ${
                isDragging
                  ? "bg-blurple"
                  : "bg-white/20 group-hover:bg-white/60 group-focus-visible:bg-white/60"
              }`}
            />
          </div>

          {/* mobile backdrop overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
            onClick={() => setActiveThreadId(null)}
          />
          <div
            style={
              {
                "--thread-w": `${threadWidth}px`,
              } as React.CSSProperties
            }
            className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-white/[0.06] bg-[#07080a] shadow-2xl lg:relative lg:inset-auto lg:z-auto lg:w-[var(--thread-w)] lg:shrink-0 lg:shadow-none"
          >
            <ThreadPane
              threadId={activeThreadId}
              roomId={roomId}
              agents={data.agents}
              humans={data.humans}
              onTyping={startTyping}
              onStopTyping={stopTyping}
              onVoiceChange={(recording) => setSpeaking(recording)}
              onClose={() => setActiveThreadId(null)}
            />
          </div>
        </>
      )}

      <MobileMembersDrawer
        open={mobileMembersOpen}
        onClose={() => setMobileMembersOpen(false)}
        shown={shown}
        agents={data.agents}
        humans={data.humans}
      />

      <DesktopMembersSidebar
        open={membersOpen}
        activeThreadId={activeThreadId}
        shown={shown}
        agents={data.agents}
        humans={data.humans}
      />

      {shareOpen && (
        <ShareModal
          roomId={room.roomId}
          roomName={room.name}
          onClose={() => setShareOpen(false)}
        />
      )}

      {deleteOpen &&
        createPortal(
          <DeleteRoomModal
            isOpen={true}
            roomName={room.name}
            onClose={() => setDeleteOpen(false)}
            onConfirm={() => {
              void deleteRoom(room.roomId);
              setDeleteOpen(false);
            }}
          />,
          document.body
        )}
    </div>
  );
};
