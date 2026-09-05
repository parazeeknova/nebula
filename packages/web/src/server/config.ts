export const config = {
  fallbackModel: process.env.GENERALCOMPUTE_FALLBACK_MODEL ?? "gemma-4-31B-it",
  firecrawlApiKey: process.env.FIRECRAWL_API_KEY ?? "",
  firecrawlBaseUrl:
    process.env.FIRECRAWL_BASE_URL ?? "https://api.firecrawl.dev",
  generalComputeApiKey: process.env.GENERALCOMPUTE_API_KEY ?? "",
  generalComputeBaseUrl:
    process.env.GENERALCOMPUTE_BASE_URL ?? "https://api.generalcompute.com/v1",
  honchoApiKey: process.env.HONCHO_API_KEY ?? "",
  honchoBaseUrl: process.env.HONCHO_BASE_URL ?? "https://api.honcho.dev",
  honchoWorkspaceId: process.env.HONCHO_WORKSPACE_ID ?? "nebula",
  llmTimeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 120_000),
  model: process.env.GENERALCOMPUTE_MODEL ?? "gpt-oss-120b",
  openaiApiKey: process.env.OPENAI_PROVIDER_API_KEY ?? "",
  openaiBaseUrl:
    process.env.OPENAI_PROVIDER_BASE_URL ?? "https://api.openai.com/v1",
  port: Number(process.env.PORT ?? 3002),
  spacetimedbDb: process.env.SPACETIMEDB_DB_NAME ?? "nebula",
  spacetimedbHost: process.env.SPACETIMEDB_HOST ?? "ws://127.0.0.1:3000",
  spacetimedbToken: process.env.SPACETIMEDB_TOKEN ?? "",
  workerPollMs: Number(process.env.WORKER_POLL_MS ?? 1000),
};
