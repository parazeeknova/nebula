import { chatJson } from "../llm";
import { buildOrchestratorSystem, memoryBlock } from "./prompts";
import { AGENT_NAMES, isAgentName } from "./registry";
import type { AgentName } from "./registry";
import type { PlannedTask, RouteName, RoutingDecision } from "./types";

export const CONFIDENCE_THRESHOLD = 0.65;

const ROUTES: RouteName[] = ["direct", "specialized", "multi"];

interface RawTask {
  context?: unknown;
  task?: unknown;
}

interface RawRouting {
  agents?: unknown;
  answer?: unknown;
  confidence?: unknown;
  reason?: unknown;
  route?: unknown;
  tasks?: unknown;
}

const toReason = (value: unknown): string =>
  typeof value === "string" ? value : "";

const toTask = (
  agent: AgentName,
  prompt: string,
  tasks: Record<string, unknown>
): PlannedTask => {
  const raw = tasks[agent] as RawTask | undefined;
  const task =
    raw && typeof raw.task === "string" && raw.task.trim().length > 0
      ? raw.task
      : prompt;
  if (raw && typeof raw.context === "object" && raw.context !== null) {
    const { industry } = raw.context as { industry?: unknown };
    if (typeof industry === "string" && industry.trim().length > 0) {
      return { context: { industry: industry.trim() }, task };
    }
  }
  return { task };
};

export const validateRouting = (
  raw: unknown,
  prompt: string
): RoutingDecision => {
  if (typeof raw !== "object" || raw === null) {
    throw new TypeError("orchestrator did not return a JSON object");
  }
  const parsed = raw as RawRouting;
  if (
    typeof parsed.route !== "string" ||
    !(ROUTES as string[]).includes(parsed.route)
  ) {
    throw new Error(
      `orchestrator returned an invalid route: ${String(parsed.route)}`
    );
  }
  if (!Array.isArray(parsed.agents)) {
    throw new TypeError("orchestrator did not return an agents array");
  }
  const selected: AgentName[] = [];
  for (const agent of parsed.agents) {
    if (!isAgentName(agent)) {
      throw new Error(`orchestrator selected unknown agent: ${String(agent)}`);
    }
    if (!selected.includes(agent)) {
      selected.push(agent);
    }
  }
  selected.sort((a, b) => AGENT_NAMES.indexOf(a) - AGENT_NAMES.indexOf(b));
  const confidence =
    typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
      ? Math.min(1, Math.max(0, parsed.confidence))
      : 0;
  let route: RouteName = "multi";
  if (selected.length === 0) {
    route = "direct";
  } else if (selected.length === 1) {
    route = "specialized";
  }
  let answer: string | undefined;
  if (route === "direct") {
    const { answer: directAnswer } = parsed;
    if (typeof directAnswer !== "string" || directAnswer.trim().length === 0) {
      throw new Error("orchestrator chose direct but provided no answer");
    }
    answer = directAnswer;
  }
  const rawTasks =
    typeof parsed.tasks === "object" && parsed.tasks !== null
      ? (parsed.tasks as Record<string, unknown>)
      : {};
  const tasks: Partial<Record<AgentName, PlannedTask>> = {};
  for (const agent of selected) {
    tasks[agent] = toTask(agent, prompt, rawTasks);
  }
  return {
    agents: selected,
    answer,
    confidence,
    reason: toReason(parsed.reason),
    route,
    tasks,
  };
};

export const planRouting = async (
  prompt: string,
  memory?: string
): Promise<RoutingDecision> => {
  const system = buildOrchestratorSystem();
  const userPrompt = `${prompt}${memoryBlock(memory)}`;
  try {
    return validateRouting(await chatJson<unknown>(system, userPrompt), prompt);
  } catch (firstError) {
    const firstMessage =
      firstError instanceof Error ? firstError.message : String(firstError);
    const retryPrompt =
      `${userPrompt}\n\nYour previous routing output was invalid (${firstMessage}). ` +
      "Return ONLY a valid routing JSON object.";
    try {
      return validateRouting(
        await chatJson<unknown>(system, retryPrompt),
        prompt
      );
    } catch (secondError) {
      const secondMessage =
        secondError instanceof Error
          ? secondError.message
          : String(secondError);
      throw new Error(
        `orchestrator returned invalid routing (${firstMessage}; ${secondMessage})`,
        { cause: secondError }
      );
    }
  }
};
