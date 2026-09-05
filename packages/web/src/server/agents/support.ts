import { supportSystem } from "./prompts";
import { runAgent, toStatus } from "./runner";
import type { SupportOutput } from "./types";

export const runSupport = async (
  task: string,
  _context?: unknown,
  memory?: string,
  model?: string
): Promise<SupportOutput> => {
  const raw = await runAgent<SupportOutput>(
    "support",
    { maxSteps: 4, system: supportSystem(), tools: [] },
    task,
    { memory, model }
  );
  return {
    answer: typeof raw.answer === "string" ? raw.answer : "",
    category: typeof raw.category === "string" ? raw.category : "",
    next_steps: Array.isArray(raw.next_steps) ? raw.next_steps : [],
    status: toStatus(raw.status),
  };
};
