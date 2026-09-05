import type { AgentName } from "@/src/server/agents/registry";
import { isAgentName } from "@/src/server/agents/registry";
import { createJobRow } from "@/src/server/db";
import { runPipeline } from "@/src/server/pipeline";

export const runtime = "nodejs";

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const POST = async (request: Request): Promise<Response> => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "request body must be JSON" },
      { status: 400 }
    );
  }
  const { agent, prompt } = body as { agent?: unknown; prompt?: unknown };
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return Response.json(
      { error: "prompt must be a non-empty string" },
      { status: 400 }
    );
  }
  if (agent !== undefined && !isAgentName(agent)) {
    return Response.json(
      { error: "agent must be one of: web, market, evaluation" },
      { status: 400 }
    );
  }

  const jobId = crypto.randomUUID();
  const requestedAgent = agent as AgentName | undefined;
  try {
    await createJobRow(jobId, prompt, requestedAgent);
  } catch (error) {
    return Response.json(
      { error: `failed to create job: ${errorText(error)}` },
      { status: 502 }
    );
  }

  void (async () => {
    try {
      await runPipeline(jobId, prompt, requestedAgent);
    } catch (error) {
      console.error(`pipeline failed for job ${jobId}:`, error);
    }
  })();

  return Response.json({ job_id: jobId, status: "queued" }, { status: 202 });
};
