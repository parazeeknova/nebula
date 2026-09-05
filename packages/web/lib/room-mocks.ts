import { Identity } from "spacetimedb";

import type { Agent, ChatMessage, Room, RoomHuman, Thread } from "./room-types";

/**
 * Placeholder data source — intentionally empty in the committed tree.
 * Populated locally with mock rooms/agents/messages during development.
 * Swap the implementation in `room-adapter.ts` when the SpacetimeDB
 * tables and bindings land (see the revised specsheet).
 */

export const MOCK_WORKSPACE_ID = 1n;

export const MOCK_ROOMS: Room[] = [];

export const MOCK_AGENTS: Agent[] = [];

export const MOCK_HUMANS: RoomHuman[] = [];

export const ME_HEX = "";
export const ME_IDENTITY = Identity.zero();

export const MOCK_THREADS: Thread[] = [];

export const MOCK_MESSAGES: Record<string, ChatMessage[]> = {};

export const messagesFor = (_roomId: bigint): ChatMessage[] => [];

export const threadFor = (roomId: bigint): Thread => ({
  roomId,
  status: 0,
  threadId: roomId * 100n + 1n,
  title: "main thread",
});

export const humansFor = (_roomId: bigint): RoomHuman[] => [];
export const agentsFor = (_roomId: bigint): Agent[] => [];
