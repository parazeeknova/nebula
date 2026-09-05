import { describe, expect, test } from "bun:test";

import {
  extractMentionTokens,
  looksLikeToolUse,
  normalizePrompt,
  routingHint,
} from "../src/lib/routing";

describe("extractMentionTokens", () => {
  test("finds @agent mentions", () => {
    expect(extractMentionTokens("hey @research-bot look here")).toEqual([
      "research-bot",
    ]);
  });
  test("empty when no mentions", () => {
    expect(extractMentionTokens("just a normal prompt")).toEqual([]);
  });
});

describe("looksLikeToolUse", () => {
  test("flags web lookup prompts", () => {
    expect(looksLikeToolUse("search the latest docs for this")).toBe(true);
  });
  test("ignores pure recall prompts", () => {
    expect(looksLikeToolUse("what did we decide last week")).toBe(false);
  });
});

describe("routingHint", () => {
  test("tagged agent routes to tool", () => {
    expect(
      routingHint({ hasRoomMemory: true, prompt: "hi", taggedAgent: true })
    ).toBe("tool");
  });
  test("memory hit routes to memory", () => {
    expect(
      routingHint({
        hasRoomMemory: true,
        prompt: "what did we decide",
        taggedAgent: false,
      })
    ).toBe("memory");
  });
  test("cold prompt is direct", () => {
    expect(
      routingHint({ hasRoomMemory: false, prompt: "hmm", taggedAgent: false })
    ).toBe("direct");
  });
});

describe("normalizePrompt", () => {
  test("collapses whitespace", () => {
    expect(normalizePrompt("  a   b\n c ")).toBe("a b c");
  });
});
