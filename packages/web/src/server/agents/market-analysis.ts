import { chatJson } from "../llm";
import { marketAnalysisSystem, memoryBlock } from "./prompts";
import type {
  MarketAnalysisOutput,
  TaskContext,
  WebResearchOutput,
} from "./types";

export const runMarketAnalysis = (
  task: string,
  context?: TaskContext,
  research?: WebResearchOutput,
  memory?: string
): Promise<MarketAnalysisOutput> => {
  const parts = [`Task: ${task}`];
  if (context?.industry) {
    parts.push(`Stated industry/domain: ${context.industry}`);
  }
  const mem = memoryBlock(memory);
  if (mem) {
    parts.push(mem.trim());
  }
  parts.push(`Web research: ${research ? JSON.stringify(research) : "none"}`);
  return chatJson<MarketAnalysisOutput>(
    marketAnalysisSystem(),
    parts.join("\n\n")
  );
};
