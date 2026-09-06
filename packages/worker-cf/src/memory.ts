import { truncate } from "./truncate";

export interface EnvLike {
  HONCHO_API_KEY?: string;
  HONCHO_BASE_URL?: string;
  HONCHO_WORKSPACE_ID?: string;
}

export interface RoomMemory {
  context: string;
  hasHistory: boolean;
}

const base = (env: EnvLike): string =>
  env.HONCHO_BASE_URL ?? "https://api.honcho.dev";

const headers = (env: EnvLike): HeadersInit => ({
  Authorization: `Bearer ${env.HONCHO_API_KEY ?? ""}`,
  "Content-Type": "application/json",
});

const sessionPath = (env: EnvLike, namespace: string): string =>
  `${base(env)}/v3/workspaces/${env.HONCHO_WORKSPACE_ID ?? "nebula"}/sessions/${namespace}`;

const humanPeer = (identity: string): string => `user_${identity}`;
const agentPeer = (agentId: number): string => `agent_${agentId}`;

const getOrCreateSession = async (
  env: EnvLike,
  namespace: string
): Promise<boolean> => {
  const res = await fetch(
    `${base(env)}/v3/workspaces/${env.HONCHO_WORKSPACE_ID ?? "nebula"}/sessions`,
    {
      body: JSON.stringify({ id: namespace }),
      headers: headers(env),
      method: "POST",
    }
  );
  if (res.ok) {
    return true;
  }
  throw new Error(
    `honcho getOrCreate session ${res.status}: ${truncate(await res.text(), 200)}`
  );
};

interface ChatMessage {
  messageId: number;
  body: string;
  peerId: string;
}

export const recordMessages = async (
  env: EnvLike,
  namespace: string,
  messages: ChatMessage[]
): Promise<void> => {
  if (messages.length === 0 || !env.HONCHO_API_KEY) {
    return;
  }
  await getOrCreateSession(env, namespace);
  const existing = new Set<string>();
  const list = await fetch(`${sessionPath(env, namespace)}/messages/list`, {
    body: JSON.stringify({ reverse: true, size: 100 }),
    headers: headers(env),
    method: "POST",
  });
  if (list.ok) {
    const data = (await list.json()) as {
      items?: { metadata?: { nebula_message_id?: unknown } }[];
    };
    for (const item of data.items ?? []) {
      const ref = item.metadata?.nebula_message_id;
      if (typeof ref === "string") {
        existing.add(ref);
      }
    }
  }
  const toAdd = messages
    .filter(
      (m) => !existing.has(String(m.messageId)) && m.body.trim().length > 0
    )
    .map((m) => ({
      content: truncate(m.body, 8000),
      metadata: { nebula_message_id: String(m.messageId) },
      peer_id: m.peerId,
    }));
  if (toAdd.length === 0) {
    return;
  }
  const res = await fetch(`${sessionPath(env, namespace)}/messages`, {
    body: JSON.stringify({ messages: toAdd }),
    headers: headers(env),
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(
      `honcho addMessages ${res.status}: ${truncate(await res.text(), 200)}`
    );
  }
};

interface HonchoContext {
  summary?: { content?: string };
  messages?: { content: string; peer_id: string }[];
  peerRepresentation?: string;
}

export const pullRoomMemory = async (
  env: EnvLike,
  namespace: string,
  prompt: string,
  assistantAgentId: number,
  creatorIdentity: string
): Promise<RoomMemory> => {
  if (!env.HONCHO_API_KEY) {
    return { context: "", hasHistory: false };
  }
  await getOrCreateSession(env, namespace);
  const query = new URLSearchParams({
    max_conclusions: "10",
    peer_perspective: agentPeer(assistantAgentId),
    peer_target: humanPeer(creatorIdentity),
    search_query: prompt,
    search_top_k: "8",
    summary: "true",
    tokens: "3000",
  });
  const res = await fetch(
    `${sessionPath(env, namespace)}/context?${query.toString()}`,
    { headers: headers(env) }
  );
  if (!res.ok) {
    throw new Error(
      `honcho context ${res.status}: ${truncate(await res.text(), 200)}`
    );
  }
  const ctx = (await res.json()) as HonchoContext;
  const lines: string[] = [];
  if (ctx.summary?.content) {
    lines.push(`Summary: ${ctx.summary.content}`);
  }
  for (const m of ctx.messages ?? []) {
    lines.push(`${m.peer_id}: ${m.content}`);
  }
  const context = lines.join("\n");
  return { context, hasHistory: context.length > 0 };
};
