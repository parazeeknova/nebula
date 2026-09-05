import { ScheduleAt } from "spacetimedb";
import { SenderError, schema, table, t } from "spacetimedb/server";
import type { InferSchema, ReducerCtx } from "spacetimedb/server";

import { buildSnapshotPayload } from "./lib/memory";
import { mergeReady } from "./lib/merging";
import { assertNonEmpty } from "./lib/routing";

const app_user = table(
  { name: "app_user", public: true },
  {
    created_at: t.timestamp(),
    display_name: t.string(),
    identity: t.identity().primaryKey(),
  }
);

const workspace = table(
  { name: "workspace", public: true },
  {
    created_at: t.timestamp(),
    created_by: t.identity(),
    name: t.string(),
    workspace_id: t.u64().primaryKey().autoInc(),
  }
);

const room = table(
  { name: "room", public: true },
  {
    canvas_x: t.i32(),
    canvas_y: t.i32(),
    created_at: t.timestamp(),
    created_by: t.identity(),
    memory_backend: t.string(),
    memory_namespace: t.string(),
    name: t.string(),
    room_id: t.u64().primaryKey().autoInc(),
    status: t.u8(),
    topic: t.string(),
    workspace_id: t.u64().index("btree"),
  }
);

const room_human = table(
  {
    indexes: [
      {
        accessor: "by_room",
        algorithm: "btree",
        columns: ["room_id", "identity"],
      },
    ],
    name: "room_human",
    public: true,
  },
  {
    identity: t.identity(),
    joined_at: t.timestamp(),
    room_id: t.u64(),
  }
);

const room_agent = table(
  {
    indexes: [
      {
        accessor: "by_room",
        algorithm: "btree",
        columns: ["room_id", "agent_id"],
      },
    ],
    name: "room_agent",
    public: true,
  },
  {
    added_at: t.timestamp(),
    agent_id: t.u64(),
    room_id: t.u64(),
  }
);

const agent = table(
  { name: "agent", public: true },
  {
    agent_id: t.u64().primaryKey().autoInc(),
    created_at: t.timestamp(),
    created_by: t.identity(),
    model_name: t.string(),
    model_provider: t.string(),
    name: t.string(),
    system_prompt: t.string(),
    tools: t.array(t.string()),
    workspace_id: t.u64().index("btree"),
  }
);

const room_presence = table(
  { name: "room_presence", public: true },
  {
    identity: t.identity().primaryKey(),
    last_seen: t.timestamp(),
    room_id: t.u64().index("btree"),
  }
);

const thread = table(
  { name: "thread", public: true },
  {
    created_at: t.timestamp(),
    created_by: t.identity(),
    merge_session_id: t.option(t.u64()),
    room_id: t.u64().index("btree"),
    status: t.u8(),
    thread_id: t.u64().primaryKey().autoInc(),
    title: t.string(),
  }
);

const message = table(
  { name: "message", public: true },
  {
    author: t.identity(),
    author_agent: t.option(t.u64()),
    body: t.string(),
    created_at: t.timestamp(),
    mentions: t.array(t.u64()),
    message_id: t.u64().primaryKey().autoInc(),
    role: t.u8(),
    room_id: t.u64().index("btree"),
    streaming: t.bool(),
    thread_id: t.u64().index("btree"),
  }
);

const message_chunk = table(
  { name: "message_chunk", public: true },
  {
    chunk_id: t.u64().primaryKey().autoInc(),
    created_at: t.timestamp(),
    delta: t.string(),
    idx: t.u32(),
    message_id: t.u64().index("btree"),
  }
);

// Ephemeral live ticks (thinking/typing/tool_start/tool_end).
// Rows are never cached — clients only get onInsert callbacks.
const stream_event = table(
  { event: true, name: "stream_event", public: true },
  {
    created_at: t.timestamp(),
    kind: t.string(),
    message_id: t.u64(),
    payload: t.string(),
  }
);

// Worker queue. UI creates jobs via start_thread/post_message;
// the external worker claims them, calls the LLM, streams back.
const ai_job = table(
  { name: "ai_job", public: true },
  {
    angle: t.string(),
    created_at: t.timestamp(),
    created_by: t.identity(),
    job_id: t.u64().primaryKey().autoInc(),
    prompt: t.string(),
    room_id: t.u64().index("btree"),
    status: t.u8(),
    tagged_agent: t.option(t.u64()),
    thread_id: t.u64().index("btree"),
  }
);

const tool_call = table(
  { name: "tool_call", public: true },
  {
    call_id: t.u64().primaryKey().autoInc(),
    created_at: t.timestamp(),
    input: t.string(),
    job_id: t.u64().index("btree"),
    output: t.option(t.string()),
    status: t.u8(),
    tool: t.string(),
  }
);

const merge_session = table(
  { name: "merge_session", public: true },
  {
    created_at: t.timestamp(),
    final_message_id: t.option(t.u64()),
    room_id: t.u64().index("btree"),
    session_id: t.u64().primaryKey().autoInc(),
    status: t.u8(),
  }
);

