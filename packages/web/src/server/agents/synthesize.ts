import { chatJson, streamChatText } from "../llm";
import { memoryBlock, synthesisSystem, synthesisSystemText } from "./prompts";
import type { AgentResults, FinalAnswer } from "./types";

export const synthesize = (
  originalPrompt: string,
  results: AgentResults,
  memory?: string
): Promise<FinalAnswer> =>
  chatJson<FinalAnswer>(
    synthesisSystem(),
    `Original prompt: ${originalPrompt}${memoryBlock(memory)}\n\nweb_result: ${JSON.stringify(results.web_result)}\n\nmarket_result: ${JSON.stringify(results.market_result)}\n\ncode_result: ${JSON.stringify(results.code_result)}\n\ncopy_result: ${JSON.stringify(results.copy_result)}\n\npm_result: ${JSON.stringify(results.pm_result)}\n\nsupport_result: ${JSON.stringify(results.support_result)}\n\nevaluation_result: ${JSON.stringify(results.evaluation_result)}`
  );

export const synthesizeStream = async (
  originalPrompt: string,
  results: AgentResults,
  memory: string | undefined,
  onToken: (token: string) => Promise<void>
): Promise<FinalAnswer> => {
  const answer = await streamChatText(
    synthesisSystemText(),
    `Original prompt: ${originalPrompt}${memoryBlock(memory)}\n\nweb_result: ${JSON.stringify(results.web_result)}\n\nmarket_result: ${JSON.stringify(results.market_result)}\n\ncode_result: ${JSON.stringify(results.code_result)}\n\ncopy_result: ${JSON.stringify(results.copy_result)}\n\npm_result: ${JSON.stringify(results.pm_result)}\n\nsupport_result: ${JSON.stringify(results.support_result)}\n\nevaluation_result: ${JSON.stringify(results.evaluation_result)}`,
    { onToken }
  );
  return { answer };
};
