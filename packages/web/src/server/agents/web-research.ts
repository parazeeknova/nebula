import { webResearchSystem } from "./prompts";
import { runAgent, toStatus } from "./runner";
import type { WebResearchOutput } from "./types";

export const runWebResearch = async (
  task: string,
  _context?: unknown,
  memory?: string,
  model?: string
): Promise<WebResearchOutput> => {
  const raw = await runAgent<WebResearchOutput>(
    "web",
    { maxSteps: 6, system: webResearchSystem(), tools: [] },
    task,
    { memory, model }
  );
  return {
    findings: Array.isArray(raw.findings) ? raw.findings : [],
    sources: Array.isArray(raw.sources) ? raw.sources : [],
    status: toStatus(raw.status),
    topic: typeof raw.topic === "string" ? raw.topic : task,
  };
};