const merge_link = table(
  {
    indexes: [
      {
        accessor: "by_session",
        algorithm: "btree",
        columns: ["session_id", "thread_id"],
      },
    ],
    name: "merge_link",
    public: true,
  },
  {
    session_id: t.u64(),
    thread_id: t.u64(),
  }
);

const exploration = table(
  { name: "exploration", public: true },
  {
    angle: t.string(),
    exploration_id: t.u64().primaryKey().autoInc(),
    job_id: t.u64(),
    message_id: t.u64(),
    session_id: t.u64().index("btree"),
    status: t.u8(),
  }
);

const room_memory_entry = table(
  { name: "room_memory_entry", public: true },
  {
    created_at: t.timestamp(),
    embedding_ref: t.option(t.string()),
    memory_id: t.u64().primaryKey().autoInc(),
    room_id: t.u64().index("btree"),
    summary: t.string(),
    thread_id: t.u64(),
    weight: t.f32(),
  }
);

const workspace_snapshot = table(
  { name: "workspace_snapshot", public: true },
  {
    generated_at: t.timestamp(),
    payload: t.string(),
    snapshot_id: t.u64().primaryKey().autoInc(),
    workspace_id: t.u64().index("btree"),
  }
);

const worker_allowlist = table(
  { name: "worker_allowlist" },
  {
    added_at: t.timestamp(),
    identity: t.identity().primaryKey(),
    label: t.string(),
  }
);

const snapshot_timer = table(
  {
    name: "snapshot_timer",
    // SpacetimeDB requires a lazy forward reference here to break the
    // table/reducer declaration cycle (see scheduled-tables docs).
    // eslint-disable-next-line no-use-before-define, @typescript-eslint/no-explicit-any
    scheduled: (): any => rollup_snapshots,
  },
  {
    scheduled_at: t.scheduleAt(),
    scheduled_id: t.u64().primaryKey().autoInc(),
    workspace_id: t.u64(),
  }
);

const agent_job = table(
  { name: "agent_job", public: true },
  {
    created_at: t.timestamp(),
    error: t.option(t.string()),
    final_result: t.option(t.string()),
    job_id: t.string().primaryKey(),
    prompt: t.string(),
    requested_agent: t.option(t.string()),
    selected_agents: t.option(t.string()),
    status: t.string(),
    updated_at: t.timestamp(),
  }
);

const agent_step = table(
  {
    indexes: [{ accessor: "by_job", algorithm: "btree", columns: ["job_id"] }],
    name: "agent_step",
    public: true,
  },
  {
    agent: t.string(),
    created_at: t.timestamp(),
    input: t.string(),
    job_id: t.string(),
    output: t.option(t.string()),
    status: t.string(),
    step_id: t.string().primaryKey(),
    step_order: t.u32(),
    updated_at: t.timestamp(),
  }
);

const spacetimedb = schema({
  agent,
  agent_job,
  agent_step,
  ai_job,
  app_user,
  exploration,
  merge_link,
  merge_session,
  message,
  message_chunk,
  room,
  room_agent,
  room_human,
  room_memory_entry,
  room_presence,
  snapshot_timer,
  stream_event,
  thread,
  tool_call,
  worker_allowlist,
  workspace,
  workspace_snapshot,
});

export default spacetimedb;

// ── internal helpers (NOT exported — named exports are reserved) ──

type Ctx = ReducerCtx<InferSchema<typeof spacetimedb>>;

const isWorker = (ctx: Ctx): boolean => {
  const allowlist = [...ctx.db.worker_allowlist.iter()];
  if (allowlist.length === 0) {
    // bootstrap: open until first worker registers
    return true;
  }
  return allowlist.some(
    (w) => w.identity.toHexString() === ctx.sender.toHexString()
  );
};

const requireWorker = (ctx: Ctx): void => {
  if (!isWorker(ctx)) {
    throw new SenderError("worker-only reducer");
  }
};

const getRoom = (ctx: Ctx, room_id: bigint) => {
  const r = ctx.db.room.room_id.find(room_id);
  if (!r) {
    throw new SenderError("room not found");
  }
  return r;
};

const requireRoomMember = (ctx: Ctx, room_id: bigint): void => {
  const me = ctx.sender.toHexString();
  const human = ctx.db.room_human.by_room
    .filter(room_id)
    .some((m) => m.identity.toHexString() === me);
  if (!human) {
    throw new SenderError("join the room first");
  }
};

// ── lifecycle ──

