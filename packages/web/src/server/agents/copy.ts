import { chatJson } from "../llm";
import { copySystem, memoryBlock } from "./prompts";
import type { CopyOutput, TaskContext } from "./types";

export const runCopy = (
  task: string,
  context?: TaskContext,
  memory?: string
): Promise<CopyOutput> => {
  const parts = [`Task: ${task}`];
  if (context?.industry) {
    parts.push(`Stated industry/domain: ${context.industry}`);
  }
  const mem = memoryBlock(memory);
  if (mem) {
    parts.push(mem.trim());
  }
  return chatJson<CopyOutput>(copySystem(), parts.join("\n\n"));
};
