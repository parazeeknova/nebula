import { chatWithTools } from "../llm";
import type { AgentTool } from "../llm";
import { memoryBlock } from "./prompts";
import type { AgentName } from "./registry";
import { toolsByName } from "./tools";
import type { AgentOutput, AgentResultStatus } from "./types";

/**
 * Unified tool-driven agent runner.
 *
 * Each agent is configured with a system prompt and the set of tools it may
 * call. The model decides — per prompt — which tools it actually needs, calls
 * them iteratively (think -> call -> observe -> next), and finally emits a
 * structured JSON output. Only the tools the agent registered are offered, so
 * a code agent never wastes context on web hooks unless it opts in.
 *
 * Context bloat controls:
 * - `maxSteps` bounds the loop; a stuck agent fails fast instead of spinning.
 * - Tool results are capped (`maxResultChars`) before being fed back.
 * - Prior results passed in are pre-filtered by the caller (see worker), so a
 *   downstream agent only sees the upstream facts relevant to its job.
 */

export interface AgentSpec {
  /** System prompt for the agent (already includes output schema). */
  system: string;
  /** Tool names this agent may call. Empty = answer from context only. */
  tools: string[];
  /** Max number of tool steps before forcing a final answer. */
  maxSteps?: number;
}

const AGENT_TOOL_SETS: Record<AgentName, string[]> = {
  code: ["web_search"],
  copy: [],
  evaluation: [],
  market: ["web_search", "web_extract"],
  pm: ["web_search"],
  support: [],
  web: ["web_search", "web_extract"],
};

const resolveTools = (names: string[]): Record<string, AgentTool> => {
  const out: Record<string, AgentTool> = {};
  for (const name of names) {
    const tool = (toolsByName as Record<string, AgentTool>)[name];
    if (tool) {
      out[name] = tool;
    }
  }
  return out;
};

export interface RunAgentOptions {
  /** Prior outputs to include (filtered by caller). */
  prior?: object;
  memory?: string;
  model?: string;
}

const extractJson = (raw: string): unknown => {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*(?<body>[\s\S]*?)```/u);
  const candidate = (fenced?.groups?.body ?? trimmed).trim();
  const start = candidate.search(/[{[]/u);
  const end = Math.max(candidate.lastIndexOf("}"), candidate.lastIndexOf("]"));
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Agent did not return JSON: ${raw.slice(0, 200)}`);
  }
  return JSON.parse(candidate.slice(start, end + 1)) as unknown;
};

/** Condense prior results so they never bloat the prompt. Each value is capped. */
const condensePrior = (prior: object): string => {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(prior)) {
    if (value === undefined || value === null) {
      continue;
    }
    const text = JSON.stringify(value);
    const capped = text.length > 2500 ? `${text.slice(0, 2500)}…` : text;
    lines.push(`${key}: ${capped}`);
  }
  return lines.join("\n");
};

export const runAgent = async <T extends AgentOutput>(
  agent: AgentName,
  spec: AgentSpec,
  task: string,
  options: RunAgentOptions = {}
): Promise<T> => {
  const toolSet = [...AGENT_TOOL_SETS[agent], ...spec.tools];
  const deduped = [...new Set(toolSet)];
  const tools = resolveTools(deduped);
  const parts = [`Task: ${task}`];
  if (options.prior && Object.keys(options.prior).length > 0) {
    parts.push(`Relevant prior work:\n${condensePrior(options.prior)}`);
  }
  const mem = memoryBlock(options.memory);
  if (mem) {
    parts.push(mem.trim());
  }
  const user = parts.join("\n\n");

  const result = await chatWithTools(spec.system, user, tools, {
    maxResultChars: 5000,
    maxSteps: spec.maxSteps ?? 8,
    model: options.model,
  });
  const content = result.content ?? "";
  return extractJson(content) as T;
};

export const toStatus = (
  raw: unknown,
  fallback: AgentResultStatus = "completed"
): AgentResultStatus =>
  raw === "insufficient_context" ? "insufficient_context" : fallback;
