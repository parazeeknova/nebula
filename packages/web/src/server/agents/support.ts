import { chatJson } from "../llm";
import { memoryBlock, supportSystem } from "./prompts";
import type { SupportOutput, TaskContext } from "./types";

export const runSupport = (
  task: string,
  context?: TaskContext,
  memory?: string
): Promise<SupportOutput> => {
  const parts = [`Task: ${task}`];
  if (context?.industry) {
    parts.push(`Stated industry/domain: ${context.industry}`);
  }
  const mem = memoryBlock(memory);
  if (mem) {
    parts.push(mem.trim());
  }
  return chatJson<SupportOutput>(supportSystem(), parts.join("\n\n"));
};
