import { pullRoomMemory, recordMessages } from "./memory";
import { Stdb } from "./stdb";
import { truncate } from "./truncate";

export interface Env {
  SPACETIMEDB_HOST: string;
  SPACETIMEDB_DB: string;
  SPACETIMEDB_TOKEN: string;
  OPENAI_API_KEY: string;
  OPENAI_BASE_URL?: string;
  GENERALCOMPUTE_API_KEY?: string;
  GENERALCOMPUTE_BASE_URL?: string;
  MODEL?: string;
  FALLBACK_MODEL?: string;
  FALLBACK_API_KEY?: string;
  FALLBACK_BASE_URL?: string;
  FIRECRAWL_API_KEY?: string;
  FIRECRAWL_BASE_URL?: string;
  HONCHO_API_KEY?: string;
  HONCHO_BASE_URL?: string;
  HONCHO_WORKSPACE_ID?: string;
  CRON_SECRET?: string;
  QUEUE_POLLER: DurableObjectNamespace;
}

interface AiJobRow {
  job_id: string | number;
  prompt: string;
  status: number;
  tagged_agent: unknown;
  thread_id: string | number;
  room_id: string | number;
  model: unknown;
  created_by: unknown;
}

interface RoomRow {
  room_id: string | number;
  memory_backend: string;
  memory_namespace: string;
}

interface ChatRow {
  message_id: string | number;
  author: unknown;
  author_agent: unknown;
  body: string;
}

interface AgentRow {
  agent_id: string | number;
  name: string;
}

interface MessageRow {
  message_id: string | number;
  streaming: boolean;
  thread_id: string | number;
}

