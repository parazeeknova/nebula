import { describe, expect, test } from "bun:test";

import {
  buildSnapshotPayload,
  decayWeight,
  dedupFacts,
  pickTopMemories,
} from "../src/lib/memory";

describe("pickTopMemories", () => {
  test("ranks by weight, newest wins ties", () => {
    const rows = [
      { created_at_micros: 3n, memory_id: 1n, weight: 0.2 },
      { created_at_micros: 1n, memory_id: 2n, weight: 0.9 },
      { created_at_micros: 2n, memory_id: 3n, weight: 0.9 },
    ];
    const top = pickTopMemories(rows, 2);
    expect(top.map((r) => r.memory_id)).toEqual([3n, 2n]);
  });
});

describe("decayWeight", () => {
  test("decays and clamps at zero", () => {
    expect(decayWeight(1)).toBeCloseTo(0.95);
    expect(decayWeight(0)).toBe(0);
  });
});

describe("dedupFacts", () => {
  test("drops case-insensitive duplicates", () => {
    expect(
      dedupFacts(["Team plan is $20", "team plan is $20 ", "Office is closed"])
    ).toEqual(["Team plan is $20", "Office is closed"]);
  });
});

describe("buildSnapshotPayload", () => {
  test("encodes room map as JSON", () => {
    const payload = buildSnapshotPayload([
      { room_id: 1n, summary: "pricing decided" },
    ]);
    expect(JSON.parse(payload)).toEqual({ rooms: { "1": "pricing decided" } });
  });
});
