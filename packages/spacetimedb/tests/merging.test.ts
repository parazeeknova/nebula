import { describe, expect, test } from "bun:test";

import {
  MERGE_DEFAULTS,
  isWithinWindow,
  mergeReady,
  statusCode,
  topicSimilarity,
} from "../src/lib/merging";

describe("isWithinWindow", () => {
  test("same-room concurrent prompts overlap", () => {
    expect(
      isWithinWindow(1_000_000n, 1_050_000n, MERGE_DEFAULTS.windowMicros)
    ).toBe(true);
  });
  test("far-apart prompts do not overlap", () => {
    expect(
      isWithinWindow(1_000_000n, 500_000_000n, MERGE_DEFAULTS.windowMicros)
    ).toBe(false);
  });
});

describe("topicSimilarity", () => {
  test("same topic from different angles scores high", () => {
    const s = topicSimilarity(
      "how should we price the team plan for startups",
      "what pricing makes sense for startup teams on the team plan"
    );
    expect(s).toBeGreaterThan(MERGE_DEFAULTS.similarityThreshold);
  });
  test("unrelated topics score low", () => {
    const s = topicSimilarity(
      "how should we price the team plan",
      "what color should the office chairs be"
    );
    expect(s).toBeLessThan(MERGE_DEFAULTS.similarityThreshold);
  });
});

describe("mergeReady", () => {
  test("needs at least two explorations", () => {
    expect(mergeReady([statusCode("done")])).toBe(false);
  });
  test("true only when all done", () => {
    expect(mergeReady([statusCode("done"), statusCode("streaming")])).toBe(
      false
    );
    expect(mergeReady([statusCode("done"), statusCode("done")])).toBe(true);
  });
});