const DEFAULT_AGENTS = [
  {
    model_name: "gpt-oss-120b",
    model_provider: "generalcompute",
    name: "Neb",
    system_prompt:
      "You are Neb, the general orchestrator that routes work to specialist agents.",
    tools: ["orchestrate"],
  },
  {
    model_name: "gpt-oss-120b",
    model_provider: "generalcompute",
    name: "Researcher",
    system_prompt:
      "You are Researcher, the web search specialist that finds current facts and sources.",
    tools: ["web_search"],
  },
  {
    model_name: "gpt-oss-120b",
    model_provider: "generalcompute",
    name: "Marketing",
    system_prompt:
      "You are Marketing, the market analysis specialist covering competitors, pricing, positioning and implementation.",
    tools: ["market_analysis"],
  },
  {
    model_name: "gpt-oss-120b",
    model_provider: "generalcompute",
    name: "Evaluator",
    system_prompt:
      "You are Evaluator, the decision specialist that weighs risks, tradeoffs, assumptions and recommendations.",
    tools: ["evaluate"],
  },
] as const;

const ensureDefaultAgents = (ctx: Ctx, workspace_id: bigint): void => {
  const existing = new Set(
    [...ctx.db.agent.workspace_id.filter(workspace_id)].map((a) => a.name)
  );
  for (const a of DEFAULT_AGENTS) {
    if (existing.has(a.name)) {
      continue;
    }
    ctx.db.agent.insert({
      agent_id: 0n,
      created_at: ctx.timestamp,
      created_by: ctx.sender,
      model_name: a.model_name,
      model_provider: a.model_provider,
      name: a.name,
      system_prompt: a.system_prompt,
      tools: [...a.tools],
      workspace_id,
    });
  }
};

const addWorkspaceAgentsToRoom = (
  ctx: Ctx,
  workspace_id: bigint,
  room_id: bigint
): void => {
  for (const ag of ctx.db.agent.workspace_id.filter(workspace_id)) {
    const exists = ctx.db.room_agent.by_room
      .filter(room_id)
      .some((r) => r.agent_id === ag.agent_id);
    if (!exists) {
      ctx.db.room_agent.insert({
        added_at: ctx.timestamp,
        agent_id: ag.agent_id,
        room_id,
      });
    }
  }
};

export const init = spacetimedb.init((ctx) => {
  const ws = ctx.db.workspace.insert({
    created_at: ctx.timestamp,
    created_by: ctx.sender,
    name: "General",
    workspace_id: 0n,
  });
  ensureDefaultAgents(ctx, ws.workspace_id);
  // Canvas rollup every 5 minutes.
  ctx.db.snapshot_timer.insert({
    scheduled_at: ScheduleAt.interval(300_000_000n),
    scheduled_id: 0n,
    workspace_id: ws.workspace_id,
  });
});

export const onConnect = spacetimedb.clientConnected((ctx) => {
  const existing = ctx.db.app_user.identity.find(ctx.sender);
  if (!existing) {
    ctx.db.app_user.insert({
      created_at: ctx.timestamp,
      display_name: ctx.sender.toHexString().slice(0, 12),
      identity: ctx.sender,
    });
  }
});

export const onDisconnect = spacetimedb.clientDisconnected((ctx) => {
  const p = ctx.db.room_presence.identity.find(ctx.sender);
  if (p) {
    ctx.db.room_presence.identity.delete(ctx.sender);
  }
});

export const update_display_name = spacetimedb.reducer(
  { display_name: t.string() },
  (ctx, { display_name }) => {
    const name = assertNonEmpty(display_name, "display_name").slice(0, 48);
    const existing = ctx.db.app_user.identity.find(ctx.sender);
    if (existing) {
      ctx.db.app_user.identity.update({ ...existing, display_name: name });
    } else {
      ctx.db.app_user.insert({
        created_at: ctx.timestamp,
        display_name: name,
        identity: ctx.sender,
      });
    }
  }
);

// ── workspace / rooms ──

export const create_workspace = spacetimedb.reducer(
  { name: t.string() },
  (ctx, { name }) => {
    ctx.db.workspace.insert({
      created_at: ctx.timestamp,
      created_by: ctx.sender,
      name: assertNonEmpty(name, "name"),
      workspace_id: 0n,
    });
  }
);

export const create_room = spacetimedb.reducer(
  {
    canvas_x: t.i32(),
    canvas_y: t.i32(),
    memory_backend: t.string(),
    memory_namespace: t.string(),
    name: t.string(),
    topic: t.string(),
    workspace_id: t.u64(),
  },
  (ctx, a) => {
    if (!ctx.db.workspace.workspace_id.find(a.workspace_id)) {
      throw new SenderError("workspace not found");
    }
    const r = ctx.db.room.insert({
      canvas_x: a.canvas_x,
      canvas_y: a.canvas_y,
      created_at: ctx.timestamp,
      created_by: ctx.sender,
      memory_backend: a.memory_backend.slice(0, 64),
      memory_namespace: a.memory_namespace.slice(0, 256),
      name: assertNonEmpty(a.name, "name"),
      room_id: 0n,
      status: 0,
      topic: a.topic.slice(0, 2000),
      workspace_id: a.workspace_id,
    });
    ctx.db.room_human.insert({
      identity: ctx.sender,
      joined_at: ctx.timestamp,
      room_id: r.room_id,
    });
    addWorkspaceAgentsToRoom(ctx, a.workspace_id, r.room_id);
  }
);

