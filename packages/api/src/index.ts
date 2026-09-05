import { Hono } from "hono";

import { isAgentName } from "./agents/registry";
import { config } from "./config";
import { createJobRow, getJob } from "./db";
import { runPipeline } from "./pipeline";

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));

app.post("/agent", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "request body must be JSON" }, 400);
  }
  const { prompt, agent } = body as { prompt?: unknown; agent?: unknown };
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return c.json({ error: "prompt must be a non-empty string" }, 400);
  }
  if (agent !== undefined && !isAgentName(agent)) {
    return c.json(
      { error: "agent must be one of: web, market, evaluation" },
      400
    );
  }

  const jobId = crypto.randomUUID();
  try {
    await createJobRow(jobId, prompt, agent);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return c.json({ error: `failed to create job: ${message}` }, 502);
  }

  void (async () => {
    try {
      await runPipeline(jobId, prompt, agent);
    } catch (error) {
      console.error(`pipeline failed for job ${jobId}:`, error);
    }
  })();

  return c.json({ job_id: jobId, status: "queued" }, 202);
});

app.get("/jobs/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const job = await getJob(id);
    if (!job) {
      return c.json({ error: "job not found" }, 404);
    }
    return c.json(job);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return c.json({ error: message }, 502);
  }
});

app.notFound((c) => c.json({ error: "not found" }, 404));
// eslint-disable-next-line promise/prefer-await-to-callbacks -- Hono error handler signature, not a Node-style callback
app.onError((error, c) => {
  console.error("unhandled error:", error);
  return c.json({ error: "internal server error" }, 500);
});

export default {
  fetch: app.fetch,
  port: config.port,
};
