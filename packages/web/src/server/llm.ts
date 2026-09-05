import { OpenAI } from "openai";

import { config } from "./config";

let client: OpenAI | null = null;

export const getLlmClient = (): OpenAI => {
  if (!config.generalComputeApiKey) {
    throw new Error("GENERALCOMPUTE_API_KEY is not set");
  }
  if (!client) {
    client = new OpenAI({
      apiKey: config.generalComputeApiKey,
      baseURL: config.generalComputeBaseUrl,
      timeout: config.llmTimeoutMs,
    });
  }
  return client;
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
  model: string,
  system: string,
  user: string,
  useJsonMode: boolean
): Promise<string> => {
  const llm = getLlmClient();
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

export const chatJson = async <T>(system: string, user: string): Promise<T> => {
  const models = resolveModels(config.model, config.fallbackModel);
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
