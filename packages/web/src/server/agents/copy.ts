import { copySystem } from "./prompts";
import { runAgent, toStatus } from "./runner";
import type { CopyOutput } from "./types";

export const runCopy = async (
  task: string,
  _context?: unknown,
  memory?: string,
  model?: string
): Promise<CopyOutput> => {
  const raw = await runAgent<CopyOutput>(
    "copy",
    { maxSteps: 4, system: copySystem(), tools: [] },
    task,
    { memory, model }
  );
  return {
    audience: typeof raw.audience === "string" ? raw.audience : "",
    draft: typeof raw.draft === "string" ? raw.draft : "",
    status: toStatus(raw.status),
    tone: typeof raw.tone === "string" ? raw.tone : "",
    variants: Array.isArray(raw.variants) ? raw.variants : [],
  };
};
