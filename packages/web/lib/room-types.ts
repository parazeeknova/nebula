import type { Identity } from "spacetimedb";

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
  unread?: boolean;
}

export interface Agent {
  agentId: bigint;
  workspaceId: bigint;
  name: string;
  handle: string;
  blurb: string;
  systemPrompt: string;
  tools: string[];
  modelProvider: string;
  modelName: string;
  presence: "active" | "idle" | "working";
  currentTool?: string;
  currentJobStatus?: number;
}

export interface RoomHuman {
  identity: Identity;
  displayName: string;
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
  kind: "thinking" | "typing" | "tool_start" | "tool_end" | "memory_used";
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

export interface ThreadView {
  thread: Thread;
  replyCount: number;
  lastAgentName?: string;
  streaming: boolean;
}

export interface AgentWorkJob {
  jobId: bigint;
  prompt: string;
  angle: string;
  status: number;
  taggedAgent?: bigint;
}

export interface AgentWork {
  agent: Agent;
  jobs: AgentWorkJob[];
  messages: ChatMessage[];
  status: "working" | "done" | "failed" | "idle";
  preview: string;
}

export interface MergeBanner {
  sessionId: bigint;
  roomId: bigint;
  status: number;
  angles: { label: string; state: string }[];
}

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
