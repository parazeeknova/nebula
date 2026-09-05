// Pure watchdog decisions: which rows count as stuck.
// Runs in reducers AND in bun tests — no ctx, no side effects. All times are
// unix micros as bigint so the logic stays testable without Timestamp.

import {
  JOB_RUN_TIMEOUT_MICROS,
  JOB_STATUS,
  MESSAGE_ROLE,
  THREAD_STATUS,
  TOOL_STATUS,
} from "./constants";

export interface WatchdogJob {
  jobId: bigint;
  threadId: bigint;
  status: number;
  /** claimed_at when set, else created_at. */
  startedAtMicros: bigint;
}

export interface WatchdogTool {
  callId: bigint;
  jobId: bigint;
  status: number;
  createdAtMicros: bigint;
}

export interface WatchdogMessage {
  messageId: bigint;
  threadId: bigint;
  role: number;
  streaming: boolean;
}

export interface WatchdogThread {
  threadId: bigint;
  status: number;
}

const isActiveJobStatus = (status: number): boolean =>
  status === JOB_STATUS.QUEUED || status === JOB_STATUS.RUNNING;

/** A running job whose start is older than the timeout is dead. */
export const isJobStuck = (
  job: WatchdogJob,
  nowMicros: bigint,
  timeoutMicros: bigint = JOB_RUN_TIMEOUT_MICROS
): boolean =>
  job.status === JOB_STATUS.RUNNING &&
  job.startedAtMicros <= nowMicros - timeoutMicros;

/**
 * Running tools that must be reaped: their job is missing or already final.
 * Returns the tool rows to resolve. The caller mirrors the job's outcome;
 * a missing job maps to FAILED.
 */
export const findOrphanTools = (
  tools: readonly WatchdogTool[],
  jobsById: ReadonlyMap<string, WatchdogJob>
): WatchdogTool[] =>
  tools.filter((t) => {
    if (t.status !== TOOL_STATUS.RUNNING) {
      return false;
    }
    const job = jobsById.get(String(t.jobId));
    return job === undefined || !isActiveJobStatus(job.status);
  });

/** Outcome a reaped orphan tool should resolve to, given its job (if any). */
export const orphanToolOutcome = (job: WatchdogJob | undefined): number => {
  if (job === undefined) {
    return TOOL_STATUS.FAILED;
  }
  if (job.status === JOB_STATUS.DONE) {
    return TOOL_STATUS.DONE;
  }
  if (job.status === JOB_STATUS.CANCELLED) {
    return TOOL_STATUS.CANCELLED;
  }
  return TOOL_STATUS.FAILED;
};

/** Streaming agent replies in threads with no active job never finish. */
export const findDanglingMessages = (
  messages: readonly WatchdogMessage[],
  activeThreadIds: ReadonlySet<string>
): WatchdogMessage[] =>
  messages.filter(
    (m) =>
      m.streaming &&
      m.role === MESSAGE_ROLE.AGENT &&
      !activeThreadIds.has(String(m.threadId))
  );

/** Streaming threads with no active job never finish. */
export const findDanglingThreads = (
  threads: readonly WatchdogThread[],
  activeThreadIds: ReadonlySet<string>
): WatchdogThread[] =>
  threads.filter(
    (t) =>
      t.status === THREAD_STATUS.STREAMING &&
      !activeThreadIds.has(String(t.threadId))
  );

/** Thread ids that still have a queued or running job. */
export const activeThreadIdsOf = (
  jobs: readonly WatchdogJob[]
): Set<string> => {
  const out = new Set<string>();
  for (const j of jobs) {
    if (isActiveJobStatus(j.status)) {
      out.add(String(j.threadId));
    }
  }
  return out;
};
