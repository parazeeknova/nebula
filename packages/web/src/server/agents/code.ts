import { codeSystem } from "./prompts";
import { runAgent, toStatus } from "./runner";
import type { CodeOutput } from "./types";

export const runCode = async (
  task: string,
  _context?: unknown,
  memory?: string,
  model?: string
): Promise<CodeOutput> => {
  const raw = await runAgent<CodeOutput>(
    "code",
    { maxSteps: 4, system: codeSystem(), tools: [] },
    task,
    { memory, model }
  );
  return {
    code: typeof raw.code === "string" ? raw.code : "",
    explanation: typeof raw.explanation === "string" ? raw.explanation : "",
    language: typeof raw.language === "string" ? raw.language : "",
    status: toStatus(raw.status),
    suggestions: Array.isArray(raw.suggestions) ? raw.suggestions : [],
  };
};
