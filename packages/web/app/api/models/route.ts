import { listProviderModels } from "@/src/server/llm";

export const runtime = "nodejs";

export const GET = async (): Promise<Response> => {
  try {
    const { models } = await listProviderModels();
    return Response.json({ models });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 502 });
  }
};