export const errMsg = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const extractJson = (raw: string): Record<string, unknown> => {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*(?<body>[\s\S]*?)```/u);
  const candidate = (fenced?.groups?.body ?? trimmed).trim();
  const start = candidate.search(/[{[]/u);
  const end = Math.max(candidate.lastIndexOf("}"), candidate.lastIndexOf("]"));
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`agent did not return JSON: ${raw.slice(0, 160)}`);
  }
  return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
};

const optSome = <T>(v: unknown): T | undefined => {
  if (!Array.isArray(v)) {
    return undefined;
  }
  const [tag, value] = v as [number, T];
  return tag === 0 ? value : undefined;
};

const identityStr = (v: unknown): string => {
  if (Array.isArray(v) && typeof v[0] === "string") {
    return v[0];
  }
  return typeof v === "string" ? v : "";
};

const chunkSplit = (body: string, size: number): string[] => {
  const out: string[] = [];
  for (let i = 0; i < body.length; i += size) {
    out.push(body.slice(i, i + size));
  }
  return out;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
  tool_call_id?: string;
}

interface ToolDef {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface ModelRef {
  provider: string;
  model: string;
}

const parseModelRef = (ref: string): ModelRef | undefined => {
  const sep = ref.indexOf("::");
  if (sep !== -1) {
    const provider = ref.slice(0, sep);
    const model = ref.slice(sep + 2);
    if (provider === "openai" || provider === "generalcompute") {
      return { model, provider };
    }
  }
  return ref.trim().length > 0 ? { model: ref, provider: "openai" } : undefined;
};

class Llm {
  private readonly env: Env;
  private readonly model: string;

  constructor(env: Env, model: string) {
    this.env = env;
    this.model = model;
  }

  private endpoints(): { url: string; key: string; model: string }[] {
    const parsed = parseModelRef(this.model);
    const primary = {
      key: this.env.OPENAI_API_KEY,
      model: parsed?.model ?? this.model,
      url: this.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    };
    const out = [primary];
    if (this.env.FALLBACK_API_KEY && this.env.FALLBACK_BASE_URL) {
      out.push({
        key: this.env.FALLBACK_API_KEY,
        model: this.env.FALLBACK_MODEL ?? primary.model,
        url: this.env.FALLBACK_BASE_URL,
      });
    }
    return out;
  }

  async chat(
    messages: ChatMessage[],
    tools?: ToolDef[],
    modelOverride?: string
  ): Promise<ChatMessage> {
    let lastError = "no endpoints";
    const override = parseModelRef(modelOverride ?? "");
    const endpoints = override
      ? [
          override.provider === "openai"
            ? {
                key: this.env.OPENAI_API_KEY,
                model: override.model,
                url: this.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
              }
            : {
                key: this.env.GENERALCOMPUTE_API_KEY ?? "",
                model: override.model,
                url:
                  this.env.GENERALCOMPUTE_BASE_URL ??
                  "https://api.generalcompute.com/v1",
              },
        ]
      : this.endpoints();
    for (const ep of endpoints) {
      try {
        const res = await fetch(`${ep.url}/chat/completions`, {
          body: JSON.stringify({
            messages,
            model: ep.model,
            ...(tools && tools.length > 0
              ? { reasoning_effort: "none", tools }
              : {}),
          }),
          headers: {
            Authorization: `Bearer ${ep.key}`,
            "Content-Type": "application/json",
          },
          method: "POST",
        });
        if (!res.ok) {
          throw new Error(
            `llm ${res.status}: ${truncate(await res.text(), 200)}`
          );
        }
        const data = (await res.json()) as {
          choices?: { message?: ChatMessage }[];
        };
        const msg = data.choices?.[0]?.message;
        if (!msg) {
          throw new Error("llm returned no choices");
        }
        return msg;
      } catch (error) {
        lastError = errMsg(error);
      }
    }
    throw new Error(`all LLM endpoints failed — ${lastError}`);
  }
}

const firecrawl = async (
  env: Env,
  path: string,
  body: Record<string, unknown>
): Promise<unknown> => {
  if (!env.FIRECRAWL_API_KEY) {
    throw new Error("FIRECRAWL_API_KEY is not set");
  }
  const res = await fetch(
    `${env.FIRECRAWL_BASE_URL ?? "https://api.firecrawl.dev"}${path}`,
    {
      body: JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    }
  );
  if (!res.ok) {
    throw new Error(`firecrawl ${path} failed ${res.status}`);
  }
  return (await res.json()) as unknown;
};

interface FirecrawlItem {
  title?: unknown;
  url?: unknown;
  description?: unknown;
  markdown?: unknown;
}

const toHit = (item: FirecrawlItem): Record<string, string> => {
  const title =
    typeof item.title === "string" ? item.title : String(item.url ?? "");
  let summary = "";
  if (typeof item.description === "string") {
    summary = item.description;
  } else if (typeof item.markdown === "string") {
    summary = item.markdown.slice(0, 500);
  }
  return { summary, title, url: String(item.url ?? "") };
};

const makeTools = (env: Env) => {
  const defs: Record<string, ToolDef> = {
    web_extract: {
      function: {
        description: "Fetch the full text content of a specific URL.",
        name: "web_extract",
        parameters: {
          properties: { url: { type: "string" } },
          required: ["url"],
          type: "object",
        },
      },
      type: "function",
    },
    web_search: {
      function: {
        description:
          "Search the live web for current facts. Returns titled results with URLs and short summaries.",
        name: "web_search",
        parameters: {
          properties: {
            limit: { type: "number" },
            query: { type: "string" },
          },
          required: ["query"],
          type: "object",
        },
      },
      type: "function",
    },
  };

  const executors: Record<
    string,
    (args: Record<string, unknown>) => Promise<unknown>
  > = {
    web_extract: async (args) => {
      const url = String(args.url ?? "");
      const data = (await firecrawl(env, "/v1/scrape", {
        formats: ["markdown"],
        url,
      })) as { markdown?: unknown };
      return {
        content:
          typeof data.markdown === "string"
            ? data.markdown.slice(0, 12_000)
            : "no readable content",
        url,
      };
    },
    web_search: async (args) => {
      const limit = Math.max(1, Math.min(10, Number(args.limit ?? 8)));
      const query = String(args.query ?? "");
      const data = (await firecrawl(env, "/v1/search", {
        limit,
        query,
      })) as { data?: unknown };
      const items = Array.isArray(data.data)
        ? (data.data as FirecrawlItem[])
        : [];
      return items.map(toHit);
    },
  };

  return { defs, executors };
};

const AGENT_TOOL_SETS: Record<string, string[]> = {
  code: ["web_search"],
  copy: [],
  evaluation: [],
  market: ["web_search", "web_extract"],
  orchestrator: [],
  pm: ["web_search"],
  support: [],
  web: ["web_search", "web_extract"],
};

const HANDLE_TO_ROUTE: Record<string, string> = {
  code: "code",
  copy: "copy",
  eval: "evaluation",
  mkt: "market",
  neb: "orchestrator",
  pm: "pm",
  res: "web",
  sup: "support",
};

const JSON_SHAPE =
  "Return ONLY a single JSON object as your final message. No prose, no code fences. Shape:";

const SYSTEM_PROMPTS: Record<string, string> = {
  code: `You are the Code Agent. You write, review and explain code ONLY for the task you are given. You may use web_search when current API/library docs would genuinely help; otherwise answer from your own knowledge. Keep code concrete and runnable.
${JSON_SHAPE} {"status":"completed | insufficient_context","language":"string","code":"string","explanation":"string","suggestions":["string"]}`,
  copy: `You are the Copywriting Agent. You draft messaging ONLY for the task you are given. Write for exactly the audience and tone stated; never invent one.
${JSON_SHAPE} {"status":"completed | insufficient_context","audience":"string","tone":"string","draft":"string","variants":["string"]}`,
  evaluation: `You are the Evaluation Agent. You judge whether a decision is right or wrong for the exact objective given. Weigh evidence from any provided prior work; call out weak evidence as assumptions.
${JSON_SHAPE} {"status":"completed | insufficient_context","decision":"BUILD | SKIP | INVESTIGATE","confidence":0.0,"reasoning":["string"],"risks":["string"],"assumptions":["string"],"alternatives":["string"],"recommendation":"string"}`,
  market: `You are the Market Analysis Agent. You analyze markets ONLY for the task given. Use web_search/web_extract when current competitive or pricing data strengthens the analysis; otherwise reason from the provided context. Mark inferences as inferences.
${JSON_SHAPE} {"status":"completed | insufficient_context","market_summary":"string","competitors":[{"name":"string","strengths":["string"],"weaknesses":["string"]}],"pricing":["string"],"revenue_signals":["string"],"market_gaps":["string"],"implementation_patterns":["string"],"sources":["string"]}`,
  orchestrator: `You are Nebula's orchestrator. Answer the user's question directly, drawing on the room context provided when relevant. You are a communicator, not a researcher: give the best answer you can in plain prose.
${JSON_SHAPE} {"status":"completed","answer":"the user-facing answer in plain prose"}`,
  pm: `You are the Product Agent. You turn ideas into specs, user stories and prioritized requirements for exactly the product stated. Use web_search only when external context genuinely sharpens the spec.
${JSON_SHAPE} {"status":"completed | insufficient_context","priority":"low | medium | high","user_stories":["As a ..., I want to ..., so that ..."],"requirements":["string"],"acceptance_criteria":["string"],"assumptions":["string"]}`,
  support: `You are the Support Agent. You answer product and support questions ONLY for the task given. Be concise and actionable; escalate to a human when needed.
${JSON_SHAPE} {"status":"completed | insufficient_context","category":"string","answer":"string","next_steps":["string"]}`,
  web: `You are the Web Research Agent. You research ONLY the task given. Decide which tool you need: start with web_search, use web_extract to read promising sources in full. Base every finding on actual tool results; never invent URLs or facts. Call tools only as needed.
${JSON_SHAPE} {"status":"completed | insufficient_context","topic":"string","findings":[{"title":"string","url":"string","summary":"string"}],"sources":["string"]}`,
};

const MAX_TOOL_STEPS = 8;
const MAX_RESULT_CHARS = 5000;

const runAgentLoop = async (
  llm: Llm,
  tools: ReturnType<typeof makeTools>,
  route: string,
  task: string,
  prior: Record<string, unknown>,
  memory?: string,
  jobModel?: string
): Promise<{ answer: Record<string, unknown>; calls: string[] }> => {
  const toolNames = AGENT_TOOL_SETS[route] ?? [];
  const toolDefs = toolNames
    .map((n) => tools.defs[n])
    .filter((t): t is ToolDef => t !== undefined);
  const messages: ChatMessage[] = [
    {
      content: SYSTEM_PROMPTS[route] ?? SYSTEM_PROMPTS.orchestrator ?? "",
      role: "system",
    },
    {
      content: [
        `Task: ${task}`,
        Object.keys(prior).length > 0
          ? `Prior specialist work (capped):\n${JSON.stringify(prior).slice(0, 5000)}`
          : "",
        memory && memory.trim().length > 0
          ? `Room context from long-term memory (prior conversations, to ground your answer and respect established facts/preferences):\n${memory.trim().slice(0, 6000)}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      role: "user",
    },
  ];
  const calls: string[] = [];

  for (let step = 0; step < MAX_TOOL_STEPS; step += 1) {
    const msg = await llm.chat(messages, toolDefs, jobModel);
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      messages.push({
        content: msg.content ?? null,
        role: "assistant",
        tool_calls: msg.tool_calls,
      });
      for (const call of msg.tool_calls) {
        const { name } = call.function;
        const executor = tools.executors[name];
        let resultText = "tool not found";
        if (executor) {
          try {
            const args = JSON.parse(call.function.arguments || "{}") as Record<
              string,
              unknown
            >;
            resultText = truncate(
              JSON.stringify(await executor(args)),
              MAX_RESULT_CHARS
            );
            calls.push(name);
          } catch (error) {
            resultText = `tool error: ${errMsg(error)}`;
          }
        }
        messages.push({
          content: resultText,
          role: "tool",
          tool_call_id: call.id,
        });
      }
      continue;
    }
    const content = msg.content ?? "";
    if (content.trim().length === 0) {
      throw new Error("agent returned an empty answer");
    }
    return { answer: extractJson(content), calls };
  }
  throw new Error(`agent exceeded ${MAX_TOOL_STEPS} tool steps`);
};

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

