import { Honcho } from "@honcho-ai/sdk";
import type { MessageInput, Session } from "@honcho-ai/sdk";

import { config } from "./config";

/**
 * Per-room long-term memory backed by Honcho (https://honcho.dev).
 *
 * A room maps to a single Honcho session keyed by the room's `memory_namespace`
 * so that every agent in the room shares one evolving context. Humans are
 * peers named `user:<identity>`; agents are peers named `agent:<agentId>`.
 */

let clientPromise: Promise<Honcho> | null = null;

const getClient = (): Promise<Honcho> => {
  if (!clientPromise) {
    if (!config.honchoApiKey) {
      return Promise.reject(new Error("HONCHO_API_KEY is not configured"));
    }
    clientPromise = Promise.resolve(
      new Honcho({
        apiKey: config.honchoApiKey,
        baseURL: config.honchoBaseUrl,
        workspaceId: config.honchoWorkspaceId,
      })
    );
  }
  return clientPromise;
};

/** Human peer id for a SpacetimeDB identity (hex, no colons). */
export const humanPeerId = (identity: string): string => `user_${identity}`;

/** Agent peer id for a SpacetimeDB agent row. */
export const agentPeerId = (agentId: bigint): string => `agent_${agentId}`;

/** Lazy get-or-create the session backing a room. */
export const roomSession = async (
  namespace: string
): Promise<{
  honcho: Honcho;
  session: Session;
}> => {
  const honcho = await getClient();
  const session = await honcho.session(namespace);
  return { honcho, session };
};

const truncate = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max)}…` : value;

interface RoomMessage {
  body: string;
  messageId: bigint;
  peerId: string;
}

/**
 * Record messages into the room's session, skipping ones already stored.
 * Messages carry their SpacetimeDB `message_id` in metadata for dedup.
 */
export const recordMessages = async (
  namespace: string,
  messages: RoomMessage[]
): Promise<void> => {
  if (messages.length === 0) {
    return;
  }
  const { session } = await roomSession(namespace);
  const existing = new Set<string>();
  const firstPage = await session.messages({ reverse: true, size: 100 });
  for (const msg of firstPage.items) {
    const ref = msg.metadata?.nebula_message_id;
    if (typeof ref === "string") {
      existing.add(ref);
    }
  }
  const toAdd: MessageInput[] = [];
  for (const m of messages) {
    const ref = String(m.messageId);
    if (existing.has(ref)) {
      continue;
    }
    toAdd.push({
      content: truncate(m.body, 8000),
      metadata: { nebula_message_id: ref },
      peerId: m.peerId,
    });
  }
  if (toAdd.length > 0) {
    await session.addMessages(toAdd);
  }
};

export interface RoomMemory {
  /** Conversation context (messages + summary) formatted for an LLM. */
  context: string;
  /** The target peer's representation from the assistant's perspective. */
  representation: string | null;
  /** True when the room has any stored history at all. */
  hasHistory: boolean;
}

/**
 * Pull the memory context Honcho has for a room, scoped to the current prompt.
 * `assistantPeer` is the peer the assistant speaks as; `targetPeer` is the
 * peer whose representation we want (usually the most recent human).
 */
export const pullRoomMemory = async (
  namespace: string,
  options?: {
    assistantPeer?: string;
    prompt?: string;
    targetPeer?: string;
  }
): Promise<RoomMemory> => {
  const { session } = await roomSession(namespace);
  const prompt = options?.prompt ?? "";
  const context = await session.context({
    peerPerspective: options?.assistantPeer,
    peerTarget: options?.targetPeer,
    representationOptions: {
      maxConclusions: 10,
      searchQuery: prompt,
      searchTopK: 8,
    },
    summary: true,
    tokens: 3000,
  });

  const lines: string[] = [];
  if (context.summary?.content) {
    lines.push(`Summary: ${context.summary.content}`);
  }
  for (const m of context.messages) {
    lines.push(`${m.peerId}: ${m.content}`);
  }
  const formatted = lines.length > 0 ? lines.join("\n") : "";
  return {
    context: formatted,
    hasHistory: formatted.length > 0,
    representation: context.peerRepresentation,
  };
};
