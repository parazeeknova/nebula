// Buffers LLM stream tokens into ordered message_chunk writes.
// A reducer call per token would flood the DB, so deltas accumulate until
// they reach flushSize, then flush as one chunk with the next index.

export class TokenBuffer {
  private fullText = "";

  private pending = "";

  private nextIdx = 0;

  private readonly flush: (delta: string, idx: number) => Promise<void>;

  private readonly flushSize: number;

  constructor(
    flush: (delta: string, idx: number) => Promise<void>,
    flushSize = 120
  ) {
    this.flush = flush;
    this.flushSize = flushSize;
  }

  /** Total characters seen so far (flushed + pending). */
  get length(): number {
    return this.fullText.length;
  }

  /** All text seen so far, including anything not yet flushed. */
  get text(): string {
    return this.fullText;
  }

  async push(token: string): Promise<void> {
    if (token.length === 0) {
      return;
    }
    this.fullText += token;
    this.pending += token;
    if (this.pending.length >= this.flushSize) {
      const delta = this.pending;
      this.pending = "";
      const idx = this.nextIdx;
      this.nextIdx += 1;
      await this.flush(delta, idx);
    }
  }

  /** Flush any remainder. Returns the full accumulated text. */
  async done(): Promise<string> {
    if (this.pending.length > 0) {
      const delta = this.pending;
      this.pending = "";
      const idx = this.nextIdx;
      this.nextIdx += 1;
      await this.flush(delta, idx);
    }
    return this.fullText;
  }
}
