import { config } from "../config";
import type { AgentTool } from "../llm";

export interface WebSearchHit {
  title: string;
  url: string;
  summary: string;
}

interface FirecrawlItem {
  title?: unknown;
  url?: unknown;
  description?: unknown;
  markdown?: unknown;
}

const firecrawl = async (
  path: string,
  body: Record<string, unknown>
): Promise<unknown> => {
  if (!config.firecrawlApiKey) {
    throw new Error("FIRECRAWL_API_KEY is not set");
  }
  const response = await fetch(`${config.firecrawlBaseUrl}${path}`, {
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${config.firecrawlApiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(
      `Firecrawl ${path} failed: ${response.status} ${await response.text()}`
    );
  }
  return (await response.json()) as unknown;
};

const hit = (item: FirecrawlItem): WebSearchHit | null => {
  if (typeof item.url !== "string" || item.url.length === 0) {
    return null;
  }
  const title = typeof item.title === "string" ? item.title : item.url;
  let summary = "";
  if (typeof item.description === "string" && item.description.length > 0) {
    summary = item.description;
  } else if (typeof item.markdown === "string") {
    summary = item.markdown.slice(0, 500);
  }
  return { summary, title, url: item.url };
};

const stringArg = (
  args: Record<string, unknown>,
  key: string,
  fallback = ""
): string => {
  const v = args[key];
  return typeof v === "string" ? v : fallback;
};

const numberArg = (
  args: Record<string, unknown>,
  key: string,
  fallback: number
): number => {
  const v = args[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
};

export const webSearchTool: AgentTool = {
  description:
    "Search the live web for current facts, news, or sources. Returns a list of titled results with URLs and short summaries. Use this when you need up-to-date external information.",
  parameters: {
    properties: {
      limit: {
        description: "How many results to return (default 8).",
        type: "number",
      },
      query: {
        description: "The search query to run against the web.",
        type: "string",
      },
    },
    required: ["query"],
    type: "object",
  },
  run: async (args) => {
    const query = stringArg(args, "query");
    const limit = numberArg(args, "limit", 8);
    const data = (await firecrawl("/v1/search", {
      limit: Math.max(1, Math.min(10, limit)),
      query,
    })) as { data?: unknown };
    if (!Array.isArray(data.data)) {
      throw new TypeError("web search returned an unexpected shape");
    }
    return (data.data as FirecrawlItem[])
      .map(hit)
      .filter((h): h is WebSearchHit => h !== null);
  },
};

export const webExtractTool: AgentTool = {
  description:
    "Fetch the full text content of a specific URL. Use this to read the details of a page found via web_search, or to inspect a specific source.",
  parameters: {
    properties: {
      url: { description: "The URL to fetch and read.", type: "string" },
    },
    required: ["url"],
    type: "object",
  },
  run: async (args) => {
    const url = stringArg(args, "url");
    const data = (await firecrawl("/v1/scrape", {
      formats: ["markdown"],
      url,
    })) as { markdown?: unknown };
    return {
      content:
        typeof data.markdown === "string"
          ? data.markdown.slice(0, 12_000)
          : "no readable content",
      url,
    };
  },
};

export const toolsByName = {
  web_extract: webExtractTool,
  web_search: webSearchTool,
} as const;

export type ToolName = keyof typeof toolsByName;
