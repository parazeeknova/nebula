import type { AgentName } from "./registry";

export type RouteName = "direct" | "specialized" | "multi";

export interface TaskContext {
  industry?: string;
}

export interface PlannedTask {
  context?: TaskContext;
  task: string;
}

export interface RoutingDecision {
  agents: AgentName[];
  answer?: string;
  confidence: number;
  reason: string;
  route: RouteName;
  tasks: Partial<Record<AgentName, PlannedTask>>;
}

export interface WebFinding {
  summary: string;
  title: string;
  url: string;
}

export type AgentResultStatus = "completed" | "insufficient_context";

export interface WebResearchOutput {
  findings: WebFinding[];
  sources: string[];
  status: AgentResultStatus;
  topic: string;
}

export interface MarketCompetitor {
  name: string;
  strengths: string[];
  weaknesses: string[];
}

export interface MarketAnalysisOutput {
  competitors: MarketCompetitor[];
  implementation_patterns: string[];
  market_gaps: string[];
  market_summary: string;
  pricing: string[];
  revenue_signals: string[];
  sources: string[];
  status: AgentResultStatus;
}

export type EvaluationDecision = "BUILD" | "SKIP" | "INVESTIGATE";

export interface EvaluationOutput {
  alternatives: string[];
  assumptions: string[];
  confidence: number;
  decision: string;
  reasoning: string[];
  recommendation: string;
  risks: string[];
  status: AgentResultStatus;
}

export type AgentOutput =
  | EvaluationOutput
  | MarketAnalysisOutput
  | WebResearchOutput;

export interface AgentResults {
  evaluation_result: EvaluationOutput | null;
  market_result: MarketAnalysisOutput | null;
  web_result: WebResearchOutput | null;
}

export interface FinalAnswer {
  answer: string;
}
