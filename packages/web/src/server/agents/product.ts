import { productSystem } from "./prompts";
import { runAgent, toStatus } from "./runner";
import type { ProductOutput } from "./types";

export const runProduct = async (
  task: string,
  _context?: unknown,
  memory?: string,
  model?: string
): Promise<ProductOutput> => {
  const raw = await runAgent<ProductOutput>(
    "pm",
    { maxSteps: 4, system: productSystem(), tools: [] },
    task,
    { memory, model }
  );
  return {
    acceptance_criteria: Array.isArray(raw.acceptance_criteria)
      ? raw.acceptance_criteria
      : [],
    assumptions: Array.isArray(raw.assumptions) ? raw.assumptions : [],
    priority: typeof raw.priority === "string" ? raw.priority : "medium",
    requirements: Array.isArray(raw.requirements) ? raw.requirements : [],
    status: toStatus(raw.status),
    user_stories: Array.isArray(raw.user_stories) ? raw.user_stories : [],
  };
};
