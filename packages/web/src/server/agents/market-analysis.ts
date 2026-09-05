import { chatJson } from "../llm";
import { marketAnalysisSystem } from "./prompts";
import type {
  MarketAnalysisOutput,
  TaskContext,
  WebResearchOutput,
} from "./types";

export const runMarketAnalysis = (
  task: string,
  context?: TaskContext,
  research?: WebResearchOutput
): Promise<MarketAnalysisOutput> => {
  const parts = [`Task: ${task}`];
  if (context?.industry) {
    parts.push(`Stated industry/domain: ${context.industry}`);
  }
  parts.push(`Web research: ${research ? JSON.stringify(research) : "none"}`);
  return chatJson<MarketAnalysisOutput>(
    marketAnalysisSystem(),
    parts.join("\n\n")
  );
};