export const move_room = spacetimedb.reducer(
  { canvas_x: t.i32(), canvas_y: t.i32(), room_id: t.u64() },
  (ctx, { room_id, canvas_x, canvas_y }) => {
    const r = getRoom(ctx, room_id);
    requireRoomMember(ctx, room_id);
    ctx.db.room.room_id.update({ ...r, canvas_x, canvas_y });
  }
);

export const archive_room = spacetimedb.reducer(
  { room_id: t.u64() },
  (ctx, { room_id }) => {
    const r = getRoom(ctx, room_id);
    requireRoomMember(ctx, room_id);
    ctx.db.room.room_id.update({ ...r, status: 1 });
  }
);

export const join_room = spacetimedb.reducer(
  { room_id: t.u64() },
  (ctx, { room_id }) => {
    getRoom(ctx, room_id);
    const me = ctx.sender.toHexString();
    const already = ctx.db.room_human.by_room
      .filter(room_id)
      .some((m) => m.identity.toHexString() === me);
    if (already) {
      return;
    }
    ctx.db.room_human.insert({
      identity: ctx.sender,
      joined_at: ctx.timestamp,
      room_id,
    });
  }
);

export const leave_room = spacetimedb.reducer(
  { room_id: t.u64() },
  (ctx, { room_id }) => {
    const me = ctx.sender.toHexString();
    for (const m of ctx.db.room_human.by_room.filter(room_id)) {
      if (m.identity.toHexString() === me) {
        ctx.db.room_human.by_room.delete([m.room_id, m.identity]);
      }
    }
    const p = ctx.db.room_presence.identity.find(ctx.sender);
    if (p && p.room_id === room_id) {
      ctx.db.room_presence.identity.delete(ctx.sender);
    }
  }
);

export const heartbeat = spacetimedb.reducer(
  { room_id: t.u64() },
  (ctx, { room_id }) => {
    getRoom(ctx, room_id);
    const p = ctx.db.room_presence.identity.find(ctx.sender);
    if (p) {
      ctx.db.room_presence.identity.update({
        ...p,
        last_seen: ctx.timestamp,
        room_id,
      });
    } else {
      ctx.db.room_presence.insert({
        identity: ctx.sender,
        last_seen: ctx.timestamp,
        room_id,
      });
    }
  }
);

// ── agents ──

export const register_agent = spacetimedb.reducer(
  {
    model_name: t.string(),
    model_provider: t.string(),
    name: t.string(),
    system_prompt: t.string(),
    tools: t.array(t.string()),
    workspace_id: t.u64(),
  },
  (ctx, a) => {
    if (!ctx.db.workspace.workspace_id.find(a.workspace_id)) {
      throw new SenderError("workspace not found");
    }
    ctx.db.agent.insert({
      agent_id: 0n,
      created_at: ctx.timestamp,
      created_by: ctx.sender,
      model_name: a.model_name.slice(0, 128),
      model_provider: a.model_provider.slice(0, 64),
      name: assertNonEmpty(a.name, "name"),
      system_prompt: a.system_prompt.slice(0, 8000),
      tools: a.tools.slice(0, 16).map((s) => s.slice(0, 128)),
      workspace_id: a.workspace_id,
    });
  }
);

export const update_agent = spacetimedb.reducer(
  {
    agent_id: t.u64(),
    model_name: t.string(),
    system_prompt: t.string(),
    tools: t.array(t.string()),
  },
  (ctx, a) => {
    const ag = ctx.db.agent.agent_id.find(a.agent_id);
    if (!ag) {
      throw new SenderError("agent not found");
    }
    ctx.db.agent.agent_id.update({
      ...ag,
      model_name: a.model_name.slice(0, 128),
      system_prompt: a.system_prompt.slice(0, 8000),
      tools: a.tools.slice(0, 16).map((s) => s.slice(0, 128)),
    });
  }
);

export const add_agent_to_room = spacetimedb.reducer(
  { agent_id: t.u64(), room_id: t.u64() },
  (ctx, { room_id, agent_id }) => {
    getRoom(ctx, room_id);
    requireRoomMember(ctx, room_id);
    if (!ctx.db.agent.agent_id.find(agent_id)) {
      throw new SenderError("agent not found");
    }
    const exists = ctx.db.room_agent.by_room
      .filter(room_id)
      .some((r) => r.agent_id === agent_id);
    if (exists) {
      return;
    }
    ctx.db.room_agent.insert({
      added_at: ctx.timestamp,
      agent_id,
      room_id,
    });
  }
);

export const remove_agent_from_room = spacetimedb.reducer(
  { agent_id: t.u64(), room_id: t.u64() },
  (ctx, { room_id, agent_id }) => {
    requireRoomMember(ctx, room_id);
    for (const r of ctx.db.room_agent.by_room.filter(room_id)) {
      if (r.agent_id === agent_id) {
        ctx.db.room_agent.by_room.delete([r.room_id, r.agent_id]);
      }
    }
  }
);

