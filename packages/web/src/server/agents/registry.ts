export const AGENTS = {
  code: {
    description:
      "Writes, reviews and explains code, and gives technical guidance with concrete snippets.",
    name: "Code Agent",
  },
  copy: {
    description:
      "Drafts messaging, positioning, taglines, landing-page copy and documentation.",
    name: "Copywriting Agent",
  },
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
  pm: {
    description:
      "Turns ideas into specs, user stories, roadmaps and prioritized requirements.",
    name: "Product Agent",
  },
  support: {
    description:
      "Answers product and support questions, drafts responses, and triages or escalates issues.",
    name: "Support Agent",
  },
  web: {
    description:
      "Searches the external web using Firecrawl and returns factual research with sources.",
    name: "Web Research Agent",
  },
} as const;

export type AgentName = keyof typeof AGENTS;
export type AgentRoute = AgentName | "orchestrator";

// Canonic`al execution order. Kept separate from AGENTS key order on purpose.
export const AGENT_NAMES: AgentName[] = [
  "web",
  "market",
  "code",
  "copy",
  "pm",
  "support",
  "evaluation",
];

export const isAgentName = (value: unknown): value is AgentName =>
  typeof value === "string" && Object.hasOwn(AGENTS, value);

/** Frontend @mention handle -> what the worker should run. */
export const HANDLE_TO_AGENT = {
  code: "code",
  copy: "copy",
  eval: "evaluation",
  mkt: "market",
  neb: "orchestrator",
  pm: "pm",
  res: "web",
  sup: "support",
} as const satisfies Record<string, AgentRoute>;

export type AgentHandle = keyof typeof HANDLE_TO_AGENT;

export const AGENT_HANDLES = Object.keys(HANDLE_TO_AGENT) as AgentHandle[];

export const isAgentHandle = (value: unknown): value is AgentHandle =>
  typeof value === "string" && Object.hasOwn(HANDLE_TO_AGENT, value);
