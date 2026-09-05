import { AsyncLocalStorage } from "node:async_hooks";

import { OpenAI } from "openai";

import { config } from "./config";

type ProviderName = "generalcompute" | "openai";

interface ProviderConfig {
  name: ProviderName;
  label: string;
  apiKey: string;
  baseUrl: string;
}

/** Enabled providers (those with a configured API key). */
const PROVIDERS: ProviderConfig[] = [
  {
    apiKey: config.generalComputeApiKey,
    baseUrl: config.generalComputeBaseUrl,
    label: "GeneralCompute",
    name: "generalcompute" as const,
  },
  {
    apiKey: config.openaiApiKey,
    baseUrl: config.openaiBaseUrl,
    label: "OpenAI",
    name: "openai" as const,
  },
].filter((p) => p.apiKey.length > 0);

const providerByName = (name: ProviderName): ProviderConfig => {
  const provider = PROVIDERS.find((p) => p.name === name);
  if (!provider) {
    throw new Error(`model provider not configured: ${name}`);
  }
  return provider;
};

export const parseModelRef = (
  ref: string
): { model: string; provider: ProviderName } => {
  const sep = ref.indexOf("::");
  if (sep !== -1) {
    const prefix = ref.slice(0, sep);
    if (prefix === "generalcompute" || prefix === "openai") {
      return { model: ref.slice(sep + 2), provider: prefix };
    }
  }
  return { model: ref, provider: "generalcompute" };
};

/** Per-job model override, scoped so nested/parallel agent calls inherit it. */
const modelContext = new AsyncLocalStorage<string>();

export const withModel = <T>(model: string | undefined, fn: () => T): T =>
  modelContext.run(model ?? "", fn);

const clients = new Map<ProviderName, OpenAI>();

const getClient = (provider: ProviderName): OpenAI => {
  const cached = clients.get(provider);
  if (cached) {
    return cached;
  }
  const cfg = providerByName(provider);
  const client = new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseUrl,
    timeout: config.llmTimeoutMs,
  });
  clients.set(provider, client);
  return client;
};

/** GeneralCompute client (kept for callers that only target that provider). */
export const getLlmClient = (): OpenAI => getClient("generalcompute");

/**
 * List model ids across all enabled providers, each qualified as
 * `provider::model`.
 */
