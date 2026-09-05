import { describe, expect, test } from "bun:test";

import { TokenBuffer } from "../src/server/stream-buffer";

interface Write {
  delta: string;
  idx: number;
}

const recorder = (writes: Write[]) => (delta: string, idx: number) => {
  writes.push({ delta, idx });
  return Promise.resolve();
};

describe("TokenBuffer", () => {
  test("batches small tokens until flushSize is reached", async () => {
    const writes: Write[] = [];
    const buf = new TokenBuffer(recorder(writes), 10);
    await buf.push("hello ");
    await buf.push("world");
    expect(writes).toEqual([{ delta: "hello world", idx: 0 }]);
    expect(buf.length).toBe(11);
    await buf.push("!");
    expect(writes).toEqual([{ delta: "hello world", idx: 0 }]);
    expect(await buf.done()).toBe("hello world!");
  });

  test("done() flushes the remainder and returns full text", async () => {
    const writes: Write[] = [];
    const buf = new TokenBuffer(recorder(writes), 100);
    await buf.push("abc");
    const text = await buf.done();
    expect(text).toBe("abc");
    expect(buf.text).toBe("abc");
    expect(writes).toEqual([{ delta: "abc", idx: 0 }]);
  });

  test("indexes increase in order across flushes", async () => {
    const writes: Write[] = [];
    const buf = new TokenBuffer(recorder(writes), 3);
    await buf.push("aaa");
    await buf.push("bbb");
    await buf.push("c");
    await buf.done();
    expect(writes.map((w) => w.idx)).toEqual([0, 1, 2]);
    expect(writes.map((w) => w.delta).join("")).toBe("aaabbbc");
  });

  test("empty tokens are ignored and done() on empty writes nothing", async () => {
    const writes: Write[] = [];
    const buf = new TokenBuffer(recorder(writes));
    await buf.push("");
    const text = await buf.done();
    expect(text).toBe("");
    expect(writes).toEqual([]);
  });
});
