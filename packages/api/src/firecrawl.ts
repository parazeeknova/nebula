import { config } from "./config";

export interface FirecrawlResult {
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

const toResult = (item: FirecrawlItem): FirecrawlResult | null => {
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

export const firecrawlSearch = async (
  query: string,
  limit = 8
): Promise<FirecrawlResult[]> => {
  if (!config.firecrawlApiKey) {
    throw new Error("FIRECRAWL_API_KEY is not set");
  }
  const response = await fetch(`${config.firecrawlBaseUrl}/v1/search`, {
    body: JSON.stringify({ limit, query }),
    headers: {
      Authorization: `Bearer ${config.firecrawlApiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(
      `Firecrawl search failed: ${response.status} ${await response.text()}`
    );
  }
  const data = (await response.json()) as { data?: unknown };
  if (!Array.isArray(data.data)) {
    throw new TypeError("Firecrawl search returned an unexpected shape");
  }
  return (data.data as FirecrawlItem[])
    .map(toResult)
    .filter((r): r is FirecrawlResult => r !== null);
};
