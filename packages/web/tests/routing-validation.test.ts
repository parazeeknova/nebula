import { describe, expect, test } from "bun:test";

import {
  CONFIDENCE_THRESHOLD,
  validateRouting,
} from "../src/server/agents/orchestrator";

describe("validateRouting", () => {
  test("accepts a direct routing with zero agents", () => {
    const routing = validateRouting(
      {
        agents: [],
        answer:
          "I currently have three specialized agents: Web Research, Market Analysis, and Evaluation.",
        confidence: 0.99,
        reason: "The request concerns Nebula's configured agents.",
        route: "direct",
      },
      "Tell me all the agents that you have currently?"
    );
    expect(routing.route).toBe("direct");
    expect(routing.agents).toEqual([]);
    expect(routing.answer).toContain("three specialized agents");
  });

  test("rejects unknown agent names", () => {
    expect(() =>
      validateRouting(
        {
          agents: ["valorant"],
          confidence: 0.9,
          reason: "Bad routing.",
          route: "specialized",
        },
        "Tell me about Valorant agents"
      )
    ).toThrow("unknown agent");
  });

  test("rejects invented researcher names", () => {
    expect(() =>
      validateRouting(
        {
          agents: ["researcher", "sales", "random-agent"],
          confidence: 0.9,
          reason: "Bad routing.",
          route: "multi",
        },
        "Do some research and sell it"
      )
    ).toThrow("unknown agent");
  });

  test("derives route from agent count and orders canonically", () => {
    const routing = validateRouting(
      {
        agents: ["market", "web"],
        confidence: 0.8,
        reason: "Comparison needs research and analysis.",
        route: "direct",
        tasks: {
          market: { task: "Compare the products." },
          web: { task: "Find current facts." },
        },
      },
      "Compare Cursor and Claude Code"
    );
    expect(routing.route).toBe("multi");
    expect(routing.agents).toEqual(["web", "market"]);
  });

  test("defaults missing tasks to the prompt with no invented context", () => {
    const routing = validateRouting(
      {
        agents: ["web"],
        confidence: 0.9,
        reason: "External facts required.",
        route: "specialized",
      },
      "Search the web for AI coding agents"
    );
    expect(routing.tasks.web?.task).toBe("Search the web for AI coding agents");
    expect(routing.tasks.web?.context).toBeUndefined();
  });

  test("keeps an explicitly stated industry", () => {
    const routing = validateRouting(
      {
        agents: ["web"],
        confidence: 0.9,
        reason: "External facts required.",
        route: "specialized",
        tasks: {
          web: { context: { industry: "healthcare" }, task: "Research it." },
        },
      },
      "Research the AI healthcare market"
    );
    expect(routing.tasks.web?.context).toEqual({ industry: "healthcare" });
  });

  test("drops blank industry strings", () => {
    const routing = validateRouting(
      {
        agents: ["web"],
        confidence: 0.9,
        reason: "External facts required.",
        route: "specialized",
        tasks: {
          web: { context: { industry: "   " }, task: "Research it." },
        },
      },
      "Research it"
    );
    expect(routing.tasks.web?.context).toBeUndefined();
  });

  test("missing confidence becomes 0 so the fallback path triggers", () => {
    const routing = validateRouting(
      {
        agents: ["web"],
        reason: "External facts required.",
        route: "specialized",
      },
      "Research it"
    );
    expect(routing.confidence).toBe(0);
    expect(routing.confidence < CONFIDENCE_THRESHOLD).toBe(true);
  });

  test("direct routing without an answer is invalid", () => {
    expect(() =>
      validateRouting(
        {
          agents: [],
          confidence: 1,
          reason: "No agent needed.",
          route: "direct",
        },
        "Hi"
      )
    ).toThrow("no answer");
  });

  test("non-object routing output is invalid", () => {
    expect(() => validateRouting("hello", "Hi")).toThrow();
    expect(() => validateRouting(null, "Hi")).toThrow();
  });
});
