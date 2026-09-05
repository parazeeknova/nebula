"use client";

import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { useTable } from "spacetimedb/react";

import { tables } from "../src/module_bindings";
import type {
  Agent as AgentRow,
  AppUser,
  Exploration,
  MessageAttachment,
  MessageChunk,
  Room as RoomRow,
  RoomMemoryEntry,
  RoomPresence,
  RoomReadState,
  RoomUserStatus,
  ToolCall,
} from "../src/module_bindings/types";

/**
 * Shared, once-per-app subscriptions to the "global" tables. Every
 * consumer (RoomView, ThreadPane, profile, memory, sidebar) reads the
 * same rows from context instead of each calling `useTable(...)`, which
 * would create a fresh subscription (and full-table scan) per mount.
 *
 * Per-room tables (thread, message, ai_job, merge sessions, room_human,
 * room_agent) stay room-scoped in RoomView, which owns one room at a time.
 */
export interface SharedRows {
  agents: readonly AgentRow[];
  attachments: readonly MessageAttachment[];
  chunks: readonly MessageChunk[];
  explorations: readonly Exploration[];
  memories: readonly RoomMemoryEntry[];
  presences: readonly RoomPresence[];
  rooms: readonly RoomRow[];
  roomReadStates: readonly RoomReadState[];
  roomUserStatus: readonly RoomUserStatus[];
  toolCalls: readonly ToolCall[];
  users: readonly AppUser[];
}

const SharedTablesContext = createContext<SharedRows | null>(null);

export const SharedTablesProvider = ({ children }: { children: ReactNode }) => {
  const [agents] = useTable(tables.agent);
  const [attachments] = useTable(tables.message_attachment);
  const [chunks] = useTable(tables.message_chunk);
  const [explorations] = useTable(tables.exploration);
  const [memories] = useTable(tables.room_memory_entry);
  const [presences] = useTable(tables.room_presence);
  const [roomReadStates] = useTable(tables.room_read_state);
  const [rooms] = useTable(tables.room);
  const [roomUserStatus] = useTable(tables.room_user_status);
  const [toolCalls] = useTable(tables.tool_call);
  const [users] = useTable(tables.app_user);

  const value = useMemo<SharedRows>(
    () => ({
      agents,
      attachments,
      chunks,
      explorations,
      memories,
      presences,
      roomReadStates,
      roomUserStatus,
      rooms,
      toolCalls,
      users,
    }),
    [
      agents,
      attachments,
      chunks,
      explorations,
      memories,
      presences,
      roomReadStates,
      roomUserStatus,
      rooms,
      toolCalls,
      users,
    ]
  );

  return (
    <SharedTablesContext.Provider value={value}>
      {children}
    </SharedTablesContext.Provider>
  );
};

export const useSharedTables = (): SharedRows => {
  const rows = useContext(SharedTablesContext);
  if (rows === null) {
    throw new Error(
      "useSharedTables must be used within a SharedTablesProvider"
    );
  }
  return rows;
};