export const register_worker = spacetimedb.reducer(
  { label: t.string() },
  (ctx, { label }) => {
    if (!ctx.db.worker_allowlist.identity.find(ctx.sender)) {
      ctx.db.worker_allowlist.insert({
        added_at: ctx.timestamp,
        identity: ctx.sender,
        label: label.slice(0, 128),
      });
    }
  }
);

// ── threads / messages (UI entry points) ──

/**
 * The agent a thread "belongs to": the tagged agent of its earliest job.
 * Follow-up messages in that thread default to it, so users don't have to
 * re-@mention the agent every turn.
 */
const threadAgentTag = (ctx: Ctx, thread_id: bigint): bigint | undefined => {
  let best: bigint | undefined;
  let bestJob: bigint | undefined;
  for (const j of ctx.db.ai_job.thread_id.filter(thread_id)) {
    if (j.tagged_agent === undefined) {
      continue;
    }
    if (best === undefined || bestJob === undefined || j.job_id < bestJob) {
      best = j.tagged_agent;
      bestJob = j.job_id;
    }
  }
  return best;
};

export const start_thread = spacetimedb.reducer(
  {
    angle: t.string(),
    prompt: t.string(),
    room_id: t.u64(),
    tagged_agent: t.option(t.u64()),
    title: t.string(),
  },
  (ctx, a) => {
    const r = getRoom(ctx, a.room_id);
    if (r.status !== 0) {
      throw new SenderError("room is archived");
    }
    requireRoomMember(ctx, a.room_id);
    const prompt = assertNonEmpty(a.prompt, "prompt");
    const th = ctx.db.thread.insert({
      created_at: ctx.timestamp,
      created_by: ctx.sender,
      merge_session_id: undefined,
      room_id: a.room_id,
      status: a.tagged_agent === undefined ? 0 : 1,
      thread_id: 0n,
      title: a.title.trim().slice(0, 200) || prompt.slice(0, 80),
    });
    ctx.db.message.insert({
      author: ctx.sender,
      author_agent: undefined,
      body: prompt,
      created_at: ctx.timestamp,
      mentions: a.tagged_agent === undefined ? [] : [a.tagged_agent],
      message_id: 0n,
      role: 0,
      room_id: a.room_id,
      streaming: false,
      thread_id: th.thread_id,
    });
    // No agent mentioned => nothing runs.
    if (a.tagged_agent !== undefined) {
      ctx.db.ai_job.insert({
        angle: a.angle.slice(0, 512),
        created_at: ctx.timestamp,
        created_by: ctx.sender,
        job_id: 0n,
        prompt,
        room_id: a.room_id,
        status: 0,
        tagged_agent: a.tagged_agent,
        thread_id: th.thread_id,
      });
    }
  }
);

export const post_message = spacetimedb.reducer(
  {
    body: t.string(),
    mentions: t.array(t.u64()),
    thread_id: t.u64(),
  },
  (ctx, a) => {
    const th = ctx.db.thread.thread_id.find(a.thread_id);
    if (!th) {
      throw new SenderError("thread not found");
    }
    if (th.status === 3) {
      throw new SenderError("thread is closed");
    }
    requireRoomMember(ctx, th.room_id);
    const body = assertNonEmpty(a.body, "body");
    const typedMentions = a.mentions.slice(0, 8);
    // Continue the conversation with the thread's originating agent when no
    // agent is mentioned — no need to re-@ them every turn.
    const defaultAgent =
      typedMentions.length > 0 ? undefined : threadAgentTag(ctx, th.thread_id);
    const targetAgent =
      typedMentions.length > 0 ? typedMentions[0] : defaultAgent;
    ctx.db.message.insert({
      author: ctx.sender,
      author_agent: undefined,
      body,
      created_at: ctx.timestamp,
      mentions: typedMentions,
      message_id: 0n,
      role: 0,
      room_id: th.room_id,
      streaming: false,
      thread_id: th.thread_id,
    });
    ctx.db.thread.thread_id.update({
      ...th,
      status: targetAgent === undefined ? 0 : 1,
    });
    // No agent to run (no mention and no thread default) => nothing runs.
    if (targetAgent !== undefined) {
      ctx.db.ai_job.insert({
        angle: "",
        created_at: ctx.timestamp,
        created_by: ctx.sender,
        job_id: 0n,
        prompt: body,
        room_id: th.room_id,
        status: 0,
        tagged_agent: targetAgent,
        thread_id: th.thread_id,
      });
    }
  }
);

export const close_thread = spacetimedb.reducer(
  { thread_id: t.u64() },
  (ctx, { thread_id }) => {
    const th = ctx.db.thread.thread_id.find(thread_id);
    if (!th) {
      throw new SenderError("thread not found");
    }
    requireRoomMember(ctx, th.room_id);
    ctx.db.thread.thread_id.update({ ...th, status: 3 });
  }
);

