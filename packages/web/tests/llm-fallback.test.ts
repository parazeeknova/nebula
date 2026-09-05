import { describe, expect, test } from "bun:test";

import { resolveModels } from "../src/server/llm";

describe("resolveModels", () => {
  test("tries primary first, fallback second", () => {
    expect(resolveModels("gpt-oss-120b", "gemma-4-31B-it")).toEqual([
      "gpt-oss-120b",
      "gemma-4-31B-it",
    ]);
  });

  test("dedupes identical models", () => {
    expect(resolveModels("gpt-oss-120b", "gpt-oss-120b")).toEqual([
      "gpt-oss-120b",
    ]);
  });

  test("skips a blank fallback", () => {
    expect(resolveModels("gpt-oss-120b", "  ")).toEqual(["gpt-oss-120b"]);
  });

  test("throws when nothing is configured", () => {
    expect(() => resolveModels("", "  ")).toThrow("No LLM model configured");
  });
});
