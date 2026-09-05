import { describe, expect, test } from "bun:test";

import { HANDLE_TO_AGENT, isAgentHandle } from "../src/server/agents/registry";

describe("HANDLE_TO_AGENT", () => {
  test("maps the four frontend mentions", () => {
    expect(HANDLE_TO_AGENT.neb).toBe("orchestrator");
    expect(HANDLE_TO_AGENT.researcher).toBe("web");
    expect(HANDLE_TO_AGENT.marketing).toBe("market");
    expect(HANDLE_TO_AGENT.evaluator).toBe("evaluation");
  });

  test("every value is a known agent name or the orchestrator", () => {
    for (const value of Object.values(HANDLE_TO_AGENT)) {
      expect(["web", "market", "evaluation", "orchestrator"]).toContain(value);
    }
  });

  test("isAgentHandle guards values", () => {
    expect(isAgentHandle("researcher")).toBe(true);
    expect(isAgentHandle("bogus")).toBe(false);
    expect(isAgentHandle(null)).toBe(false);
  });
});