// ── worker-only: job execution + streaming ──

export const claim_job = spacetimedb.reducer(
  { job_id: t.u64() },
  (ctx, { job_id }) => {
    requireWorker(ctx);
    const job = ctx.db.ai_job.job_id.find(job_id);
    if (!job) {
      throw new SenderError("job not found");
    }
    if (job.status !== 0) {
      throw new SenderError("job already claimed");
    }
    ctx.db.ai_job.job_id.update({ ...job, status: 1 });
    // Streaming reply shell. Worker discovers message_id via subscription
    // (newest message in thread with streaming=true), then append_chunk.
    const msg = ctx.db.message.insert({
      author: ctx.sender,
      author_agent: job.tagged_agent,
      body: "",
      created_at: ctx.timestamp,
      mentions: [],
      message_id: 0n,
      role: 1,
      room_id: job.room_id,
      streaming: true,
      thread_id: job.thread_id,
    });
    ctx.db.stream_event.insert({
      created_at: ctx.timestamp,
      kind: "thinking",
      message_id: msg.message_id,
      payload: job.angle.trim().slice(0, 200) || "Thinking…",
    });
  }
);

export const append_chunk = spacetimedb.reducer(
  { delta: t.string(), idx: t.u32(), message_id: t.u64() },
  (ctx, { message_id, idx, delta }) => {
    requireWorker(ctx);
    const msg = ctx.db.message.message_id.find(message_id);
    if (!msg) {
      throw new SenderError("message not found");
    }
    if (!msg.streaming) {
      throw new SenderError("message is not streaming");
    }
    if (delta.length === 0 || delta.length > 4000) {
      throw new SenderError("delta must be 1..4000 chars");
    }
    ctx.db.message_chunk.insert({
      chunk_id: 0n,
      created_at: ctx.timestamp,
      delta,
      idx,
      message_id,
    });
  }
);

export const signal_event = spacetimedb.reducer(
  { kind: t.string(), message_id: t.u64(), payload: t.string() },
  (ctx, a) => {
    const msg = ctx.db.message.message_id.find(a.message_id);
    if (!msg) {
      throw new SenderError("message not found");
    }
    const allowed = ["thinking", "typing", "tool_start", "tool_end"];
    if (!allowed.includes(a.kind)) {
      throw new SenderError("unknown event kind");
    }
    ctx.db.stream_event.insert({
      created_at: ctx.timestamp,
      kind: a.kind,
      message_id: a.message_id,
      payload: a.payload.slice(0, 2000),
    });
  }
);

export const complete_job = spacetimedb.reducer(
  { final_body: t.string(), job_id: t.u64(), message_id: t.u64() },
  (ctx, { job_id, message_id, final_body }) => {
    requireWorker(ctx);
    const job = ctx.db.ai_job.job_id.find(job_id);
    if (!job) {
      throw new SenderError("job not found");
    }
    const msg = ctx.db.message.message_id.find(message_id);
    if (!msg) {
      throw new SenderError("message not found");
    }
    if (msg.thread_id !== job.thread_id) {
      throw new SenderError("message does not belong to job thread");
    }
    const body = final_body.trim().slice(0, 8000);
    ctx.db.message.message_id.update({ ...msg, body, streaming: false });
    ctx.db.ai_job.job_id.update({ ...job, status: 2 });
    const th = ctx.db.thread.thread_id.find(job.thread_id);
    if (th && th.status === 1 && th.merge_session_id === undefined) {
      ctx.db.thread.thread_id.update({ ...th, status: 0 });
    }
  }
);

export const fail_job = spacetimedb.reducer(
  { error: t.string(), job_id: t.u64(), message_id: t.u64() },
  (ctx, { job_id, message_id, error }) => {
    requireWorker(ctx);
    const job = ctx.db.ai_job.job_id.find(job_id);
    if (!job) {
      throw new SenderError("job not found");
    }
    const msg = ctx.db.message.message_id.find(message_id);
    if (msg && msg.streaming) {
      ctx.db.message.message_id.update({
        ...msg,
        body: `Request failed: ${error.slice(0, 500)}`,
        streaming: false,
      });
    }
    ctx.db.ai_job.job_id.update({ ...job, status: 3 });
  }
);

export const log_tool_call = spacetimedb.reducer(
  { input: t.string(), job_id: t.u64(), tool: t.string() },
  (ctx, { job_id, tool, input }) => {
    requireWorker(ctx);
    if (!ctx.db.ai_job.job_id.find(job_id)) {
      throw new SenderError("job not found");
    }
    ctx.db.tool_call.insert({
      call_id: 0n,
      created_at: ctx.timestamp,
      input: input.slice(0, 8000),
      job_id,
      output: undefined,
      status: 1,
      tool: tool.slice(0, 128),
    });
  }
);

