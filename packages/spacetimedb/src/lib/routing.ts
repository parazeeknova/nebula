// Pure helpers for prompt routing decisions.
// Runs in the external worker AND in bun tests — never inside reducers
// (reducers must stay deterministic and side-effect free).

export const TOOL_HINTS = [
  "search",
  "look up",
  "latest",
  "browse",
  "fetch",
  "docs",
  "paper",
  "news",
] as const;

/** Extract @mentions of the form @agent-name or @agent_12 from a message body. */
export const extractMentionTokens = (body: string): string[] => {
  const out: string[] = [];
  const re = /@(?<mention>[A-Za-z0-9_-]+)/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const name = m.groups?.mention;
    if (name) {
      out.push(name);
    }
  }
  return out;
};

/** Cheap heuristic: does this prompt look like it needs a tool call? */
export const looksLikeToolUse = (prompt: string): boolean => {
  const lower = prompt.toLowerCase();
  return TOOL_HINTS.some((h) => lower.includes(h));
};

export type RoutingHint = "memory" | "tool" | "direct";

/**
 * Decide the routing *hint* the worker should use as a starting point.
 * The worker still loads room memory + agent config and makes the final call.
 */
export const routingHint = (opts: {
  prompt: string;
  taggedAgent: boolean;
  hasRoomMemory: boolean;
}): RoutingHint => {
  if (opts.taggedAgent) {
    return "tool";
  }
  if (looksLikeToolUse(opts.prompt)) {
    return "tool";
  }
  if (opts.hasRoomMemory) {
    return "memory";
  }
  return "direct";
};

export const normalizePrompt = (prompt: string): string =>
  prompt.trim().replaceAll(/\s+/gu, " ").slice(0, 4000);

export const assertNonEmpty = (value: string, field: string): string => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${field} must not be empty`);
  }
  if (trimmed.length > 8000) {
    throw new Error(`${field} exceeds 8000 characters`);
  }
  return trimmed;
};
