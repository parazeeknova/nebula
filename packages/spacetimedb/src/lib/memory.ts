// Pure helpers for compounding room/canvas memory.
// Ranking + compaction policy lives here so worker and tests share it.

export interface MemoryCandidate {
  memory_id: bigint;
  weight: number;
  created_at_micros: bigint;
}

/** Top-N memories by weight, newest wins ties. */
export const pickTopMemories = <T extends MemoryCandidate>(
  memories: T[],
  limit: number
): T[] =>
  memories
    .toSorted((a, b) => {
      if (b.weight !== a.weight) {
        return b.weight - a.weight;
      }
      return b.created_at_micros > a.created_at_micros ? 1 : -1;
    })
    .slice(0, limit);

/** Multiplicative decay for stale facts, clamped at 0. */
export const decayWeight = (weight: number, factor = 0.95): number =>
  Math.max(0, weight * factor);

/** Case-insensitive dedup of fact strings, keeping first occurrence. */
export const dedupFacts = (facts: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const f of facts) {
    const key = f.trim().toLowerCase();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(f.trim());
  }
  return out;
};

/** Payload shape for the canvas-level snapshot row (JSON-encoded in DB). */
export const buildSnapshotPayload = (
  entries: { room_id: bigint; summary: string }[]
): string => {
  const map: Record<string, string> = {};
  for (const e of entries) {
    map[String(e.room_id)] = e.summary;
  }
  return JSON.stringify({ rooms: map });
};
