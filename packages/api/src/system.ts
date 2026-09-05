import { AGENTS, AGENT_NAMES } from "./agents/registry";
import { config } from "./config";

const SYSTEM_PATTERNS: RegExp[] = [
  /\b(?:what|which) (?:agents|tools) (?:are available|are there|can i use|can you use|do you have)\b/iu,
  /\bhow many (?:agents|tools) do you have\b/iu,
  /\bwhat capabilities do you have\b/iu,
  /\bwhat are your (?:agents|tools|capabilities)\b/iu,
  /\bwhat is your (?:current )?(?:configuration|config)\b/iu,
  /\bwhat can you do\b/iu,
  /\btell me\b[^.?]{0,60}\b(?:all )?(?:the )?(?:agents|tools) (?:that |which )?you have\b/iu,
  /\b(?:list|show) (?:me )?(?:all )?(?:your (?:agents|tools)|(?:agents|tools) you have)\b/iu,
];

export const isSystemQuery = (prompt: string): boolean =>
  SYSTEM_PATTERNS.some((pattern) => pattern.test(prompt));

export const getSystemAnswer = (prompt: string): string => {
  if (/\bagents?\b|\btools?\b/iu.test(prompt)) {
    const list = AGENT_NAMES.map(
      (agent) => `${AGENTS[agent].name} — ${AGENTS[agent].description}`
    ).join(" ");
    return `I currently have ${AGENT_NAMES.length} specialized agents: ${list}`;
  }
  return (
    "I route requests across three specialized agents (web research, market analysis, evaluation), " +
    `using the ${config.model} orchestrator model with Firecrawl web search and SpacetimeDB job state. ` +
    'Ask "what agents do you have" for the full list.'
  );
};
