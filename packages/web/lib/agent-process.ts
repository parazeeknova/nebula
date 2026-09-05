import type { Agent, ChatMessage, ToolCallInfo } from "./room-types";
import { JobStatus, ToolStatus, fullText } from "./room-types";

export type WorkStatus = "working" | "done" | "failed" | "idle";

const TOOL_LABEL: Record<number, string> = {
  [ToolStatus.Pending]: "pending",
  [ToolStatus.Running]: "running",
  [ToolStatus.Done]: "done",
  [ToolStatus.Failed]: "failed",
};

/**
 * Attribute thread tool calls to agents via each agent's tools[].
 * Sub-agents (Researcher/Marketing/Evaluator) never author messages — their
 * tool_call rows are their entire footprint, so without this they are
 * invisible in the thread. A tool shared by several agents attributes to all.
 */
export const attributeToolsToAgents = (
  agents: readonly Pick<Agent, "agentId" | "tools">[],
  tools: readonly ToolCallInfo[]
): Map<string, ToolCallInfo[]> => {
  const byAgent = new Map<string, ToolCallInfo[]>();
  for (const agent of agents) {
    const owned = new Set(agent.tools);
    const mine = tools.filter((t) => owned.has(t.tool));
    if (mine.length > 0) {
      byAgent.set(String(agent.agentId), mine);
    }
  }
  return byAgent;
};

/**
 * The thread's final answer: the latest agent-authored message that has text
 * or is still streaming. Rendered outside the process dropdowns.
 */
export const pickFinalAnswer = (
  messages: readonly ChatMessage[]
): ChatMessage | undefined => {
  const candidates = messages.filter(
    (m) =>
      m.authorAgent !== null && (m.streaming || fullText(m).trim().length > 0)
  );
  if (candidates.length === 0) {
    return undefined;
  }
  return candidates.toSorted((a, b) => (a.messageId < b.messageId ? 1 : -1))[0];
};

export const resolveWorkStatus = (opts: {
  hasStreamingMessage: boolean;
  jobStatuses: readonly number[];
  toolStatuses: readonly number[];
  hasMessages: boolean;
}): WorkStatus => {
  const { hasStreamingMessage, jobStatuses, toolStatuses, hasMessages } = opts;
  const jobActive = jobStatuses.some(
    (s) => s === JobStatus.Running || s === JobStatus.Queued
  );
  const toolActive = toolStatuses.some(
    (s) => s === ToolStatus.Running || s === ToolStatus.Pending
  );
  if (hasStreamingMessage || jobActive || toolActive) {
    return "working";
  }
  const jobFailed = jobStatuses.some((s) => s === JobStatus.Failed);
  const toolFailed = toolStatuses.some((s) => s === ToolStatus.Failed);
  if (jobFailed || toolFailed) {
    return "failed";
  }
  const jobDone = jobStatuses.some((s) => s === JobStatus.Done);
  const toolDone = toolStatuses.some((s) => s === ToolStatus.Done);
  if (hasMessages || jobDone || toolDone) {
    return "done";
  }
  return "idle";
};

/** Collapsed-tab preview: latest reply text, else a tool summary. */
export const workPreview = (opts: {
  lastMessageText?: string;
  tools: readonly ToolCallInfo[];
  status: WorkStatus;
}): string => {
  const { lastMessageText, tools, status } = opts;
  if (lastMessageText && lastMessageText.trim().length > 0) {
    return lastMessageText.slice(0, 140);
  }
  if (tools.length > 0) {
    const summary = tools
      .map((t) => `${t.tool} · ${TOOL_LABEL[t.status] ?? "pending"}`)
      .join(", ");
    const lastOutput = tools
      .map((t) => t.output?.trim() ?? "")
      .find((o) => o.length > 0);
    const detail = lastOutput ? ` — ${lastOutput.slice(0, 100)}` : "";
    return `${summary}${detail}`.slice(0, 140);
  }
  return status === "working" ? "Working on response…" : "";
};
