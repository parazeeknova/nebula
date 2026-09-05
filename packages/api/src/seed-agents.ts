// One-off bootstrap: ensure the 4 default agents exist in every workspace and
// are present in every active room (so @mentions work). Idempotent.
import { config } from "./config";
import { DbConnection } from "./module_bindings";

const log = (...args: unknown[]): void => {
  console.info(new Date().toISOString(), "[seed]", ...args);
};

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

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const subscribeOnce = (conn: DbConnection, queries: string[]): Promise<void> =>
  new Promise((resolve, reject) => {
    conn
      .subscriptionBuilder()
      .onApplied(() => resolve())
      .onError((ctx) => reject(ctx.event ?? new Error("subscription error")))
      .subscribe(queries);
  });

const main = async (): Promise<void> => {
  log(
    `seeding default agents on ${config.spacetimedbHost}/${config.spacetimedbDb}`
  );
  const conn = await new Promise<DbConnection>((resolve, reject) => {
    try {
      DbConnection.builder()
        .withUri(config.spacetimedbHost)
        .withDatabaseName(config.spacetimedbDb)
        .withToken(config.spacetimedbToken || undefined)
        .onConnect((c) => {
          resolve(c);
        })
        .onConnectError((_ctx, error) => {
          reject(error);
        })
        .build();
    } catch (error) {
      reject(error as Error);
    }
  });
  await subscribeOnce(conn, [
    "SELECT * FROM workspace",
    "SELECT * FROM agent",
    "SELECT * FROM room",
    "SELECT * FROM room_agent",
  ]);

  for (const ws of conn.db.workspace.iter()) {
    const existing = new Set<string>();
    for (const a of conn.db.agent.iter()) {
      existing.add(a.name);
    }
    for (const def of DEFAULT_AGENTS) {
      if (existing.has(def.name)) {
        log(`workspace ${ws.workspaceId}: ${def.name} already registered`);
        continue;
      }
      // eslint-disable-next-line no-await-in-loop -- sequential reducer calls
      await conn.reducers.registerAgent({
        modelName: def.model_name,
        modelProvider: def.model_provider,
        name: def.name,
        systemPrompt: def.system_prompt,
        tools: [...def.tools],
        workspaceId: ws.workspaceId,
      });
      log(`workspace ${ws.workspaceId}: registered ${def.name}`);
      // eslint-disable-next-line no-await-in-loop -- let the insert land before the next
      await sleep(200);
    }
  }

  // Refresh cache, then add every agent to every active room.
  await subscribeOnce(conn, [
    "SELECT * FROM agent",
    "SELECT * FROM room",
    "SELECT * FROM room_agent",
  ]);
  await sleep(300);
  for (const room of conn.db.room.iter()) {
    if (room.status !== 0) {
      continue;
    }
    for (const ag of conn.db.agent.iter()) {
      const inRoom = [...conn.db.roomAgent.iter()].some(
        (ra) => ra.roomId === room.roomId && ra.agentId === ag.agentId
      );
      if (!inRoom) {
        // eslint-disable-next-line no-await-in-loop -- sequential reducer calls
        await conn.reducers.addAgentToRoom({
          agentId: ag.agentId,
          roomId: room.roomId,
        });
        log(`room ${room.roomId}: added ${ag.name}`);
      }
    }
  }
  log("seed complete");
  try {
    conn.disconnect();
  } catch {
    // ignore
  }
  process.exit(0);
};

(async () => {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
