"use client";

import { useEffect, useRef, useState } from "react";
import { useSpacetimeDB } from "spacetimedb/react";

import {
  useRoomData,
  useRoomPresence,
  useSendMessage,
  useStreamTicks,
} from "@/lib/live";

import { Composer } from "./composer";
import { MembersPanel } from "./members-panel";
import { MergeBanner } from "./merge-banner";
import { MessageList } from "./message-list";
import { ChatSkeleton, PeopleSkeleton } from "./placeholders";
import { RoomHeader } from "./room-header";
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
  const { send, armNewThread, newThreadArmed } = useSendMessage(
    roomId,
    data.thread
  );
  useRoomPresence(roomId, connected && ready);

  const [activeThreadId, setActiveThreadId] = useState<bigint | null>(null);
  const [membersOpen, setMembersOpen] = useState(true);
  const [fallback, setFallback] = useState(false);

  const prevThreadCount = useRef(data.threads.length);
  useEffect(() => {
    if (data.threads.length > prevThreadCount.current) {
      const [newest] = data.threads;
      if (newest) {
        setActiveThreadId(newest.threadId);
      }
    }
    prevThreadCount.current = data.threads.length;
  }, [data.threads]);

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
    .filter((h) => h.isTyping)
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
          onOpenNav={onOpenNav}
        />

        {activeMerge && shown && (
          <MergeBanner roomName={room.name} angles={activeMerge.angles} />
        )}

        {shown ? (
          <MessageList
            messages={data.messages}
            agents={data.agents}
            roomName={room.name}
            threadSummaries={data.threadSummaries}
            onOpenThread={(id) => setActiveThreadId(id)}
          />
        ) : (
          <ChatSkeleton roomName={room.name} />
        )}

        <Composer
          agents={data.agents}
          humans={data.humans}
          typingNames={typingNames}
          connected={connected}
          variant="room"
          onSend={send}
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
            <MembersPanel
              agents={data.agents}
              humans={data.humans}
              memory={data.memory}
            />
          ) : (
            <PeopleSkeleton />
          )}
        </div>
      )}
    </div>
  );
};