export const listProviderModels = async (): Promise<{ models: string[] }> => {
  const models: string[] = [];
  for (const provider of PROVIDERS) {
    try {
      // eslint-disable-next-line no-await-in-loop -- providers are queried one at a time so a single failure never aborts the rest
      const { data } = await getClient(provider.name).models.list();
      for (const m of data) {
        if (typeof m.id === "string" && m.id.length > 0) {
          models.push(`${provider.name}::${m.id}`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[llm] failed to list models for ${provider.name}: ${message.slice(0, 160)}`
      );
    }
  }
  return { models };
};

export const resolveModels = (primary: string, fallback: string): string[] => {
  const models: string[] = [];
  for (const model of [primary.trim(), fallback.trim()]) {
    if (model.length > 0 && !models.includes(model)) {
      models.push(model);
    }
  }
  if (models.length === 0) {
    throw new Error("No LLM model configured");
  }
  return models;
};

const extractJson = (raw: string): unknown => {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*(?<body>[\s\S]*?)```/u);
  const candidate = (fenced?.groups?.body ?? trimmed).trim();
  const start = candidate.search(/[{[]/u);
  const end = Math.max(candidate.lastIndexOf("}"), candidate.lastIndexOf("]"));
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`LLM did not return JSON: ${raw.slice(0, 200)}`);
  }
  return JSON.parse(candidate.slice(start, end + 1)) as unknown;
};

const requestChat = async (
  modelRef: string,
  system: string,
  user: string,
  useJsonMode: boolean
): Promise<string> => {
  const { model, provider } = parseModelRef(modelRef);
  const llm = getClient(provider);
  const response = await llm.chat.completions.create({
    messages: [
      { content: system, role: "system" },
      { content: user, role: "user" },
    ],
    model,
    ...(useJsonMode ? { response_format: { type: "json_object" } } : {}),
  });
  const content = response.choices[0]?.message.content ?? "";
  if (content.trim().length === 0) {
    throw new Error("LLM returned an empty response");
  }
  return content;
};

/** Scoped (per-job) model override wins, then an explicit option, then config. */
const resolveModelList = (override?: string): string[] => {
  const scoped = modelContext.getStore();
  const primary = override || scoped || "";
  return primary.length > 0
    ? resolveModels(primary, config.fallbackModel)
    : resolveModels(config.model, config.fallbackModel);
};

export const chatJson = async <T>(
  system: string,
  user: string,
  options?: { model?: string }
): Promise<T> => {
  const models = resolveModelList(options?.model);
  const failures: string[] = [];
  for (const useJsonMode of [true, false]) {
    for (const model of models) {
      const startedAt = Date.now();
      try {
        console.info(
          `[llm] call model=${model} jsonMode=${useJsonMode ? "on" : "off"}`
        );
        const parsed = extractJson(
          // eslint-disable-next-line no-await-in-loop -- models are tried sequentially: fallback only runs after primary fails
          await requestChat(model, system, user, useJsonMode)
        ) as T;
        const elapsedMs = Date.now() - startedAt;
        console.info(`[llm] ok model=${model} in ${elapsedMs}ms`);
        if (model !== models[0]) {
          console.warn(
            `[llm] primary model failed, served by fallback ${model}`
          );
        }
        return parsed;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const elapsedMs = Date.now() - startedAt;
        failures.push(`${model}: ${message}`);
        console.warn(
          `[llm] model=${model} FAILED after ${elapsedMs}ms: ${message.slice(0, 160)}`
        );
      }
    }
  }
  throw new Error(`All LLM models failed — ${failures.join(" | ")}`);
};

export interface StreamTextOptions {
  model?: string;
  onToken?: (token: string) => Promise<void>;
}

const requestChatStream = async (
  modelRef: string,
  system: string,
  user: string,
  onToken: (token: string) => Promise<void>
): Promise<string> => {
  const { model, provider } = parseModelRef(modelRef);
  const llm = getClient(provider);
  const stream = await llm.chat.completions.create({
    messages: [
      { content: system, role: "system" },
      { content: user, role: "user" },
    ],
    model,
    stream: true,
  });
  let text = "";
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (delta.length > 0) {
      text += delta;
      // eslint-disable-next-line no-await-in-loop -- tokens must flush in order
      await onToken(delta);
    }
  }
  if (text.trim().length === 0) {
    throw new Error("LLM streamed an empty response");
  }
  return text;
};

export const streamChatText = async (
  system: string,
  user: string,
  options?: StreamTextOptions
): Promise<string> => {
  const models = resolveModelList(options?.model);
  const onToken = options?.onToken ?? (() => Promise.resolve());
  const failures: string[] = [];
  for (const model of models) {
    const startedAt = Date.now();
    let emitted = 0;
    try {
      console.info(`[llm] stream model=${model}`);
      const text =
        // eslint-disable-next-line no-await-in-loop -- models stream sequentially: fallback only runs after primary fails
        await requestChatStream(model, system, user, async (t) => {
          emitted += t.length;
          await onToken(t);
        });
      console.info(
        `[llm] stream ok model=${model} in ${Date.now() - startedAt}ms`
      );
      if (model !== models[0]) {
        console.warn(`[llm] primary model failed, served by fallback ${model}`);
      }
      return text;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${model}: ${message}`);
      console.warn(
        `[llm] stream model=${model} FAILED after ${Date.now() - startedAt}ms: ${message.slice(0, 160)}`
      );
      if (emitted > 0) {
        throw error;
      }
    }
  }
  throw new Error(`All LLM models failed to stream — ${failures.join(" | ")}`);
};
