import type { ComponentType } from "react";

import {
  BotIcon,
  ChartIcon,
  CompassIcon,
  SearchIcon,
  SparkleIcon,
} from "../components/icons";

export interface AgentTheme {
  color: string;
  icon: ComponentType<{ className?: string }>;
}

/**
 * Per-agent identity: a stable color + bespoke glyph so each specialist is
 * distinguishable at a glance. Falls back to a neutral mark for custom or
 * unknown agents.
 */
export const AGENT_THEME: Record<string, AgentTheme> = {
  code: { color: "#22c55e", icon: SearchIcon },
  copy: { color: "#f472b6", icon: SparkleIcon },
  eval: { color: "#a78bfa", icon: CompassIcon },
  mkt: { color: "#fb923c", icon: ChartIcon },
  neb: { color: "#7c6cff", icon: SparkleIcon },
  pm: { color: "#38bdf8", icon: CompassIcon },
  res: { color: "#2dd4bf", icon: SearchIcon },
  sup: { color: "#60a5fa", icon: BotIcon },
};

const FALLBACK: AgentTheme = { color: "#5865f2", icon: BotIcon };

/** Resolve a theme from an agent handle (case-insensitive). */
export const themeForHandle = (handle: string): AgentTheme =>
  AGENT_THEME[handle.toLowerCase()] ?? FALLBACK;