export const resolve_tool_call = spacetimedb.reducer(
  { call_id: t.u64(), output: t.string(), status: t.u8() },
  (ctx, { call_id, output, status }) => {
    requireWorker(ctx);
    const call = ctx.db.tool_call.call_id.find(call_id);
    if (!call) {
      throw new SenderError("tool call not found");
    }
    if (status !== 2 && status !== 3) {
      throw new SenderError("bad status");
    }
    ctx.db.tool_call.call_id.update({
      ...call,
      output: output.slice(0, 8000),
      status,
    });
  }
);

// ── worker-only: convergence (merge) ──

export const open_merge_session = spacetimedb.reducer(
  { room_id: t.u64() },
  (ctx, { room_id }) => {
    requireWorker(ctx);
    getRoom(ctx, room_id);
    ctx.db.merge_session.insert({
      created_at: ctx.timestamp,
      final_message_id: undefined,
      room_id,
      session_id: 0n,
      status: 1,
    });
  }
);

export const link_thread_to_merge = spacetimedb.reducer(
  { session_id: t.u64(), thread_id: t.u64() },
  (ctx, { session_id, thread_id }) => {
    requireWorker(ctx);
    const s = ctx.db.merge_session.session_id.find(session_id);
    if (!s) {
      throw new SenderError("merge session not found");
    }
    const th = ctx.db.thread.thread_id.find(thread_id);
    if (!th) {
      throw new SenderError("thread not found");
    }
    if (th.room_id !== s.room_id) {
      throw new SenderError("thread is in another room");
    }
    const dup = ctx.db.merge_link.by_session
      .filter(session_id)
      .some((l) => l.thread_id === thread_id);
    if (dup) {
      return;
    }
    ctx.db.merge_link.insert({ session_id, thread_id });
    ctx.db.thread.thread_id.update({ ...th, merge_session_id: session_id });
  }
);

export const mark_exploration = spacetimedb.reducer(
  {
    angle: t.string(),
    job_id: t.u64(),
    message_id: t.u64(),
    session_id: t.u64(),
  },
  (ctx, a) => {
    requireWorker(ctx);
    if (!ctx.db.merge_session.session_id.find(a.session_id)) {
      throw new SenderError("merge session not found");
    }
    ctx.db.exploration.insert({
      angle: a.angle.slice(0, 512),
      exploration_id: 0n,
      job_id: a.job_id,
      message_id: a.message_id,
      session_id: a.session_id,
      status: 1,
    });
  }
);

export const update_exploration = spacetimedb.reducer(
  { exploration_id: t.u64(), status: t.u8() },
  (ctx, { exploration_id, status }) => {
    requireWorker(ctx);
    const e = ctx.db.exploration.exploration_id.find(exploration_id);
    if (!e) {
      throw new SenderError("exploration not found");
    }
    if (status > 3) {
      throw new SenderError("bad status");
    }
    ctx.db.exploration.exploration_id.update({ ...e, status });
  }
);

export const publish_synthesis = spacetimedb.reducer(
  { body: t.string(), session_id: t.u64() },
  (ctx, { session_id, body }) => {
    requireWorker(ctx);
    const s = ctx.db.merge_session.session_id.find(session_id);
    if (!s) {
      throw new SenderError("merge session not found");
    }
    if (s.status === 2) {
      throw new SenderError("already merged");
    }
    const links = [...ctx.db.merge_link.by_session.filter(session_id)];
    if (links.length < 2) {
      throw new SenderError("need at least 2 threads to merge");
    }
    const explorations = [...ctx.db.exploration.session_id.filter(session_id)];
    if (!mergeReady(explorations.map((e) => e.status))) {
      throw new SenderError("explorations are not all done");
    }
    const [firstLink] = links;
    if (!firstLink) {
      throw new SenderError("thread not found");
    }
    const firstThread = ctx.db.thread.thread_id.find(firstLink.thread_id);
    if (!firstThread) {
      throw new SenderError("thread not found");
    }
    const final = ctx.db.message.insert({
      author: ctx.sender,
      author_agent: undefined,
      body: assertNonEmpty(body, "body"),
      created_at: ctx.timestamp,
      mentions: [],
      message_id: 0n,
      role: 2,
      room_id: s.room_id,
      streaming: false,
      thread_id: firstThread.thread_id,
    });
    for (const l of links) {
      const th = ctx.db.thread.thread_id.find(l.thread_id);
      if (th) {
        ctx.db.thread.thread_id.update({ ...th, status: 2 });
      }
    }
    ctx.db.merge_session.session_id.update({
      ...s,
      final_message_id: final.message_id,
      status: 2,
    });
  }
);

// ── memory ──

export const push_room_memory = spacetimedb.reducer(
  {
    embedding_ref: t.option(t.string()),
    room_id: t.u64(),
    summary: t.string(),
    thread_id: t.u64(),
    weight: t.f32(),
  },
  (ctx, a) => {
    requireWorker(ctx);
    getRoom(ctx, a.room_id);
    ctx.db.room_memory_entry.insert({
      created_at: ctx.timestamp,
      embedding_ref: a.embedding_ref,
      memory_id: 0n,
      room_id: a.room_id,
      summary: assertNonEmpty(a.summary, "summary").slice(0, 2000),
      thread_id: a.thread_id,
      weight: Math.max(0, Math.min(1, a.weight)),
    });
  }
);

