import type { Identity } from "spacetimedb";

/**
 * Revised SPECSHEET.MD shapes — camelCase client mapping of
 * snake_case server tables. Mocks implement these exactly so the
 * future swap to `useTable` needs no component changes.
 *
 * Server → client examples:
 *   room_id → roomId, workspace_id → workspaceId,
 *   author_agent → authorAgent, message_id → messageId
 */

export const RoomStatus = { Active: 0, Archived: 1 } as const;
export const ThreadStatus = {
  Closed: 3,
  Merged: 2,
  Open: 0,
  Streaming: 1,
} as const;
export const Role = { Agent: 1, Synthesis: 2, System: 3, User: 0 } as const;
export const JobStatus = {
  Done: 2,
  Failed: 3,
  Queued: 0,
  Running: 1,
} as const;
export const ToolStatus = {
  Done: 2,
  Failed: 3,
  Pending: 0,
  Running: 1,
} as const;
export const MergeStatus = {
  Detected: 0,
  Merged: 2,
  Streaming: 1,
} as const;

export type MemoryBackend = "honcho" | "hindsight";

export interface Room {
  roomId: bigint;
  workspaceId: bigint;
  name: string;
  topic: string;
  canvasX: number;
  canvasY: number;
  memoryBackend: MemoryBackend;
  memoryNamespace: string;
  status: number;
  /** UI-only: unread marker for tabs/sidebar */
  unread?: boolean;
}

export interface Agent {
  agentId: bigint;
  workspaceId: bigint;
  name: string;
  /** short handle shown in @mentions, e.g. "researcher" */
  handle: string;
  blurb: string;
  systemPrompt: string;
  tools: string[];
  modelProvider: string;
  modelName: string;
  /** derived presence for UI */
  presence: "active" | "idle" | "working";
  currentTool?: string;
  currentJobStatus?: number;
}

export interface RoomHuman {
  identity: Identity;
  displayName: string;
  /** hex for quick compare without constructing */
  hex: string;
  color: string;
  isOnline: boolean;
  lastSeenMins: number;
  isTyping?: boolean;
  roleLabel?: string;
}

export interface MessageChunk {
  idx: number;
  delta: string;
}

export interface StreamTick {
  kind: "thinking" | "typing" | "tool_start" | "tool_end";
  payload: string;
}

export interface ToolCallInfo {
  tool: string;
  status: number;
  input?: string;
  output?: string;
}

export interface ChatMessage {
  messageId: bigint;
  threadId: bigint;
  roomId: bigint;
  author: Identity;
  authorHex: string;
  authorName: string;
  authorColor: string;
  /** null = human author */
  authorAgent: bigint | null;
  body: string;
  role: number;
  streaming: boolean;
  mentions: bigint[];
  createdAt: string;
  chunks: MessageChunk[];
  ticks?: StreamTick[];
  toolCall?: ToolCallInfo;
  jobStatus?: number;
}

export interface Thread {
  threadId: bigint;
  roomId: bigint;
  title: string;
  status: number;
}

export interface MergeBanner {
  sessionId: bigint;
  roomId: bigint;
  status: number;
  angles: { label: string; state: string }[];
}

/** Full assembled text: final body + ordered chunk deltas */
export const fullText = (m: ChatMessage): string => {
  if (m.chunks.length === 0) {
    return m.body;
  }
  const deltas = m.chunks.toSorted((a, b) => a.idx - b.idx).map((c) => c.delta);
  return `${m.body}${deltas.join("")}`;
};

export const hexOf = (id: Identity): string => {
  try {
    return id.toHexString();
  } catch {
    return String(id);
  }
};
