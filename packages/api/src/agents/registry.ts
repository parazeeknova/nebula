export const AGENTS = {
  evaluation: {
    description:
      "Evaluates decisions, tradeoffs, risks, assumptions and recommendations.",
    name: "Evaluation Agent",
  },
  market: {
    description:
      "Analyzes products, competitors, pricing, revenue signals, market positioning and implementation.",
    name: "Market Analysis Agent",
  },
  web: {
    description:
      "Searches the external web using Firecrawl and returns factual research with sources.",
    name: "Web Research Agent",
  },
} as const;

export type AgentName = keyof typeof AGENTS;

// Canonical execution order. Kept separate from AGENTS key order on purpose.
export const AGENT_NAMES: AgentName[] = ["web", "market", "evaluation"];

export const isAgentName = (value: unknown): value is AgentName =>
  typeof value === "string" && Object.hasOwn(AGENTS, value);
