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
  "Content-Type": "application/json",
  "X-API-Key": env.HONCHO_API_KEY ?? "",
});

const sessionPath = (env: EnvLike, namespace: string): string =>
  `${base(env)}/v2/workspaces/${env.HONCHO_WORKSPACE_ID ?? "nebula"}/sessions/${namespace}`;

const humanPeer = (identity: string): string => `user_${identity}`;
const agentPeer = (agentId: number): string => `agent_${agentId}`;

const getOrCreateSession = async (
  env: EnvLike,
  namespace: string
): Promise<boolean> => {
  const res = await fetch(sessionPath(env, namespace), {
    headers: headers(env),
    method: "GET",
  });
  if (res.ok) {
    return true;
  }
  if (res.status === 404) {
    const created = await fetch(
      `${base(env)}/v2/workspaces/${env.HONCHO_WORKSPACE_ID ?? "nebula"}/sessions`,
      {
        body: JSON.stringify({ id: namespace }),
        headers: headers(env),
        method: "POST",
      }
    );
    return created.ok;
  }
  throw new Error(
    `honcho session ${res.status}: ${truncate(await res.text(), 200)}`
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
  const page = await fetch(
    `${sessionPath(env, namespace)}/messages?reverse=true&size=100`,
    {
      headers: headers(env),
    }
  );
  if (page.ok) {
    const data = (await page.json()) as {
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
      peerId: m.peerId,
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
  messages?: { peerId: string; content: string }[];
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
  const res = await fetch(`${sessionPath(env, namespace)}/context`, {
    body: JSON.stringify({
      peerPerspective: agentPeer(assistantAgentId),
      peerTarget: humanPeer(creatorIdentity),
      representationOptions: {
        maxConclusions: 10,
        searchQuery: prompt,
        searchTopK: 8,
      },
      summary: true,
      tokens: 3000,
    }),
    headers: headers(env),
    method: "POST",
  });
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
    lines.push(`${m.peerId}: ${m.content}`);
  }
  const context = lines.join("\n");
  return { context, hasHistory: context.length > 0 };
};
