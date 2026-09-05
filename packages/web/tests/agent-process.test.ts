import { describe, expect, test } from "bun:test";

import type { Identity } from "spacetimedb";

import {
  attributeToolsToAgents,
  pickFinalAnswer,
  resolveWorkStatus,
  workPreview,
} from "../lib/agent-process";
import type { ChatMessage, ToolCallInfo } from "../lib/room-types";

const tool = (name: string, status: number, output?: string): ToolCallInfo => ({
  output,
  status,
  tool: name,
});

const msg = (
  id: bigint,
  authorAgent: bigint | null,
  body: string,
  streaming = false
): ChatMessage => ({
  author: null as unknown as Identity,
  authorAgent,
  authorColor: "#fff",
  authorHex: "ab",
  authorName: authorAgent === null ? "user" : "agent",
  body,
  chunks: [],
  createdAt: "",
  mentions: [],
  messageId: id,
  role: authorAgent === null ? 0 : 1,
  roomId: 1n,
  streaming,
  threadId: 1n,
});

describe("attributeToolsToAgents", () => {
  const agents = [
    { agentId: 1n, tools: ["orchestrate"] },
    { agentId: 2n, tools: ["web_search"] },
    { agentId: 3n, tools: ["market_analysis"] },
    { agentId: 4n, tools: ["evaluate"] },
  ];
  const tools = [
    tool("web_search", 2, '{"findings":[]}'),
    tool("market_analysis", 2),
    tool("evaluate", 1),
  ];

  test("each tool lands on the agent that owns it", () => {
    const byAgent = attributeToolsToAgents(agents, tools);
    expect(byAgent.get("1")).toBeUndefined();
    expect(byAgent.get("2")?.map((t) => t.tool)).toEqual(["web_search"]);
    expect(byAgent.get("3")?.map((t) => t.tool)).toEqual(["market_analysis"]);
    expect(byAgent.get("4")?.map((t) => t.tool)).toEqual(["evaluate"]);
  });

  test("unknown tools attribute to nobody", () => {
    const byAgent = attributeToolsToAgents(agents, [tool("mystery", 1)]);
    expect(byAgent.size).toBe(0);
  });

  test("a shared tool attributes to every owner", () => {
    const shared = [
      { agentId: 2n, tools: ["web_search"] },
      { agentId: 5n, tools: ["web_search", "other"] },
    ];
    const byAgent = attributeToolsToAgents(shared, [tool("web_search", 2)]);
    expect(byAgent.get("2")?.length).toBe(1);
    expect(byAgent.get("5")?.length).toBe(1);
  });
});

describe("pickFinalAnswer", () => {
  test("picks the latest agent message with text", () => {
    const messages = [
      msg(1n, null, "user prompt"),
      msg(2n, 1n, "first answer"),
      msg(3n, 1n, "final answer"),
    ];
    expect(pickFinalAnswer(messages)?.messageId).toBe(3n);
  });

  test("ignores user messages and empty agent shells", () => {
    const messages = [msg(1n, null, "user prompt"), msg(2n, 1n, "  ")];
    expect(pickFinalAnswer(messages)).toBeUndefined();
  });

  test("a streaming reply counts even before text arrives", () => {
    const messages = [msg(1n, null, "prompt"), msg(2n, 1n, "", true)];
    expect(pickFinalAnswer(messages)?.messageId).toBe(2n);
  });
});

describe("resolveWorkStatus", () => {
  test("tool-only activity marks a sub-agent done", () => {
    expect(
      resolveWorkStatus({
        hasMessages: false,
        hasStreamingMessage: false,
        jobStatuses: [],
        toolStatuses: [2],
      })
    ).toBe("done");
  });

  test("a running tool means working even with no jobs or messages", () => {
    expect(
      resolveWorkStatus({
        hasMessages: false,
        hasStreamingMessage: false,
        jobStatuses: [],
        toolStatuses: [1],
      })
    ).toBe("working");
  });

  test("a failed tool means failed", () => {
    expect(
      resolveWorkStatus({
        hasMessages: false,
        hasStreamingMessage: false,
        jobStatuses: [],
        toolStatuses: [3],
      })
    ).toBe("failed");
  });

  test("nothing at all is idle", () => {
    expect(
      resolveWorkStatus({
        hasMessages: false,
        hasStreamingMessage: false,
        jobStatuses: [],
        toolStatuses: [],
      })
    ).toBe("idle");
  });
});

describe("workPreview", () => {
  test("prefers message text", () => {
    expect(
      workPreview({
        lastMessageText: "hello world",
        status: "done",
        tools: [tool("web_search", 2)],
      })
    ).toBe("hello world");
  });

  test("summarizes tools when there are no messages", () => {
    const preview = workPreview({
      status: "done",
      tools: [tool("web_search", 2, '{"findings":[]}')],
    });
    expect(preview).toContain("web_search · done");
  });

  test("working with nothing yet shows the spinning placeholder", () => {
    expect(workPreview({ status: "working", tools: [] })).toBe(
      "Working on response…"
    );
  });
});
