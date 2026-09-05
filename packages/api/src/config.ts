export const config = {
  fallbackModel: process.env.GENERALCOMPUTE_FALLBACK_MODEL ?? "gemma-4-31B-it",
  firecrawlApiKey: process.env.FIRECRAWL_API_KEY ?? "",
  firecrawlBaseUrl:
    process.env.FIRECRAWL_BASE_URL ?? "https://api.firecrawl.dev",
  generalComputeApiKey: process.env.GENERALCOMPUTE_API_KEY ?? "",
  generalComputeBaseUrl:
    process.env.GENERALCOMPUTE_BASE_URL ?? "https://api.generalcompute.com/v1",
  model: process.env.GENERALCOMPUTE_MODEL ?? "gpt-oss-120b",
  port: Number(process.env.PORT ?? 3002),
  spacetimedbDb: process.env.SPACETIMEDB_DB_NAME ?? "neb",
  spacetimedbHost: process.env.SPACETIMEDB_HOST ?? "ws://127.0.0.1:3000",
};
