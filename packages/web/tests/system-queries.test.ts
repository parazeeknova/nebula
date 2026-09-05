import { describe, expect, test } from "bun:test";

import { getSystemAnswer, isSystemQuery } from "../src/server/system";

const SYSTEM_QUERIES = [
  "What agents do you have?",
  "Tell me all the agents that you have currently?",
  "Tell me all the agents you have",
  "Which agents are available?",
  "What agents can I use?",
  "What tools do you have?",
  "What tools can you use?",
  "What capabilities do you have?",
  "What is your current configuration?",
  "List your agents",
  "Show me all your tools",
  "How many agents do you have?",
  "What can you do?",
];

const USER_TASKS = [
  "Tell me about Valorant agents",
  "What is Valorant's market size?",
  "Search the web for AI coding agents",
  "Compare Cursor and Claude Code",
  "Should we build an AI coding agent?",
  "Research the AI healthcare market and tell me whether we should enter it",
  "I think we should build X. Is that a good decision?",
  "Find recent AI expense tools",
];

describe("isSystemQuery", () => {
  for (const prompt of SYSTEM_QUERIES) {
    test(`treats as system query: ${prompt}`, () => {
      expect(isSystemQuery(prompt)).toBe(true);
    });
  }
  for (const prompt of USER_TASKS) {
    test(`does not treat as system query: ${prompt}`, () => {
      expect(isSystemQuery(prompt)).toBe(false);
    });
  }
});

describe("getSystemAnswer", () => {
  test("lists every registered agent", () => {
    const answer = getSystemAnswer("What agents do you have?");
    expect(answer).toContain("Web Research Agent");
    expect(answer).toContain("Market Analysis Agent");
    expect(answer).toContain("Evaluation Agent");
    expect(answer).toContain("Code Agent");
    expect(answer).toContain("Copywriting Agent");
    expect(answer).toContain("Product Agent");
    expect(answer).toContain("Support Agent");
  });

  test("never mentions unrelated entities", () => {
    const answer = getSystemAnswer("Tell me all the agents you have");
    expect(answer.toLowerCase()).not.toContain("valorant");
  });
});
