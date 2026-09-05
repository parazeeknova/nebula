import { describe, expect, test } from "bun:test";

import { HANDLE_TO_AGENT, isAgentHandle } from "../src/server/agents/registry";

describe("HANDLE_TO_AGENT", () => {
  test("maps the short frontend mentions", () => {
    expect(HANDLE_TO_AGENT.neb).toBe("orchestrator");
    expect(HANDLE_TO_AGENT.res).toBe("web");
    expect(HANDLE_TO_AGENT.mkt).toBe("market");
    expect(HANDLE_TO_AGENT.eval).toBe("evaluation");
    expect(HANDLE_TO_AGENT.code).toBe("code");
    expect(HANDLE_TO_AGENT.copy).toBe("copy");
    expect(HANDLE_TO_AGENT.pm).toBe("pm");
    expect(HANDLE_TO_AGENT.sup).toBe("support");
  });

  test("every value is a known agent name or the orchestrator", () => {
    const known = [
      "web",
      "market",
      "code",
      "copy",
      "pm",
      "support",
      "evaluation",
      "orchestrator",
    ];
    for (const value of Object.values(HANDLE_TO_AGENT)) {
      expect(known).toContain(value);
    }
  });

  test("isAgentHandle guards values", () => {
    expect(isAgentHandle("res")).toBe(true);
    expect(isAgentHandle("code")).toBe(true);
    expect(isAgentHandle("copy")).toBe(true);
    expect(isAgentHandle("pm")).toBe(true);
    expect(isAgentHandle("sup")).toBe(true);
    expect(isAgentHandle("bogus")).toBe(false);
    expect(isAgentHandle(null)).toBe(false);
  });
});
