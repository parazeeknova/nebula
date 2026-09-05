import { chatJson } from "../llm";
import { memoryBlock, productSystem } from "./prompts";
import type { ProductOutput, TaskContext } from "./types";

export const runProduct = (
  task: string,
  context?: TaskContext,
  memory?: string
): Promise<ProductOutput> => {
  const parts = [`Task: ${task}`];
  if (context?.industry) {
    parts.push(`Stated industry/domain: ${context.industry}`);
  }
  const mem = memoryBlock(memory);
  if (mem) {
    parts.push(mem.trim());
  }
  return chatJson<ProductOutput>(productSystem(), parts.join("\n\n"));
};
