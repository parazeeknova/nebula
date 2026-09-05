import { firecrawlSearch } from "../firecrawl";
import { chatJson } from "../llm";
import { memoryBlock, webResearchSystem } from "./prompts";
import type { TaskContext, WebResearchOutput } from "./types";

export const runWebResearch = async (
  task: string,
  context?: TaskContext,
  memory?: string
): Promise<WebResearchOutput> => {
  const results = await firecrawlSearch(task);
  const listing =
    results.length > 0
      ? results
          .map((r, i) => `${i + 1}. ${r.title} (${r.url})\n${r.summary}`)
          .join("\n\n")
      : "No search results were returned.";
  const hint = context?.industry
    ? `\n\nStated industry/domain: ${context.industry}`
    : "";
  return chatJson<WebResearchOutput>(
    webResearchSystem(),
    `Task: ${task}${hint}${memoryBlock(memory)}\n\nSearch results:\n${listing}`
  );
};
