/**
 * Short, terse @handles so tags stay quick to type (@res, @mkt, @eval).
 * Single source of truth for deriving a handle from an agent's display name.
 * Used by both the client (live.ts) and the worker (worker.ts).
 */
export const NAME_TO_HANDLE: Record<string, string> = {
  code: "code",
  copywriter: "copy",
  evaluator: "eval",
  marketing: "mkt",
  neb: "neb",
  product: "pm",
  researcher: "res",
  support: "sup",
};

export const handleForName = (name: string): string => {
  const first = name.split(" ")[0]?.toLowerCase() ?? name.toLowerCase();
  return NAME_TO_HANDLE[first] ?? first;
};
