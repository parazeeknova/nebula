import { describe, expect, test } from "bun:test";

import { parseRoomCode } from "../components/workspace/entry-flow-modal";

describe("parseRoomCode", () => {
  test("parses pure numeric string", () => {
    expect(parseRoomCode("1")).toBe(1n);
    expect(parseRoomCode("42")).toBe(42n);
    expect(parseRoomCode(" 123 ")).toBe(123n);
  });

  test("parses prefixed room codes", () => {
    expect(parseRoomCode("#5")).toBe(5n);
    expect(parseRoomCode("r-10")).toBe(10n);
    expect(parseRoomCode("-99")).toBe(99n);
  });

  test("parses room query param from URL", () => {
    expect(parseRoomCode("http://localhost:3000/app?room=7")).toBe(7n);
    expect(
      parseRoomCode("https://nebula.chat/app?foo=bar&room=88&ref=share")
    ).toBe(88n);
    expect(parseRoomCode("?room=15")).toBe(15n);
    expect(parseRoomCode("room=23")).toBe(23n);
  });

  test("returns null for invalid inputs", () => {
    expect(parseRoomCode("")).toBe(null);
    expect(parseRoomCode("   ")).toBe(null);
    expect(parseRoomCode("abc")).toBe(null);
    expect(parseRoomCode("room=")).toBe(null);
    expect(parseRoomCode("0")).toBe(null);
  });
});
