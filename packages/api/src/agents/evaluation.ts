import { chatJson } from "../llm";
import { evaluationSystem } from "./prompts";
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
  market?: MarketAnalysisOutput
): Promise<EvaluationOutput> => {
  const parts = [`Objective: ${task}`];
  if (context?.industry) {
    parts.push(`Stated industry/domain: ${context.industry}`);
  }
  parts.push(
    `Supporting context: ${JSON.stringify({
      market_analysis: market ?? null,
      web_research: research ?? null,
    })}`
  );
  return chatJson<EvaluationOutput>(evaluationSystem(), parts.join("\n\n"));
};