const renderMarket = (out: Record<string, unknown>): string => {
  const parts = [str(out.market_summary)];
  const comps = arr(out.competitors)
    .slice(0, 5)
    .map((c) => str((c as Record<string, unknown>).name))
    .filter(Boolean);
  if (comps.length > 0) {
    parts.push(`Key competitors: ${comps.join(", ")}.`);
  }
  const pricing = arr(out.pricing).slice(0, 4).map(String);
  if (pricing.length > 0) {
    parts.push(`Pricing: ${pricing.join("; ")}.`);
  }
  const gaps = arr(out.market_gaps).map(String);
  if (gaps.length > 0) {
    parts.push(`Gaps: ${gaps.join("; ")}.`);
  }
  return parts.filter(Boolean).join(" ");
};

const renderOutput = (route: string, out: Record<string, unknown>): string => {
  switch (route) {
    case "market": {
      return renderMarket(out);
    }
    case "web": {
      const bullets = arr(out.findings)
        .slice(0, 5)
        .map((f) => {
          const o = f as Record<string, unknown>;
          return `- ${str(o.title)}: ${str(o.summary)} (${str(o.url)})`;
        })
        .filter((b) => b.length > 3);
      return bullets.length > 0
        ? bullets.join("\n")
        : str(out.topic) || "No findings.";
    }
    case "evaluation": {
      const parts = [`Decision: ${str(out.decision) || "INVESTIGATE"}.`];
      const rec = str(out.recommendation);
      if (rec.length > 0) {
        parts.push(rec);
      }
      const risks = arr(out.risks).map(String);
      if (risks.length > 0) {
        parts.push(`Risks: ${risks.join("; ")}.`);
      }
      return parts.join(" ");
    }
    case "code": {
      const parts = [str(out.explanation), "", "```", str(out.code), "```"];
      const suggestions = arr(out.suggestions).map(String);
      if (suggestions.length > 0) {
        parts.push(`Suggestions: ${suggestions.join("; ")}.`);
      }
      return parts.filter((p) => p.length > 0 || p === "").join("\n");
    }
    case "copy": {
      const draft = str(out.draft);
      const variants = arr(out.variants).slice(0, 3).map(String);
      return variants.length > 0
        ? `${draft}\n\nAlternatives: ${variants.join(" | ")}`
        : draft;
    }
    case "pm": {
      const parts: string[] = [];
      const priority = str(out.priority);
      if (priority.length > 0) {
        parts.push(`Priority: ${priority}.`);
      }
      const stories = arr(out.user_stories).slice(0, 5).map(String);
      if (stories.length > 0) {
        parts.push(`User stories:\n- ${stories.join("\n- ")}`);
      }
      const reqs = arr(out.requirements).slice(0, 5).map(String);
      if (reqs.length > 0) {
        parts.push(`Requirements: ${reqs.join("; ")}.`);
      }
      return parts.join("\n");
    }
    case "support": {
      const parts = [str(out.answer)];
      const steps = arr(out.next_steps).map(String);
      if (steps.length > 0) {
        parts.push(`Next steps: ${steps.join("; ")}.`);
      }
      return parts.filter(Boolean).join(" ");
    }
    default: {
      return str(out.answer) || JSON.stringify(out);
    }
  }
};

