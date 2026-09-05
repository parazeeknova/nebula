"use client";

import { useEffect, useRef, useState } from "react";
import { useSpacetimeDB } from "spacetimedb/react";

import {
  useMyProfile,
  useRenameRoom,
  useRoomData,
  useRoomPresence,
  useSendMessage,
  useStreamTicks,
  useTypingNotifier,
} from "@/lib/live";

import { Composer } from "./composer";
import { DeleteRoomModal } from "./delete-room-modal";
import { MembersPanel } from "./members-panel";
import { MergeBanner } from "./merge-banner";
import { MessageList } from "./message-list";
import { ChatSkeleton, PeopleSkeleton } from "./placeholders";
import { RenameRoomModal } from "./rename-room-modal";
import { RoomHeader } from "./room-header";
import { ShareModal } from "./share-modal";
import { ThreadPane } from "./thread-pane";

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

  const { startTyping, stopTyping } = useTypingNotifier(
    roomId,
    me.identityHex,
    me.displayName
  );
  const { send, armNewThread, newThreadArmed, busyNotice, clearBusyNotice } =
    useSendMessage(roomId, data.generalThread, data.agents, data.jobs);
  useRoomPresence(roomId, connected && ready);

  const [activeThreadId, setActiveThreadId] = useState<bigint | null>(null);
  const [membersOpen, setMembersOpen] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [fallback, setFallback] = useState(false);

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
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <RoomHeader
          name={room.name}
          topic={room.topic}
          membersOpen={membersOpen}
          newThreadArmed={newThreadArmed}
          onToggleMembers={() => setMembersOpen((v) => !v)}
          onNewThread={armNewThread}
          onShare={() => setShareOpen(true)}
          onOpenNav={onOpenNav}
          onRename={() => setRenameOpen(true)}
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
            onOpenThread={(id) => setActiveThreadId(id)}
          />
        ) : (
          <ChatSkeleton roomName={room.name} />
        )}

        {busyNotice && (
          <div className="border-gold/30 bg-gold/10 text-gold mx-4 mb-2 flex items-center justify-between border px-3 py-2 text-[12.5px]">
            <div className="flex items-center gap-2">
              <span aria-hidden>⚠️</span>
              <span>{busyNotice.message}</span>
            </div>
            <div className="flex items-center gap-3">
              {busyNotice.threadId ? (
                <button
                  onClick={() => {
                    setActiveThreadId(busyNotice.threadId ?? null);
                    clearBusyNotice();
                  }}
                  className="cursor-pointer font-semibold underline hover:text-white"
                >
                  Open thread →
                </button>
              ) : null}
              <button
                onClick={clearBusyNotice}
                className="text-gold/60 hover:text-gold cursor-pointer text-xs"
                aria-label="Dismiss notice"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <Composer
          agents={data.agents}
          humans={data.humans}
          typingNames={typingNames}
          connected={connected}
          variant="room"
          onSend={send}
          onTyping={startTyping}
          onStopTyping={stopTyping}
        />
      </div>

      {activeThreadId !== null && (
        <>
          {/* mobile backdrop overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
            onClick={() => setActiveThreadId(null)}
          />
          <div className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-white/[0.06] bg-[#07080a] shadow-2xl lg:relative lg:inset-auto lg:z-auto lg:w-[390px] lg:shrink-0 lg:shadow-none">
            <ThreadPane
              threadId={activeThreadId}
              roomId={roomId}
              agents={data.agents}
              humans={data.humans}
              onTyping={startTyping}
              onStopTyping={stopTyping}
              onClose={() => setActiveThreadId(null)}
            />
          </div>
        </>
      )}

      {membersOpen && (
        <div
          className={`${
            activeThreadId === null ? "hidden lg:flex" : "hidden xl:flex"
          } h-full shrink-0`}
        >
          {shown ? (
            <MembersPanel agents={data.agents} humans={data.humans} />
          ) : (
            <PeopleSkeleton />
          )}
        </div>
      )}

      {shareOpen && (
        <ShareModal
          roomId={room.roomId}
          roomName={room.name}
          onClose={() => setShareOpen(false)}
        />
      )}

      <RenameRoomModal
        initialName={room.name}
        isOpen={renameOpen}
        onClose={() => setRenameOpen(false)}
        onRename={(newName) => renameRoom(room.roomId, newName)}
      />

      <DeleteRoomModal
        isOpen={deleteOpen}
        roomName={room.name}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          /* empty */
        }}
      />
    </div>
  );
};
