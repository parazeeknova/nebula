import { chatJson } from "../llm";
import { evaluationSystem, memoryBlock } from "./prompts";
import type {
  EvaluationOutput,
  MarketAnalysisOutput,
  TaskContext,
  WebResearchOutput,
} from "./types";

export const runEvaluation = (
  task: string,
  context?: TaskContext,
  research?: WebResearchOutput,
  market?: MarketAnalysisOutput,
  memory?: string
): Promise<EvaluationOutput> => {
  const parts = [`Objective: ${task}`];
  if (context?.industry) {
    parts.push(`Stated industry/domain: ${context.industry}`);
  }
  const mem = memoryBlock(memory);
  if (mem) {
    parts.push(mem.trim());
  }
  parts.push(
    `Supporting context: ${JSON.stringify({
      market_analysis: market ?? null,
      web_research: research ?? null,
    })}`
  );
  return chatJson<EvaluationOutput>(evaluationSystem(), parts.join("\n\n"));
};
