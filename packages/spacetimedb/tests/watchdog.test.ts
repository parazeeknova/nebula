import { describe, expect, test } from "bun:test";

import { JOB_STATUS, TOOL_STATUS } from "../src/lib/constants";
import {
  activeThreadIdsOf,
  findDanglingMessages,
  findDanglingThreads,
  findOrphanTools,
  isJobStuck,
  orphanToolOutcome,
} from "../src/lib/watchdog";

const NOW = 10_000_000_000n;
const TIMEOUT = 900_000_000n;

describe("isJobStuck", () => {
  test("running job past the timeout is stuck", () => {
    expect(
      isJobStuck(
        {
          jobId: 1n,
          startedAtMicros: NOW - TIMEOUT - 1n,
          status: JOB_STATUS.RUNNING,
          threadId: 7n,
        },
        NOW,
        TIMEOUT
      )
    ).toBe(true);
  });

  test("fresh running job is not stuck", () => {
    expect(
      isJobStuck(
        {
          jobId: 1n,
          startedAtMicros: NOW - 1n,
          status: JOB_STATUS.RUNNING,
          threadId: 7n,
        },
        NOW,
        TIMEOUT
      )
    ).toBe(false);
  });

  test("queued jobs are never stuck (they wait for a worker)", () => {
    expect(
      isJobStuck(
        {
          jobId: 1n,
          startedAtMicros: 0n,
          status: JOB_STATUS.QUEUED,
          threadId: 7n,
        },
        NOW,
        TIMEOUT
      )
    ).toBe(false);
  });

  test("final jobs are never stuck", () => {
    for (const status of [
      JOB_STATUS.DONE,
      JOB_STATUS.FAILED,
      JOB_STATUS.CANCELLED,
    ]) {
      expect(
        isJobStuck(
          { jobId: 1n, startedAtMicros: 0n, status, threadId: 7n },
          NOW,
          TIMEOUT
        )
      ).toBe(false);
    }
  });
});

describe("findOrphanTools + orphanToolOutcome", () => {
  test("running tool with a running job is left alone", () => {
    const tools = [
      {
        callId: 1n,
        createdAtMicros: NOW,
        jobId: 1n,
        status: TOOL_STATUS.RUNNING,
      },
    ];
    const jobs = new Map([
      [
        "1",
        {
          jobId: 1n,
          startedAtMicros: NOW,
          status: JOB_STATUS.RUNNING,
          threadId: 7n,
        },
      ],
    ]);
    expect(findOrphanTools(tools, jobs)).toEqual([]);
  });

  test("running tool with a finished or missing job is reaped", () => {
    const tools = [
      {
        callId: 1n,
        createdAtMicros: NOW,
        jobId: 1n,
        status: TOOL_STATUS.RUNNING,
      },
      {
        callId: 2n,
        createdAtMicros: NOW,
        jobId: 2n,
        status: TOOL_STATUS.RUNNING,
      },
      {
        callId: 3n,
        createdAtMicros: NOW,
        jobId: 3n,
        status: TOOL_STATUS.DONE,
      },
    ];
    const jobs = new Map([
      [
        "1",
        {
          jobId: 1n,
          startedAtMicros: NOW,
          status: JOB_STATUS.DONE,
          threadId: 7n,
        },
      ],
    ]);
    // job 2 is missing entirely; job 3's tool already resolved.
    expect(findOrphanTools(tools, jobs).map((t) => t.callId)).toEqual([1n, 2n]);
  });

  test("outcome mirrors the job", () => {
    const done = {
      jobId: 1n,
      startedAtMicros: NOW,
      status: JOB_STATUS.DONE,
      threadId: 7n,
    };
    const cancelled = { ...done, status: JOB_STATUS.CANCELLED };
    const failed = { ...done, status: JOB_STATUS.FAILED };
    expect(orphanToolOutcome(done)).toBe(TOOL_STATUS.DONE);
    expect(orphanToolOutcome(cancelled)).toBe(TOOL_STATUS.CANCELLED);
    expect(orphanToolOutcome(failed)).toBe(TOOL_STATUS.FAILED);
    expect(orphanToolOutcome()).toBe(TOOL_STATUS.FAILED);
  });
});

describe("dangling messages and threads", () => {
  test("streaming agent reply without an active job is dangling", () => {
    const messages = [
      { messageId: 1n, role: 1, streaming: true, threadId: 7n },
      { messageId: 2n, role: 1, streaming: true, threadId: 8n },
      { messageId: 3n, role: 0, streaming: true, threadId: 7n },
      { messageId: 4n, role: 1, streaming: false, threadId: 7n },
    ];
    const active = new Set(["8"]);
    const dangling = findDanglingMessages(messages, active);
    expect(dangling.map((m) => m.messageId)).toEqual([1n]);
  });

  test("streaming thread without an active job is dangling", () => {
    const threads = [
      { status: 1, threadId: 7n },
      { status: 1, threadId: 8n },
      { status: 0, threadId: 9n },
    ];
    const dangling = findDanglingThreads(threads, new Set(["8"]));
    expect(dangling.map((t) => t.threadId)).toEqual([7n]);
  });

  test("activeThreadIdsOf tracks queued and running jobs", () => {
    const jobs = [
      {
        jobId: 1n,
        startedAtMicros: NOW,
        status: JOB_STATUS.QUEUED,
        threadId: 7n,
      },
      {
        jobId: 2n,
        startedAtMicros: NOW,
        status: JOB_STATUS.DONE,
        threadId: 8n,
      },
    ];
    expect(activeThreadIdsOf(jobs)).toEqual(new Set(["7"]));
  });
});
