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
    });
  }
  return client;
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

export const chatJson = async <T>(system: string, user: string): Promise<T> => {
  const llm = getLlmClient();
  const attempt = async (useJsonMode: boolean): Promise<string> => {
    const response = await llm.chat.completions.create({
      messages: [
        { content: system, role: "system" },
        { content: user, role: "user" },
      ],
      model: config.model,
      ...(useJsonMode ? { response_format: { type: "json_object" } } : {}),
    });
    const content = response.choices[0]?.message.content ?? "";
    if (content.trim().length === 0) {
      throw new Error("LLM returned an empty response");
    }
    return content;
  };
  try {
    return extractJson(await attempt(true)) as T;
  } catch {
    return extractJson(await attempt(false)) as T;
  }
};