const JOB_CHUNK = 2000;

const signalMemoryUsed = async (
  stdb: Stdb,
  messageId: number
): Promise<void> => {
  try {
    await stdb.call("signal_event", [
      "memory_used",
      messageId,
      "drawing on this room's memory",
    ]);
  } catch (error) {
    console.error(`signal_event memory_used failed: ${errMsg(error)}`);
  }
};

const loadRoomMemory = async (
  stdb: Stdb,
  env: Env,
  job: AiJobRow,
  taggedAgent: number
): Promise<string | undefined> => {
  try {
    if (!env.HONCHO_API_KEY || !taggedAgent) {
      return undefined;
    }
    const rooms = await stdb.rows<RoomRow>(
      `SELECT * FROM room WHERE room_id = ${Number(job.room_id)}`
    );
    const [room] = rooms;
    if (!room || room.memory_backend !== "honcho") {
      return undefined;
    }
    const chats = await stdb.rows<ChatRow>(
      `SELECT * FROM message WHERE room_id = ${Number(job.room_id)}`
    );
    await recordMessages(
      env,
      room.memory_namespace,
      chats
        .filter((m) => m.body.trim().length > 0)
        .map((m) => ({
          body: m.body,
          messageId: Number(m.message_id),
          peerId:
            optSome<number>(m.author_agent) === undefined
              ? `user_${identityStr(m.author)}`
              : `agent_${Number(optSome<number>(m.author_agent))}`,
        }))
    );
    const mem = await pullRoomMemory(
      env,
      room.memory_namespace,
      job.prompt,
      taggedAgent,
      identityStr(job.created_by)
    );
    return mem.context || undefined;
  } catch (error) {
    console.error(`load room memory failed: ${errMsg(error)}`);
    return undefined;
  }
};

