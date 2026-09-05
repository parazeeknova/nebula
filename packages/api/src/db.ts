import { config } from "./config";
import { DbConnection } from "./module_bindings";
import type { AgentJob, AgentStep } from "./module_bindings/types";

export interface StepJson {
  step_id: string;
  agent: string;
  step_order: number;
  input: string;
  output: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface JobJson {
  job_id: string;
  prompt: string;
  requested_agent: string | null;
  status: string;
  selected_agents: string | null;
  final_result: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  steps: StepJson[];
}

let writerPromise: Promise<DbConnection> | null = null;

const connectWriter = (): Promise<DbConnection> => {
  if (!writerPromise) {
    writerPromise = new Promise<DbConnection>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        writerPromise = null;
        reject(new Error("SpacetimeDB connection timeout"));
      }, 15_000);
      try {
        DbConnection.builder()
          .withUri(config.spacetimedbHost)
          .withDatabaseName(config.spacetimedbDb)
          .onConnect((conn) => {
            clearTimeout(timeoutId);
            resolve(conn);
          })
          .onConnectError((_ctx, error) => {
            clearTimeout(timeoutId);
            writerPromise = null;
            reject(error);
          })
          .build();
      } catch (error) {
        clearTimeout(timeoutId);
        writerPromise = null;
        reject(error as Error);
      }
    });
  }
  return writerPromise;
};

export const createJobRow = async (
  jobId: string,
  prompt: string,
  requestedAgent?: string
): Promise<void> => {
  const conn = await connectWriter();
  await conn.reducers.createJob({
    jobId,
    prompt,
    requestedAgent,
  });
};

export interface JobUpdate {
  status: string;
  selectedAgents?: string;
  finalResult?: string;
  error?: string;
}

export const updateJobRow = async (
  jobId: string,
  update: JobUpdate
): Promise<void> => {
  const conn = await connectWriter();
  await conn.reducers.updateJob({
    error: update.error,
    finalResult: update.finalResult,
    jobId,
    selectedAgents: update.selectedAgents,
    status: update.status,
  });
};

export const addStepRow = async (
  stepId: string,
  jobId: string,
  agent: string,
  stepOrder: number,
  input: string
): Promise<void> => {
  const conn = await connectWriter();
  await conn.reducers.addStep({ agent, input, jobId, stepId, stepOrder });
};

export const updateStepRow = async (
  stepId: string,
  output: string | undefined,
  status: string
): Promise<void> => {
  const conn = await connectWriter();
  await conn.reducers.updateStep({ output, status, stepId });
};

const toIso = (micros: bigint): string =>
  new Date(Number(micros / 1000n)).toISOString();

const toStepJson = (row: AgentStep): StepJson => ({
  agent: row.agent,
  created_at: toIso(row.createdAt.microsSinceUnixEpoch),
  input: row.input,
  output: row.output ?? null,
  status: row.status,
  step_id: row.stepId,
  step_order: row.stepOrder,
  updated_at: toIso(row.updatedAt.microsSinceUnixEpoch),
});

const toJobJson = (row: AgentJob, steps: AgentStep[]): JobJson => ({
  created_at: toIso(row.createdAt.microsSinceUnixEpoch),
  error: row.error ?? null,
  final_result: row.finalResult ?? null,
  job_id: row.jobId,
  prompt: row.prompt,
  requested_agent: row.requestedAgent ?? null,
  selected_agents: row.selectedAgents ?? null,
  status: row.status,
  steps: steps.toSorted((a, b) => a.stepOrder - b.stepOrder).map(toStepJson),
  updated_at: toIso(row.updatedAt.microsSinceUnixEpoch),
});

const escapeId = (jobId: string): string => {
  if (!/^[A-Za-z0-9_-]{1,64}$/u.test(jobId)) {
    throw new Error("invalid job id");
  }
  return jobId.replaceAll("'", "''");
};

export const getJob = (jobId: string): Promise<JobJson | null> =>
  new Promise((resolve, reject) => {
    let conn: DbConnection | null = null;
    const timeoutId = setTimeout(() => {
      try {
        conn?.disconnect();
      } catch {
        // disconnect is best-effort on timeout
      }
      reject(new Error("SpacetimeDB query timeout"));
    }, 15_000);
    const finish = (fn: () => void): void => {
      clearTimeout(timeoutId);
      try {
        conn?.disconnect();
      } catch {
        // disconnect is best-effort after reads complete
      }
      fn();
    };
    try {
      const id = escapeId(jobId);
      conn = DbConnection.builder()
        .withUri(config.spacetimedbHost)
        .withDatabaseName(config.spacetimedbDb)
        .onConnect((c) => {
          c.subscriptionBuilder()
            .onApplied(() => {
              const jobs = [...c.db.agentJob.iter()];
              const steps = [...c.db.agentStep.iter()];
              finish(() => {
                const job = jobs.find((row) => row.jobId === jobId);
                resolve(job ? toJobJson(job, steps) : null);
              });
            })
            .onError((ctx) => {
              finish(() =>
                reject(ctx.event ?? new Error("Subscription error"))
              );
            })
            .subscribe([
              `SELECT * FROM agent_job WHERE job_id = '${id}'`,
              `SELECT * FROM agent_step WHERE job_id = '${id}'`,
            ]);
        })
        .onConnectError((_ctx, error) => {
          finish(() => reject(error));
        })
        .build();
    } catch (error) {
      finish(() => reject(error as Error));
    }
  });