const snapshotPayloadFor = (ctx: Ctx, workspace_id: bigint): string => {
  const entries: { room_id: bigint; summary: string }[] = [];
  for (const r of ctx.db.room.iter()) {
    if (r.workspace_id !== workspace_id || r.status !== 0) {
      continue;
    }
    let latestSummary: string | null = null;
    let latestMicros = -1n;
    for (const m of ctx.db.room_memory_entry.room_id.filter(r.room_id)) {
      const micros = m.created_at.microsSinceUnixEpoch;
      if (micros > latestMicros) {
        latestMicros = micros;
        latestSummary = m.summary;
      }
    }
    entries.push({
      room_id: r.room_id,
      summary: latestSummary ?? `Room: ${r.name}`,
    });
  }
  return buildSnapshotPayload(entries);
};

export const generate_snapshot = spacetimedb.reducer(
  { workspace_id: t.u64() },
  (ctx, { workspace_id }) => {
    if (!ctx.db.workspace.workspace_id.find(workspace_id)) {
      throw new SenderError("workspace not found");
    }
    ctx.db.workspace_snapshot.insert({
      generated_at: ctx.timestamp,
      payload: snapshotPayloadFor(ctx, workspace_id),
      snapshot_id: 0n,
      workspace_id,
    });
  }
);

export const rollup_snapshots = spacetimedb.reducer(
  { timer: snapshot_timer.rowType },
  (ctx, { timer }) => {
    ctx.db.workspace_snapshot.insert({
      generated_at: ctx.timestamp,
      payload: snapshotPayloadFor(ctx, timer.workspace_id),
      snapshot_id: 0n,
      workspace_id: timer.workspace_id,
    });
  }
);

// ── views ──

export const active_rooms = spacetimedb.anonymousView(
  { name: "active_rooms", public: true },
  t.array(room.rowType),
  (ctx) => [...ctx.db.room.iter()].filter((r) => r.status === 0)
);

// ── agent pipeline reducers ──

export const createJob = spacetimedb.reducer(
  {
    job_id: t.string(),
    prompt: t.string(),
    requested_agent: t.option(t.string()),
  },
  (ctx, { job_id, prompt, requested_agent }) => {
    const id = job_id.trim();
    if (id.length === 0) {
      throw new SenderError("job_id must not be empty");
    }
    if (prompt.trim().length === 0) {
      throw new SenderError("prompt must not be empty");
    }
    if (ctx.db.agent_job.job_id.find(id)) {
      throw new SenderError("job already exists");
    }
    ctx.db.agent_job.insert({
      created_at: ctx.timestamp,
      error: undefined,
      final_result: undefined,
      job_id: id,
      prompt,
      requested_agent,
      selected_agents: undefined,
      status: "queued",
      updated_at: ctx.timestamp,
    });
  }
);

export const updateJob = spacetimedb.reducer(
  {
    error: t.option(t.string()),
    final_result: t.option(t.string()),
    job_id: t.string(),
    selected_agents: t.option(t.string()),
    status: t.string(),
  },
  (ctx, { job_id, status, selected_agents, final_result, error }) => {
    const existing = ctx.db.agent_job.job_id.find(job_id);
    if (!existing) {
      throw new SenderError("job not found");
    }
    ctx.db.agent_job.job_id.update({
      ...existing,
      error,
      final_result,
      selected_agents,
      status,
      updated_at: ctx.timestamp,
    });
  }
);

export const addStep = spacetimedb.reducer(
  {
    agent: t.string(),
    input: t.string(),
    job_id: t.string(),
    step_id: t.string(),
    step_order: t.u32(),
  },
  (ctx, { step_id, job_id, agent: agentName, step_order, input }) => {
    if (!ctx.db.agent_job.job_id.find(job_id)) {
      throw new SenderError("job not found");
    }
    if (ctx.db.agent_step.step_id.find(step_id)) {
      throw new SenderError("step already exists");
    }
    ctx.db.agent_step.insert({
      agent: agentName,
      created_at: ctx.timestamp,
      input,
      job_id,
      output: undefined,
      status: "running",
      step_id,
      step_order,
      updated_at: ctx.timestamp,
    });
  }
);

export const updateStep = spacetimedb.reducer(
  {
    output: t.option(t.string()),
    status: t.string(),
    step_id: t.string(),
  },
  (ctx, { step_id, output, status }) => {
    const existing = ctx.db.agent_step.step_id.find(step_id);
    if (!existing) {
      throw new SenderError("step not found");
    }
    ctx.db.agent_step.step_id.update({
      ...existing,
      output,
      status,
      updated_at: ctx.timestamp,
    });
  }
);
