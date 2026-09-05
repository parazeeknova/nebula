import { marketAnalysisSystem } from "./prompts";
import { runAgent, toStatus } from "./runner";
import type { MarketAnalysisOutput } from "./types";

export const runMarketAnalysis = async (
  task: string,
  _context?: unknown,
  prior?: object,
  memory?: string,
  model?: string
): Promise<MarketAnalysisOutput> => {
  const raw = await runAgent<MarketAnalysisOutput>(
    "market",
    { maxSteps: 8, system: marketAnalysisSystem(), tools: [] },
    task,
    { memory, model, prior }
  );
  return {
    competitors: Array.isArray(raw.competitors) ? raw.competitors : [],
    implementation_patterns: Array.isArray(raw.implementation_patterns)
      ? raw.implementation_patterns
      : [],
    market_gaps: Array.isArray(raw.market_gaps) ? raw.market_gaps : [],
    market_summary:
      typeof raw.market_summary === "string" ? raw.market_summary : "",
    pricing: Array.isArray(raw.pricing) ? raw.pricing : [],
    revenue_signals: Array.isArray(raw.revenue_signals)
      ? raw.revenue_signals
      : [],
    sources: Array.isArray(raw.sources) ? raw.sources : [],
    status: toStatus(raw.status),
  };
};
