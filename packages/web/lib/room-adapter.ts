/**
 * Mock-first data source shaped like the revised spec.
 *
 * Future live swap (no component changes):
 *  - Canvas:  room.where(r => r.workspaceId.eq(ws)) + latest workspace_snapshot + room_presence counts
 *  - Room:    thread.where(t => t.roomId.eq(room))
 *  - Live:    message.where(m => m.threadId.eq(t)) + message_chunk.where(c => c.messageId.eq(m)) + stream_event.onInsert
 *  - Merge:   merge_session.where(s => s.roomId.eq(room)) + merge_link + exploration
 *  - Reducers (all void): start_thread({room_id,title,prompt,tagged_agent?,angle}),
 *    post_message({thread_id,body,mentions}), heartbeat({room_id}), join_room/leave_room
 */

import type { Identity } from "spacetimedb";

import {
  ME_HEX,
  ME_IDENTITY,
  MOCK_ROOMS,
  agentsFor,
  humansFor,
  messagesFor,
  threadFor,
} from "./room-mocks";
import type { Agent, ChatMessage, Room, RoomHuman, Thread } from "./room-types";

export interface SendInput {
  roomId: bigint;
  threadId: bigint;
  body: string;
  mentions: bigint[];
  author?: Identity;
  authorName?: string;
}

export interface RoomDataSource {
  myHex: () => string;
  myIdentity: () => Identity;
  listRooms: () => Room[];
  getRoom: (roomId: bigint) => Room | undefined;
  getThread: (roomId: bigint) => Thread;
  getMessages: (roomId: bigint) => ChatMessage[];
  getHumans: (roomId: bigint) => RoomHuman[];
  getAgents: (roomId: bigint) => Agent[];
  onlineCount: (roomId: bigint) => number;
  sendMessage: (input: SendInput) => ChatMessage;
  heartbeat: (roomId: bigint) => void;
  joinRoom: (roomId: bigint) => void;
}

let seq = 90_000n;
const joinedRoomIds = new Set<string>();

export const mockSource: RoomDataSource = {
  getAgents: (roomId) => agentsFor(roomId),
  getHumans: (roomId) => humansFor(roomId),
  getMessages: (roomId) => messagesFor(roomId),
  getRoom: (roomId) => MOCK_ROOMS.find((r) => r.roomId === roomId),
  getThread: (roomId) => threadFor(roomId),
  heartbeat: (roomId) => {
    joinedRoomIds.add(String(roomId));
  },
  joinRoom: (roomId) => {
    joinedRoomIds.add(String(roomId));
  },
  listRooms: () => MOCK_ROOMS,
  myHex: () => ME_HEX,
  myIdentity: () => ME_IDENTITY,
  onlineCount: (roomId) => humansFor(roomId).filter((h) => h.isOnline).length,
  sendMessage: (input) => {
    seq += 1n;
    return {
      author: input.author ?? ME_IDENTITY,
      authorAgent: null,
      authorColor: "#5865f2",
      authorHex: ME_HEX,
      authorName: input.authorName ?? "Ava Chen",
      body: input.body,
      chunks: [],
      createdAt: "Today at now",
      jobStatus: undefined,
      mentions: input.mentions,
      messageId: seq,
      role: 0,
      roomId: input.roomId,
      streaming: false,
      threadId: input.threadId,
      ticks: undefined,
      toolCall: undefined,
    };
  },
};

export const partitionAgents = (
  agents: Agent[]
): {
  working: Agent[];
  idle: Agent[];
} => ({
  idle: agents.filter((a) => a.presence !== "working"),
  working: agents.filter((a) => a.presence === "working"),
});
