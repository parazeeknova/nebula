import { DbConnection } from "../module_bindings";
import type { AiJob, Message, ToolCall } from "../module_bindings/types";
import { runEvaluation } from "./agents/evaluation";
import { runMarketAnalysis } from "./agents/market-analysis";
import { CONFIDENCE_THRESHOLD, planRouting } from "./agents/orchestrator";
import { HANDLE_TO_AGENT, isAgentHandle } from "./agents/registry";
import type { AgentName, AgentRoute } from "./agents/registry";
import { synthesize } from "./agents/synthesize";
import type {
  AgentResults,
  AgentOutput,
  EvaluationOutput,
  MarketAnalysisOutput,
  WebResearchOutput,
} from "./agents/types";
import { runWebResearch } from "./agents/web-research";
import { config } from "./config";
import {
  agentPeerId,
  humanPeerId,
  pullRoomMemory,
  recordMessages,
} from "./honcho";
import { withModel } from "./llm";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const log = (...args: unknown[]): void => {
  console.info(new Date().toISOString(), "[worker]", ...args);
};

const errMsg = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const ORDER: AgentName[] = ["web", "market", "evaluation"];

const TOOL_BY_AGENT: Record<AgentName, string> = {
  evaluation: "evaluate",
  market: "market_analysis",
  web: "web_search",
};

const subscribeOnce = (conn: DbConnection, queries: string[]): Promise<void> =>
  new Promise((resolve, reject) => {
    conn
      .subscriptionBuilder()
      .onApplied(() => resolve())
      .onError((ctx) => reject(ctx.event ?? new Error("subscription error")))
      .subscribe(queries);
  });

const connect = (): Promise<DbConnection> =>
  new Promise((resolve, reject) => {
    try {
      DbConnection.builder()
        .withUri(config.spacetimedbHost)
        .withDatabaseName(config.spacetimedbDb)
        .withToken(config.spacetimedbToken || undefined)
        .onConnect((conn) => {
          log(
            `connected to ${config.spacetimedbHost}/${config.spacetimedbDb} as worker`
          );
          resolve(conn);
        })
        .onConnectError((_ctx, error) => {
          reject(error);
        })
        .build();
    } catch (error) {
      reject(error as Error);
    }
  });

const newestMessageInThread = (
  conn: DbConnection,
  threadId: bigint,
  role: number
): Message | null => {
  let newest: Message | null = null;
  for (const m of conn.db.message.iter()) {
    if (
      m.threadId === threadId &&
      m.role === role &&
      m.streaming &&
      (newest === null || m.messageId > newest.messageId)
    ) {
      newest = m;
    }
  }
  return newest;
};

const waitForReplyMessage = async (
  conn: DbConnection,
  threadId: bigint
): Promise<Message | null> => {
  for (let i = 0; i < 20; i += 1) {
    const msg = newestMessageInThread(conn, threadId, 1);
    if (msg !== null) {
      return msg;
    }
    // eslint-disable-next-line no-await-in-loop -- polling until the reply shell appears
    await sleep(150);
  }
  return null;
};

const newestRunningTool = (
  conn: DbConnection,
  jobId: bigint
): ToolCall | null => {
  let newest: ToolCall | null = null;
  for (const t of conn.db.toolCall.iter()) {
    if (
      t.jobId === jobId &&
      t.status === 1 &&
      (newest === null || t.callId > newest.callId)
    ) {
      newest = t;
    }
  }
  return newest;
};

const runAgentFor = (
  agent: AgentName,
  task: string,
  results: AgentResults,
  memory?: string
): Promise<AgentOutput> => {
  if (agent === "web") {
    return runWebResearch(task, undefined, memory);
  }
  if (agent === "market") {
    return runMarketAnalysis(
      task,
      undefined,
      results.web_result ?? undefined,
      memory
    );
  }
  return runEvaluation(
    task,
    undefined,
    results.web_result ?? undefined,
    results.market_result ?? undefined,
    memory
  );
};

const resultsWith = (
  results: AgentResults,
  agent: AgentName,
  output: AgentOutput
): AgentResults => {
  const next = { ...results };
  if (agent === "web" && "findings" in output) {
    next.web_result = output as WebResearchOutput;
  } else if (agent === "market" && "market_summary" in output) {
    next.market_result = output as MarketAnalysisOutput;
  } else if (agent === "evaluation" && "decision" in output) {
    next.evaluation_result = output as EvaluationOutput;
  }
  return next;
};

