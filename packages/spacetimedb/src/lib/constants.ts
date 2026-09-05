// Shared constants for the nebula module.
// Reducers must stay deterministic: timeouts are compared against
// ctx.timestamp, never wall-clock time or env vars.

/** ai_job.status codes. */
export const JOB_STATUS = {
  CANCELLED: 4,
  DONE: 2,
  FAILED: 3,
  QUEUED: 0,
  RUNNING: 1,
} as const;

/** tool_call.status codes. */
export const TOOL_STATUS = {
  CANCELLED: 4,
  DONE: 2,
  FAILED: 3,
  PENDING: 0,
  RUNNING: 1,
} as const;

/** thread.status codes. */
export const THREAD_STATUS = {
  CLOSED: 3,
  MERGED: 2,
  OPEN: 0,
  STREAMING: 1,
} as const;

/** message.role codes. */
export const MESSAGE_ROLE = {
  AGENT: 1,
  SYNTHESIS: 2,
  SYSTEM: 3,
  USER: 0,
} as const;

/** room.status codes. */
export const ROOM_STATUS = {
  ACTIVE: 0,
  ARCHIVED: 1,
} as const;

/** merge_session.status codes. */
export const MERGE_STATUS = {
  DETECTED: 0,
  MERGED: 2,
  STREAMING: 1,
} as const;

/** exploration.status codes. */
export const EXPLORATION_STATUS = {
  DONE: 2,
  FAILED: 3,
  RUNNING: 1,
} as const;

/** stream_event.kind values the worker emits. */
export const STREAM_KINDS = [
  "thinking",
  "typing",
  "tool_start",
  "tool_end",
  "memory_used",
] as const;

// ── watchdog ──

/** A running job older than this is declared dead by the watchdog. */
export const JOB_RUN_TIMEOUT_MICROS = 900_000_000n;

/** How often the scheduled watchdog sweep runs. */
export const WATCHDOG_INTERVAL_MICROS = 60_000_000n;

// ── field length caps (single source of truth for every .slice() below) ──

export const LIMITS = {
  AGENT_TOOLS_MAX: 16,
  ANGLE: 512,
  BODY: 8000,
  CHUNK_DELTA: 4000,
  DISPLAY_NAME: 48,
  ERROR: 500,
  EVENT_PAYLOAD: 2000,
  MEMORY_BACKEND: 64,
  MEMORY_NAMESPACE: 256,
  MEMORY_SUMMARY: 2000,
  MENTIONS_MAX: 8,
  MODEL: 128,
  MODEL_PROVIDER: 64,
  PROMPT: 8000,
  ROOM_NAME: 200,
  SYSTEM_PROMPT: 8000,
  THINKING_PAYLOAD: 200,
  TITLE: 200,
  TOOL_INPUT: 8000,
  TOOL_NAME: 128,
  TOOL_OUTPUT: 8000,
  TOPIC: 2000,
  WORKER_LABEL: 128,
} as const;

export const DEFAULT_THINKING_TEXT = "Thinking…";
export const STOPPED_MESSAGE_TEXT = "Stopped by user.";
export const TIMEOUT_MESSAGE_TEXT =
  "Request timed out — the watchdog stopped it.";
