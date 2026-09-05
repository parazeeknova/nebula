import { describe, expect, test } from "bun:test";

import { planRouting } from "../src/agents/orchestrator";
import type { AgentName } from "../src/agents/registry";

const LIVE_TIMEOUT = 120_000;

const expectExactAgents = async (
  prompt: string,
  expected: AgentName[]
): Promise<void> => {
  const routing = await planRouting(prompt);
  expect([...routing.agents].toSorted()).toEqual([...expected].toSorted());
};

describe("orchestrator routing (live Gemma)", () => {
  test(
    "routes simple research to web only",
    async () => {
      await expectExactAgents("Search the web for AI coding agents", ["web"]);
    },
    LIVE_TIMEOUT
  );

  test(
    "routes comparison to web and market",
    async () => {
      await expectExactAgents("Compare Cursor and Claude Code", [
        "web",
        "market",
      ]);
    },
    LIVE_TIMEOUT
  );

  test(
    "routes build questions to evaluation",
    async () => {
      const routing = await planRouting("Should we build an AI coding agent?");
      expect(routing.agents).toContain("evaluation");
    },
    LIVE_TIMEOUT
  );

  test(
    "routes full investigations to all three agents",
    async () => {
      await expectExactAgents(
        "Research the AI healthcare market and tell me whether we should enter it",
        ["web", "market", "evaluation"]
      );
    },
    LIVE_TIMEOUT
  );

  test(
    "treats Valorant agents as the game and routes to web only",
    async () => {
      await expectExactAgents("Tell me about Valorant agents", ["web"]);
    },
    LIVE_TIMEOUT
  );

  test(
    "routes a named market question to web and market",
    async () => {
      await expectExactAgents("What is Valorant's market size?", [
        "web",
        "market",
      ]);
    },
    LIVE_TIMEOUT
  );

  test(
    "routes decision confirmation to evaluation",
    async () => {
      const routing = await planRouting(
        "I think we should build X. Is that a good decision?"
      );
      expect(routing.agents).toContain("evaluation");
    },
    LIVE_TIMEOUT
  );

  test(
    "adds no industry context the user did not state",
    async () => {
      const routing = await planRouting("Search the web for AI coding agents");
      expect(routing.tasks.web?.context).toBeUndefined();
    },
    LIVE_TIMEOUT
  );
});
