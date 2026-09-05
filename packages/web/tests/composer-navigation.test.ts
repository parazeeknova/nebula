import { describe, expect, test } from "bun:test";

const navigateIndex = (
  current: number,
  direction: "up" | "down" | "home" | "end",
  length: number
): number => {
  if (length <= 0) {
    return 0;
  }
  if (direction === "home") {
    return 0;
  }
  if (direction === "end") {
    return length - 1;
  }
  if (direction === "down") {
    return (current + 1) % length;
  }
  return (current - 1 + length) % length;
};

const clampIndex = (index: number, count: number): number => {
  if (count <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(index, count - 1));
};

describe("composer keyboard navigation logic", () => {
  test("cycles forward with ArrowDown and wraps to 0", () => {
    const total = 3;
    expect(navigateIndex(0, "down", total)).toBe(1);
    expect(navigateIndex(1, "down", total)).toBe(2);
    expect(navigateIndex(2, "down", total)).toBe(0);
  });

  test("cycles backward with ArrowUp and wraps to last index", () => {
    const total = 4;
    expect(navigateIndex(0, "up", total)).toBe(3);
    expect(navigateIndex(3, "up", total)).toBe(2);
    expect(navigateIndex(2, "up", total)).toBe(1);
    expect(navigateIndex(1, "up", total)).toBe(0);
  });

  test("jumps to Home and End bounds", () => {
    const total = 5;
    expect(navigateIndex(2, "home", total)).toBe(0);
    expect(navigateIndex(2, "end", total)).toBe(4);
  });

  test("clamps active index within candidates length safely", () => {
    expect(clampIndex(-5, 3)).toBe(0);
    expect(clampIndex(1, 3)).toBe(1);
    expect(clampIndex(10, 3)).toBe(2);
    expect(clampIndex(0, 0)).toBe(0);
  });
});
