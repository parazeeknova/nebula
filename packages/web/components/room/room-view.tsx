"use client";

import { useEffect, useState } from "react";
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

  const [membersOpen, setMembersOpen] = useState(true);
  const [fallback, setFallback] = useState(false);

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
          />
        ) : (
          <ChatSkeleton roomName={room.name} />
        )}

        <Composer
          agents={data.agents}
          humans={data.humans}
          typingNames={typingNames}
          connected={connected}
          onSend={send}
        />
      </div>

      <div className={`${membersOpen ? "max-lg:hidden" : "hidden"} shrink-0`}>
        <div className="h-full">
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
      </div>
    </div>
  );
};