const runAgentWithTool = async (
  conn: DbConnection,
  messageId: bigint,
  jobId: bigint,
  agent: AgentName,
  task: string,
  results: AgentResults,
  memory?: string
): Promise<AgentResults> => {
  const tool = TOOL_BY_AGENT[agent];
  await conn.reducers.logToolCall({
    input: task.slice(0, 8000),
    jobId,
    tool,
  });
  await conn.reducers.signalEvent({
    kind: "tool_start",
    messageId,
    payload: tool,
  });
  try {
    const outcome = await runAgentFor(agent, task, results, memory);
    const next = resultsWith(results, agent, outcome);
    const call = newestRunningTool(conn, jobId);
    if (call !== null) {
      await conn.reducers.resolveToolCall({
        callId: call.callId,
        output: JSON.stringify(outcome).slice(0, 8000),
        status: 2,
      });
    }
    await conn.reducers.signalEvent({
      kind: "tool_end",
      messageId,
      payload: tool,
    });
    return next;
  } catch (error) {
    const call = newestRunningTool(conn, jobId);
    if (call !== null) {
      await conn.reducers.resolveToolCall({
        callId: call.callId,
        output: errMsg(error).slice(0, 8000),
        status: 3,
      });
    }
    throw error;
  }
};

/** Run a dispatch route and return the final prose answer. */
const produceAnswer = async (
  conn: DbConnection,
  messageId: bigint,
  jobId: bigint,
  prompt: string,
  route: AgentRoute,
  memory?: string
): Promise<string> => {
  const results: AgentResults = {
    evaluation_result: null,
    market_result: null,
    web_result: null,
  };

  let agents: AgentName[];
  if (route === "web" || route === "market" || route === "evaluation") {
    agents = [route];
  } else {
    const routing = await planRouting(prompt, memory);
    if (routing.agents.length === 0) {
      return routing.answer ?? "";
    }
    if (routing.confidence < CONFIDENCE_THRESHOLD) {
      return (
        "I am not confident enough to act on this yet (routing confidence " +
        `${routing.confidence.toFixed(2)}). ${routing.reason} ` +
        "Try a more specific request, or tag a specialist agent directly."
      );
    }
    agents = ORDER.filter((a) => routing.agents.includes(a));
  }

  const results2 = { ...results };
  for (const agent of agents) {
    const task = prompt;
    // eslint-disable-next-line no-await-in-loop -- sequential so downstream agents receive upstream context
    const next = await runAgentWithTool(
      conn,
      messageId,
      jobId,
      agent,
      task,
      results2,
      memory
    );
    results2.web_result = next.web_result;
    results2.market_result = next.market_result;
    results2.evaluation_result = next.evaluation_result;
  }

  const final = await synthesize(prompt, results2, memory);
  return final.answer;
};

const streamAnswer = async (
  conn: DbConnection,
  messageId: bigint,
  answer: string
): Promise<void> => {
  const body = answer.trim();
  if (body.length === 0) {
    throw new Error("agent produced an empty answer");
  }
  const CHUNK = 200;
  for (let i = 0; i < body.length; i += CHUNK) {
    // eslint-disable-next-line no-await-in-loop -- sequential chunk writes keep ordering
    await conn.reducers.appendChunk({
      delta: body.slice(i, i + CHUNK),
      idx: i / CHUNK,
      messageId,
    });
    // eslint-disable-next-line no-await-in-loop -- paced streaming
    await sleep(15);
  }
};

const roomRow = (conn: DbConnection, roomId: bigint) => {
  for (const r of conn.db.room.iter()) {
    if (r.roomId === roomId) {
      return r;
    }
  }
  return null;
};

/**
 * Load room memory for a job. Records the room's existing non-empty messages
 * into the Honcho session (idempotent) then pulls the LLM context. Returns ""
 * when the room isn't Honcho-backed or the pull fails.
 */
const loadMemoryFor = async (
  conn: DbConnection,
  job: AiJob,
  assistantAgentId: bigint
): Promise<string> => {
  try {
    const room = roomRow(conn, job.roomId);
    if (room === null || room.memoryBackend !== "honcho") {
      return "";
    }
    const messages = [...conn.db.message.iter()].filter(
      (m) => m.roomId === job.roomId && !m.streaming && m.body.trim().length > 0
    );
    await recordMessages(
      room.memoryNamespace,
      messages.map((m) => ({
        body: m.body,
        messageId: m.messageId,
        peerId:
          m.authorAgent === null || m.authorAgent === undefined
            ? humanPeerId(m.author.toHexString())
            : agentPeerId(m.authorAgent),
      }))
    );
    const mem = await pullRoomMemory(room.memoryNamespace, {
      assistantPeer: agentPeerId(assistantAgentId),
      prompt: job.prompt,
      targetPeer: humanPeerId(job.createdBy.toHexString()),
    });
    return mem.context;
  } catch (error) {
    log(`failed to load room memory for job ${job.jobId}: ${errMsg(error)}`);
    return "";
  }
};

/**
 * Write the completed answer into Honcho (keyed by the reply message id so it
 * dedups across reloads) and cache a short summary locally via push_room_memory.
 */
