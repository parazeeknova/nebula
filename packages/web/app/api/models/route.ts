import { getLlmClient } from "@/src/server/llm";

export const runtime = "nodejs";

export const GET = async (): Promise<Response> => {
  try {
    const llm = getLlmClient();
    const models = await llm.models.list();
    const ids = models.data
      .map((m) => m.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    return Response.json({ models: ids });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 502 });
  }
};
