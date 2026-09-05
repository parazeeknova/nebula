import { chatJson } from "../llm";
import { codeSystem, memoryBlock } from "./prompts";
import type { CodeOutput, TaskContext } from "./types";

export const runCode = (
  task: string,
  context?: TaskContext,
  memory?: string
): Promise<CodeOutput> => {
  const parts = [`Task: ${task}`];
  if (context?.industry) {
    parts.push(`Stated industry/domain: ${context.industry}`);
  }
  const mem = memoryBlock(memory);
  if (mem) {
    parts.push(mem.trim());
  }
  return chatJson<CodeOutput>(codeSystem(), parts.join("\n\n"));
};
