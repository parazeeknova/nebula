import { schema, table, t } from "spacetimedb/server";

const person = table(
  { name: "person", public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    name: t.string(),
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

const spacetimedb = schema({ agent_job, agent_step, person });

export default spacetimedb;

export const init = spacetimedb.init(() => {
  // Called when the module is initially published
});

export const onConnect = spacetimedb.clientConnected(() => {
  // Called every time a new client connects
});

export const onDisconnect = spacetimedb.clientDisconnected(() => {
  // Called every time a client disconnects
});

export const add = spacetimedb.reducer(
  { name: t.string() },
  (ctx, { name }) => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw new Error("Name must not be empty");
    }
    ctx.db.person.insert({ id: 0n, name: trimmed });
  }
);

export const sayHello = spacetimedb.reducer((ctx) => {
  for (const row of ctx.db.person.iter()) {
    console.info(`Hello, ${row.name}!`);
  }
  console.info("Hello, World!");
});

export const createJob = spacetimedb.reducer(
  {
    job_id: t.string(),
    prompt: t.string(),
    requested_agent: t.option(t.string()),
  },
  (ctx, { job_id, prompt, requested_agent }) => {
    const id = job_id.trim();
    if (id.length === 0) {
      throw new Error("job_id must not be empty");
    }
    if (prompt.trim().length === 0) {
      throw new Error("prompt must not be empty");
    }
    // eslint-disable-next-line unicorn/prefer-array-some -- SpacetimeDB index lookup, not an Array
    if (ctx.db.agent_job.job_id.find(id)) {
      throw new Error("job already exists");
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
    // eslint-disable-next-line unicorn/prefer-array-some -- SpacetimeDB index lookup, not an Array
    const existing = ctx.db.agent_job.job_id.find(job_id);
    if (!existing) {
      throw new Error("job not found");
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
  (ctx, { step_id, job_id, agent, step_order, input }) => {
    // eslint-disable-next-line unicorn/prefer-array-some -- SpacetimeDB index lookup, not an Array
    if (!ctx.db.agent_job.job_id.find(job_id)) {
      throw new Error("job not found");
    }
    // eslint-disable-next-line unicorn/prefer-array-some -- SpacetimeDB index lookup, not an Array
    if (ctx.db.agent_step.step_id.find(step_id)) {
      throw new Error("step already exists");
    }
    ctx.db.agent_step.insert({
      agent,
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
    // eslint-disable-next-line unicorn/prefer-array-some -- SpacetimeDB index lookup, not an Array
    const existing = ctx.db.agent_step.step_id.find(step_id);
    if (!existing) {
      throw new Error("step not found");
    }
    ctx.db.agent_step.step_id.update({
      ...existing,
      output,
      status,
      updated_at: ctx.timestamp,
    });
  }
);
