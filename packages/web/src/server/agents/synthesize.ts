import { chatJson } from "../llm";
import { memoryBlock, synthesisSystem } from "./prompts";
import type { AgentResults, FinalAnswer } from "./types";

export const synthesize = (
  originalPrompt: string,
  results: AgentResults,
  memory?: string
): Promise<FinalAnswer> =>
  chatJson<FinalAnswer>(
    synthesisSystem(),
    `Original prompt: ${originalPrompt}${memoryBlock(memory)}\n\nweb_result: ${JSON.stringify(results.web_result)}\n\nmarket_result: ${JSON.stringify(results.market_result)}\n\nevaluation_result: ${JSON.stringify(results.evaluation_result)}`
  );