const writeRoomMemory = async (
  stdb: Stdb,
  env: Env,
  job: AiJobRow,
  taggedAgent: number,
  messageId: number,
  answer: string
): Promise<void> => {
  try {
    if (!env.HONCHO_API_KEY || !taggedAgent || answer.length === 0) {
      return;
    }
    const rooms = await stdb.rows<RoomRow>(
      `SELECT * FROM room WHERE room_id = ${Number(job.room_id)}`
    );
    const [room] = rooms;
    if (!room || room.memory_backend !== "honcho") {
      return;
    }
    await recordMessages(env, room.memory_namespace, [
      {
        body: answer,
        messageId,
        peerId: `agent_${taggedAgent}`,
      },
    ]);
    await stdb.call("push_room_memory", [
      null,
      Number(job.room_id),
      answer.slice(0, 800),
      Number(job.thread_id),
      1,
    ]);
    console.log(`job ${Number(job.job_id)} wrote room memory`);
  } catch (error) {
    console.error(`write room memory failed: ${errMsg(error)}`);
  }
};

interface ProcessResult {
  errors: string[];
  failed: number;
  processed: number;
}

const processOneJob = async (
  stdb: Stdb,
  llm: Llm,
  tools: ReturnType<typeof makeTools>,
  env: Env,
  job: AiJobRow
): Promise<number> => {
  const jobId = Number(job.job_id);
  const agents = await stdb.rows<AgentRow>("SELECT agent_id, name FROM agent");
  const tagged = optSome(job.tagged_agent);
  const agentRow = agents.find(
    (a: AgentRow) => Number(a.agent_id) === Number(tagged)
  );
  const firstWord = agentRow
    ? (agentRow.name.split(" ")[0] ?? "").toLowerCase()
    : "";
  const route = HANDLE_TO_ROUTE[firstWord] ?? "orchestrator";

  const replies = await stdb.rows<MessageRow>(
    `SELECT * FROM message WHERE thread_id = ${Number(job.thread_id)} AND streaming = true`
  );
  const sorted = [...replies].toSorted(
    (a: MessageRow, b: MessageRow) =>
      Number(a.message_id) - Number(b.message_id)
  );
  const newest = sorted.at(-1);
  const messageId = Number(newest?.message_id ?? 0);
  if (messageId === 0) {
    throw new Error("no streaming reply message found after claim");
  }

  await stdb.call("signal_event", [
    "thinking",
    messageId,
    `Running ${firstWord || "agent"}…`,
  ]);

  const memory = await loadRoomMemory(stdb, env, job, Number(tagged ?? 0));
  if (memory) {
    await signalMemoryUsed(stdb, messageId);
  }

  const { answer, calls } = await runAgentLoop(
    llm,
    tools,
    route,
    job.prompt,
    {},
    memory,
    optSome(job.model)
  );
  const finalBody = renderOutput(route, answer).trim();
  if (finalBody.length === 0) {
    throw new Error("agent produced an empty answer");
  }

  const deltas = chunkSplit(finalBody, JOB_CHUNK);
  for (const [idx, delta] of deltas.entries()) {
    await stdb.call("append_chunk", [delta, idx, messageId]);
    await sleep(12);
  }
  await stdb.call("complete_job", ["", jobId, messageId]);
  await writeRoomMemory(
    stdb,
    env,
    job,
    Number(tagged ?? 0),
    messageId,
    finalBody
  );
  console.log(
    `job ${jobId} done via ${route}${calls.length > 0 ? ` tools=[${[...new Set(calls)].join(",")}]` : ""}`
  );
  return messageId;
};