const writeMemoryFor = async (
  conn: DbConnection,
  job: AiJob,
  assistantAgentId: bigint,
  messageId: bigint,
  answer: string
): Promise<void> => {
  try {
    const room = roomRow(conn, job.roomId);
    if (room === null || room.memoryBackend !== "honcho") {
      return;
    }
    const body = answer.trim();
    if (body.length === 0) {
      return;
    }
    await recordMessages(room.memoryNamespace, [
      {
        body,
        messageId,
        peerId: agentPeerId(assistantAgentId),
      },
    ]);
    const summary = body.slice(0, 800);
    await conn.reducers.pushRoomMemory({
      embeddingRef: undefined,
      roomId: job.roomId,
      summary,
      threadId: job.threadId,
      weight: 1,
    });
    log(`job ${job.jobId} wrote room memory`);
  } catch (error) {
    log(`failed to write room memory for job ${job.jobId}: ${errMsg(error)}`);
  }
};

const handleJob = async (conn: DbConnection, job: AiJob): Promise<void> => {
  log(`claiming job ${job.jobId}: "${job.prompt.slice(0, 80)}"`);
  let messageId: bigint | null = null;
  try {
    await conn.reducers.claimJob({ jobId: job.jobId });
    const reply = await waitForReplyMessage(conn, job.threadId);
    if (reply === null) {
      throw new Error("claim_job did not create a streaming message");
    }
    const { messageId: replyId } = reply;
    messageId = replyId;

    const tagged = job.taggedAgent;
    if (tagged === null || tagged === undefined) {
      throw new Error("job has no tagged agent");
    }
    let handle = "";
    const assistantAgentId = tagged;
    for (const a of conn.db.agent.iter()) {
      if (a.agentId === tagged) {
        handle = (a.name.split(" ")[0] ?? "").toLowerCase();
      }
    }
    if (!isAgentHandle(handle)) {
      throw new Error(`unknown agent handle: ${handle || String(tagged)}`);
    }
    const route = HANDLE_TO_AGENT[handle];
    log(`job ${job.jobId} -> @${handle} (${route})`);

    const memory = await loadMemoryFor(conn, job, assistantAgentId);

    await conn.reducers.signalEvent({
      kind: "thinking",
      messageId,
      payload: `Running ${handle}…`,
    });

    if (memory && memory.trim().length > 0) {
      await conn.reducers.signalEvent({
        kind: "memory_used",
        messageId,
        payload: "drawing on this room's memory",
      });
    }

    const answer = await withModel(job.model, () =>
      produceAnswer(
        conn,
        messageId as bigint,
        job.jobId,
        job.prompt,
        route,
        memory
      )
    );
    await streamAnswer(conn, messageId, answer);
    await conn.reducers.completeJob({
      finalBody: "",
      jobId: job.jobId,
      messageId,
    });
    await writeMemoryFor(conn, job, assistantAgentId, messageId, answer);
    log(`job ${job.jobId} completed (${answer.length} chars)`);
  } catch (error) {
    const text = errMsg(error);
    log(`job ${job.jobId} FAILED: ${text}`);
    try {
      if (messageId !== null) {
        await conn.reducers.failJob({
          error: text.slice(0, 500),
          jobId: job.jobId,
          messageId,
        });
      }
    } catch (innerError) {
      log(`failed to record failure for ${job.jobId}: ${errMsg(innerError)}`);
    }
  }
};

const main = async (): Promise<void> => {
  log(
    `worker starting (model ${config.model}, fallback ${config.fallbackModel}) for ${config.spacetimedbHost}/${config.spacetimedbDb}`
  );
  const conn = await connect();
  try {
    await conn.reducers.registerWorker({ label: "nebula-agent-worker" });
  } catch (error) {
    log(`register_worker: ${errMsg(error)}`);
  }
  await subscribeOnce(conn, [
    "SELECT * FROM ai_job",
    "SELECT * FROM agent",
    "SELECT * FROM message",
    "SELECT * FROM room",
    "SELECT * FROM room_memory_entry",
    "SELECT * FROM thread",
    "SELECT * FROM tool_call",
  ]);
  log("subscriptions live; polling for queued jobs");

  let processing = false;
  const tick = async (): Promise<void> => {
    if (processing) {
      return;
    }
    try {
      const queued = [...conn.db.aiJob.iter()]
        .filter((j) => j.status === 0)
        .toSorted((a, b) => (a.jobId < b.jobId ? -1 : 1));
      if (queued.length === 0) {
        return;
      }
      processing = true;
      try {
        for (const job of queued) {
          const stillQueued = conn.db.aiJob.jobId.find(job.jobId);
          if (stillQueued !== null && stillQueued.status === 0) {
            // eslint-disable-next-line no-await-in-loop -- jobs run sequentially
            await handleJob(conn, job);
          }
        }
      } finally {
        processing = false;
      }
    } catch (error) {
      log(`tick failed: ${errMsg(error)}`);
    }
  };

  await tick();
  setInterval(() => {
    tick();
  }, config.workerPollMs);

  const shutdown = (): void => {
    log("shutting down");
    try {
      conn.disconnect();
    } catch {
      // ignore
    }
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

(async () => {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
