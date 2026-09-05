"use client";

import { useEffect, useMemo, useState } from "react";
import { useSpacetimeDB } from "spacetimedb/react";

import { mockSource } from "@/lib/room-adapter";
import type { ChatMessage } from "@/lib/room-types";

import { Composer } from "./composer";
import { MembersPanel } from "./members-panel";
import { MergeBanner } from "./merge-banner";
import { MessageList } from "./message-list";
import { ChatSkeleton, PeopleSkeleton } from "./placeholders";
import { RoomHeader } from "./room-header";

export const RoomView = ({
  roomId,
  onOpenNav,
}: {
  roomId: bigint;
  onOpenNav: () => void;
}) => {
  const { isActive: connected } = useSpacetimeDB();
  const room = mockSource.getRoom(roomId);
  const thread = mockSource.getThread(roomId);

  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    mockSource.getMessages(roomId)
  );
  const [membersOpen, setMembersOpen] = useState(true);
  const [ready, setReady] = useState(false);

  // Show skeleton placeholders until the connection is live —
  // with a fallback timeout so a dead backend never traps the UI.
  useEffect(() => {
    if (connected) {
      setReady(true);
      return;
    }
    const t = setTimeout(() => setReady(true), 2500);
    return () => clearTimeout(t);
  }, [connected]);

  const agents = useMemo(() => mockSource.getAgents(roomId), [roomId]);
  const humans = useMemo(() => mockSource.getHumans(roomId), [roomId]);

  if (!room) {
    return null;
  }

  const typingNames = humans
    .filter((h) => h.isTyping)
    .map((h) => h.displayName.split(" ")[0] ?? h.displayName);
  const hasStreaming = messages.some((m) => m.streaming);

  const send = (body: string, mentions: bigint[]) => {
    const msg = mockSource.sendMessage({
      body,
      mentions,
      roomId,
      threadId: thread.threadId,
    });
    setMessages((prev) => [...prev, msg]);
  };

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <RoomHeader
          name={room.name}
          topic={room.topic}
          membersOpen={membersOpen}
          onToggleMembers={() => setMembersOpen((v) => !v)}
          onOpenNav={onOpenNav}
        />

        {hasStreaming && ready && <MergeBanner roomName={room.name} />}

        {ready ? (
          <MessageList
            messages={messages}
            agents={agents}
            roomName={room.name}
          />
        ) : (
          <ChatSkeleton roomName={room.name} />
        )}

        <Composer
          agents={agents}
          humans={humans}
          typingNames={typingNames}
          connected={connected}
          onSend={send}
        />
      </div>

      <div className={`${membersOpen ? "max-lg:hidden" : "hidden"} shrink-0`}>
        <div className="h-full">
          {ready ? (
            <MembersPanel agents={agents} humans={humans} />
          ) : (
            <PeopleSkeleton />
          )}
        </div>
      </div>
    </div>
  );
};