export const processJobs = async (env: Env): Promise<ProcessResult> => {
  const stdb = new Stdb(
    env.SPACETIMEDB_HOST,
    env.SPACETIMEDB_DB,
    env.SPACETIMEDB_TOKEN
  );
  const llm = new Llm(env, env.MODEL ?? "openai::gpt-5.6-luna");
  const tools = makeTools(env);

  await stdb.call("register_worker", ["nebula-cf-worker"]).catch(() => {
    /* empty */
  });

  const jobs = await stdb.rows<AiJobRow>(
    "SELECT * FROM ai_job WHERE status = 0"
  );
  const errors: string[] = [];
  let processed = 0;
  let failed = 0;

  for (const job of jobs) {
    const jobId = Number(job.job_id);
    let messageId = 0;
    try {
      await stdb.call("claim_job", [jobId]);
      messageId = await processOneJob(stdb, llm, tools, env, job);
      processed += 1;
    } catch (error) {
      failed += 1;
      const note = errMsg(error);
      errors.push(
        `job ${jobId}: ${note} | ${error instanceof Error && error.stack ? error.stack.split("\n").slice(0, 4).join(" > ") : ""}`
      );
      console.error(`job ${jobId} failed: ${note}`);
      if (messageId > 0) {
        try {
          await stdb.call("fail_job", [note.slice(0, 400), jobId, messageId]);
        } catch (innerError) {
          console.error(`job ${jobId} fail_job failed: ${errMsg(innerError)}`);
        }
      }
    }
  }
  return { errors, failed, processed };
};

export class QueuePoller {
  private state: DurableObjectState;
  private env: Env;
  private pollDelayMs = 1200;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    await this.ensurePolling();
    const url = new URL(request.url);
    if (url.pathname === "/process") {
      try {
        const result = await processJobs(this.env);
        return Response.json(result);
      } catch (error) {
        return Response.json({ error: errMsg(error) }, { status: 500 });
      }
    }
    return Response.json({ mode: "durable-object", ok: true });
  }

  async alarm(): Promise<void> {
    try {
      await processJobs(this.env);
    } catch (error) {
      console.error(`poller tick failed: ${errMsg(error)}`);
    }
    await this.state.storage.setAlarm(Date.now() + this.pollDelayMs);
  }

  private async ensurePolling(): Promise<void> {
    const current = await this.state.storage.getAlarm();
    if (current === null) {
      await this.state.storage.setAlarm(Date.now() + this.pollDelayMs);
    }
  }
}

export default {
  fetch(request: Request, env: Env): Response | Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true });
    }
    if (url.pathname === "/start") {
      const id = env.QUEUE_POLLER.idFromName("agent-queue");
      const stub = env.QUEUE_POLLER.get(id);
      return stub.fetch("https://nebula-agent-worker/start");
    }
    if (url.pathname === "/process") {
      if (
        env.CRON_SECRET &&
        url.searchParams.get("secret") !== env.CRON_SECRET
      ) {
        return Response.json({ error: "unauthorized" }, { status: 401 });
      }
      // Route through the Durable Object so there's exactly one poller and
      // it never races the DO alarm over the same job.
      const id = env.QUEUE_POLLER.idFromName("agent-queue");
      const stub = env.QUEUE_POLLER.get(id);
      return stub.fetch("https://nebula-agent-worker/process");
    }
    return Response.json({ error: "not found" }, { status: 404 });
  },
};
