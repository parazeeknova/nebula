import { evaluationSystem } from "./prompts";
import { runAgent, toStatus } from "./runner";
import type { EvaluationOutput } from "./types";

export const runEvaluation = async (
  task: string,
  _context?: unknown,
  prior?: object,
  _memory?: string,
  model?: string
): Promise<EvaluationOutput> => {
  const raw = await runAgent<EvaluationOutput>(
    "evaluation",
    { maxSteps: 4, system: evaluationSystem(), tools: [] },
    task,
    { model, prior }
  );
  return {
    alternatives: Array.isArray(raw.alternatives) ? raw.alternatives : [],
    assumptions: Array.isArray(raw.assumptions) ? raw.assumptions : [],
    confidence:
      typeof raw.confidence === "number"
        ? Math.min(1, Math.max(0, raw.confidence))
        : 0,
    decision: typeof raw.decision === "string" ? raw.decision : "INVESTIGATE",
    reasoning: Array.isArray(raw.reasoning) ? raw.reasoning : [],
    recommendation:
      typeof raw.recommendation === "string" ? raw.recommendation : "",
    risks: Array.isArray(raw.risks) ? raw.risks : [],
    status: toStatus(raw.status),
  };
};
