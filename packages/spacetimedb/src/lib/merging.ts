// Pure helpers for convergence (merge) detection.
// The similarity check itself runs in the external worker; reducers only store
// the resulting merge_session / merge_link / exploration rows.

/** Micros-based overlap check: are two thread creation times within `windowMicros`? */
export const isWithinWindow = (
  aMicros: bigint,
  bMicros: bigint,
  windowMicros: bigint
): boolean => {
  const diff = aMicros > bMicros ? aMicros - bMicros : bMicros - aMicros;
  return diff <= windowMicros;
};

const tokenize = (s: string): Set<string> =>
  new Set(
    s
      .toLowerCase()
      .replaceAll(/[^a-z0-9\s]/gu, " ")
      .split(/\s+/gu)
      .filter((w) => w.length > 2)
  );

/** Jaccard similarity over word tokens — cheap same-topic signal for tests/worker. */
export const topicSimilarity = (a: string, b: string): number => {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 || tb.size === 0) {
    return 0;
  }
  let inter = 0;
  for (const w of ta) {
    if (tb.has(w)) {
      inter += 1;
    }
  }
  return inter / (ta.size + tb.size - inter);
};

export type ExplorationStatus = "pending" | "streaming" | "done" | "failed";

export const statusCode = (s: ExplorationStatus): number =>
  ({ done: 2, failed: 3, pending: 0, streaming: 1 })[s];

/** Merge may publish synthesis only when every exploration is done. */
export const mergeReady = (statuses: number[]): boolean => {
  if (statuses.length < 2) {
    return false;
  }
  return statuses.every((s) => s === statusCode("done"));
};

/** Default tunables shared by worker + tests. */
export const MERGE_DEFAULTS = {
  /** Jaccard threshold for "same thing from different angles". */
  similarityThreshold: 0.25,
  /** 90s overlap window, in micros. */
  windowMicros: 90_000_000n,
} as const;
