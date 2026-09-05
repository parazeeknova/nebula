import { runCode } from "./agents/code";
import { runCopy } from "./agents/copy";
import { runEvaluation } from "./agents/evaluation";
import { runMarketAnalysis } from "./agents/market-analysis";
import { CONFIDENCE_THRESHOLD, planRouting } from "./agents/orchestrator";
import { runProduct } from "./agents/product";
import { isAgentName } from "./agents/registry";
import type { AgentName } from "./agents/registry";
import { runSupport } from "./agents/support";
import { synthesize } from "./agents/synthesize";
import type {
  AgentOutput,
  AgentResults,
  FinalAnswer,
  PlannedTask,
  RoutingDecision,
} from "./agents/types";
import { runWebResearch } from "./agents/web-research";
import {
  addStepRow,
  getRoomMemoryConfig,
  updateJobRow,
  updateStepRow,
} from "./db";
import { pullRoomMemory } from "./honcho";
import { getSystemAnswer, isSystemQuery } from "./system";

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const toJson = (value: unknown): string => JSON.stringify(value);

/** Resolve a room's Honcho context for a room-scoped job, or "" when unavailable. */
const loadRoomMemory = async (
  roomId: bigint,
  prompt: string
): Promise<string> => {
  try {
    const room = await getRoomMemoryConfig(roomId);
    if (room === null || room.backend !== "honcho") {
      return "";
    }
    const mem = await pullRoomMemory(room.namespace, {
      prompt,
      targetPeer: "user",
    });
    return mem.context;
  } catch (error) {
    console.error(
      `failed to load room memory for room ${roomId}: ${errorMessage(error)}`
    );
    return "";
  }
};

const recordStep = async <T>(
  jobId: string,
  agent: string,
  order: number,
  input: unknown,
  run: () => Promise<T>
): Promise<T> => {
  const stepId = crypto.randomUUID();
  console.info(`[job ${jobId}] step ${order}/${agent} START`);
  const startedAt = Date.now();
  await addStepRow(stepId, jobId, agent, order, toJson(input));
  try {
    const output = await run();
    await updateStepRow(stepId, toJson(output), "completed");
    console.info(
      `[job ${jobId}] step ${order}/${agent} completed in ${Date.now() - startedAt}ms`
    );
    return output;
  } catch (error) {
    await updateStepRow(stepId, undefined, "failed");
    console.error(
      `[job ${jobId}] step ${order}/${agent} FAILED in ${Date.now() - startedAt}ms: ${errorMessage(error)}`
    );
    throw error;
  }
};

const taskOf = (routing: RoutingDecision, agent: AgentName): PlannedTask =>
  routing.tasks[agent] ?? { task: "" };

const runSingleAgent = (
  agent: AgentName,
  planned: PlannedTask,
  results: AgentResults,
  memory?: string
): Promise<AgentOutput> => {
  if (agent === "web") {
    return runWebResearch(planned.task, planned.context, memory);
  }
  if (agent === "market") {
    return runMarketAnalysis(
      planned.task,
      planned.context,
      results.web_result ?? undefined,
      memory
    );
  }
  if (agent === "code") {
    return runCode(planned.task, planned.context, memory);
  }
  if (agent === "copy") {
    return runCopy(planned.task, planned.context, memory);
  }
  if (agent === "pm") {
    return runProduct(planned.task, planned.context, memory);
  }
  if (agent === "support") {
    return runSupport(planned.task, planned.context, memory);
  }
  return runEvaluation(planned.task, planned.context, {
    market_analysis: results.market_result ?? undefined,
    web_research: results.web_result ?? undefined,
  });
};

const storeResult = (
  results: AgentResults,
  agent: AgentName,
  output: AgentOutput
): void => {
  if (agent === "web" && "findings" in output) {
    results.web_result = output;
  } else if (agent === "market" && "market_summary" in output) {
    results.market_result = output;
  } else if (agent === "code" && "code" in output) {
    results.code_result = output;
  } else if (agent === "copy" && "draft" in output) {
    results.copy_result = output;
  } else if (agent === "pm" && "user_stories" in output) {
    results.pm_result = output;
  } else if (agent === "support" && "answer" in output) {
    results.support_result = output;
  } else if (agent === "evaluation" && "decision" in output) {
    results.evaluation_result = output;
  }
};

interface ParallelOutcome {
  error?: unknown;
  output?: AgentOutput;
}

const runParallelStep = async (
  jobId: string,
  agent: string,
  order: number,
  input: unknown,
  run: () => Promise<AgentOutput>
): Promise<ParallelOutcome> => {
  const stepId = crypto.randomUUID();
  await addStepRow(stepId, jobId, agent, order, toJson(input));
  try {
    const output = await run();
    await updateStepRow(stepId, toJson(output), "completed");
    return { output };
  } catch (error) {
    await updateStepRow(stepId, undefined, "failed");
    return { error };
  }
};

const throwIfFailed = (outcome: ParallelOutcome): AgentOutput => {
  if (outcome.output === undefined) {
    throw outcome.error instanceof Error
      ? outcome.error
      : new Error(String(outcome.error));
  }
  return outcome.output;
};

const executeFullInvestigation = async (
  jobId: string,
  routing: RoutingDecision,
  firstOrder: number,
  memory?: string
): Promise<AgentResults> => {
  const results: AgentResults = {
    code_result: null,
    copy_result: null,
    evaluation_result: null,
    market_result: null,
    pm_result: null,
    support_result: null,
    web_result: null,
  };
  const webPlanned = taskOf(routing, "web");
  const marketPlanned = taskOf(routing, "market");
  const evaluationPlanned = taskOf(routing, "evaluation");
  const webOrder = firstOrder + 1;
  const marketOrder = firstOrder + 2;
  const evaluationOrder = firstOrder + 3;
  const [webOutcome, marketOutcome] = await Promise.all([
    runParallelStep(
      jobId,
      "web",
      webOrder,
      { context: webPlanned.context, task: webPlanned.task },
      () => runWebResearch(webPlanned.task, webPlanned.context, memory)
    ),
    runParallelStep(
      jobId,
      "market",
      marketOrder,
      { context: marketPlanned.context, task: marketPlanned.task },
      () =>
        runMarketAnalysis(
          marketPlanned.task,
          marketPlanned.context,
          undefined,
          memory
        )
    ),
  ]);
  storeResult(results, "web", throwIfFailed(webOutcome));
  storeResult(results, "market", throwIfFailed(marketOutcome));
  const evaluationOutput = await recordStep(
    jobId,
    "evaluation",
    evaluationOrder,
    { context: evaluationPlanned.context, task: evaluationPlanned.task },
    () =>
      runEvaluation(evaluationPlanned.task, evaluationPlanned.context, {
        market_analysis: results.market_result ?? undefined,
        web_research: results.web_result ?? undefined,
      })
  );
  storeResult(results, "evaluation", evaluationOutput);
  return results;
};

const executeAgents = async (
  jobId: string,
  routing: RoutingDecision,
  firstOrder: number,
  memory?: string
): Promise<AgentResults> => {
  const results: AgentResults = {
    code_result: null,
    copy_result: null,
    evaluation_result: null,
    market_result: null,
    pm_result: null,
    support_result: null,
    web_result: null,
  };
  const selected = routing.agents;
  const full =
    selected.includes("web") &&
    selected.includes("market") &&
    selected.includes("evaluation");
  if (full) {
    return await executeFullInvestigation(jobId, routing, firstOrder, memory);
  }
  let order = firstOrder;
  for (const agent of selected) {
    const planned = taskOf(routing, agent);
    order += 1;
    // eslint-disable-next-line no-await-in-loop -- agents run sequentially so downstream agents receive upstream context
    const output = await recordStep(
      jobId,
      agent,
      order,
      { context: planned.context, task: planned.task },
      () => runSingleAgent(agent, planned, results, memory)
    );
    storeResult(results, agent, output);
  }
  return results;
};

const runRoutedPipeline = async (
  jobId: string,
  prompt: string,
  routing: RoutingDecision,
  firstOrder = 0,
  memory?: string
): Promise<void> => {
  let selectedAgents: string | undefined;
  const startedAt = Date.now();
  try {
    if (routing.agents.length === 0) {
      selectedAgents = toJson([]);
      console.info(
        `[job ${jobId}] no agents needed, answering directly (${Date.now() - startedAt}ms)`
      );
      await updateJobRow(jobId, {
        finalResult: toJson({ answer: routing.answer ?? "" }),
        selectedAgents,
        status: "completed",
      });
      return;
    }
    if (routing.confidence < CONFIDENCE_THRESHOLD) {
      const answer =
        "I am not confident enough to act on this yet (routing confidence " +
        `${routing.confidence.toFixed(2)}). ${routing.reason} ` +
        "Could you clarify whether you want web research, market analysis, or a decision evaluation?";
      selectedAgents = toJson([]);
      console.info(
        `[job ${jobId}] low routing confidence, asked for clarification`
      );
      await updateJobRow(jobId, {
        finalResult: toJson({ answer }),
        selectedAgents,
        status: "completed",
      });
      return;
    }
    selectedAgents = toJson(routing.agents);
    await updateJobRow(jobId, { selectedAgents, status: "running" });
    console.info(
      `[job ${jobId}] executing agents: [${routing.agents.join(", ")}]`
    );
    const results = await executeAgents(jobId, routing, firstOrder, memory);
    const synthesisInput = {
      code_result: results.code_result,
      copy_result: results.copy_result,
      evaluation_result: results.evaluation_result,
      market_result: results.market_result,
      original_prompt: prompt,
      pm_result: results.pm_result,
      support_result: results.support_result,
      web_result: results.web_result,
    };
    const finalAnswer: FinalAnswer = await recordStep(
      jobId,
      "synthesis",
      firstOrder + routing.agents.length + 1,
      synthesisInput,
      () => synthesize(prompt, results, memory)
    );
    if (finalAnswer.answer.trim().length === 0) {
      throw new Error("synthesis did not return an answer");
    }
    await updateJobRow(jobId, {
      finalResult: toJson({ answer: finalAnswer.answer }),
      selectedAgents,
      status: "completed",
    });
    console.info(`[job ${jobId}] JOB COMPLETED in ${Date.now() - startedAt}ms`);
  } catch (error) {
    console.error(`[job ${jobId}] PIPELINE FAILED: ${errorMessage(error)}`);
    await updateJobRow(jobId, {
      error: errorMessage(error),
      selectedAgents,
      status: "failed",
    });
  }
};

export const runPipeline = async (
  jobId: string,
  prompt: string,
  requestedAgent?: AgentName,
  roomId?: bigint
): Promise<void> => {
  let selectedAgents: string | undefined;
  let memory: string | undefined;
  try {
    await updateJobRow(jobId, { status: "running" });

    if (roomId !== undefined) {
      memory = await loadRoomMemory(roomId, prompt);
      if (memory) {
        console.info(
          `[job ${jobId}] loaded room memory (${memory.length} chars)`
        );
      }
    }

    if (requestedAgent && isAgentName(requestedAgent)) {
      const routing: RoutingDecision = {
        agents: [requestedAgent],
        confidence: 1,
        reason:
          "Agent explicitly requested by the caller; orchestrator bypassed.",
        route: "specialized",
        tasks: { [requestedAgent]: { task: prompt } },
      };
      const orchestratorStepId = crypto.randomUUID();
      await addStepRow(
        orchestratorStepId,
        jobId,
        "orchestrator",
        1,
        toJson({ prompt })
      );
      await updateStepRow(orchestratorStepId, toJson(routing), "completed");
      await runRoutedPipeline(jobId, prompt, routing, 1, memory);
      return;
    }

    if (isSystemQuery(prompt)) {
      console.info(`[job ${jobId}] system query detected`);
      const answer = getSystemAnswer(prompt);
      const stepId = crypto.randomUUID();
      await addStepRow(stepId, jobId, "system", 1, toJson({ prompt }));
      await updateStepRow(stepId, toJson({ answer }), "completed");
      selectedAgents = toJson([]);
      await updateJobRow(jobId, {
        finalResult: toJson({ answer }),
        selectedAgents,
        status: "completed",
      });
      return;
    }

    console.info(`[job ${jobId}] calling orchestrator for routing`);
    const routingStartedAt = Date.now();
    const routing = await planRouting(prompt, memory);
    console.info(
      `[job ${jobId}] routed in ${Date.now() - routingStartedAt}ms → route=${routing.route} agents=[${routing.agents.join(",") || "none"}] conf=${routing.confidence}`
    );
    const orchestratorStepId = crypto.randomUUID();
    await addStepRow(
      orchestratorStepId,
      jobId,
      "orchestrator",
      1,
      toJson({ prompt })
    );
    await updateStepRow(orchestratorStepId, toJson(routing), "completed");
    await runRoutedPipeline(jobId, prompt, routing, 1, memory);
  } catch (error) {
    console.error(`[job ${jobId}] PIPELINE FAILED: ${errorMessage(error)}`);
    await updateJobRow(jobId, {
      error: errorMessage(error),
      selectedAgents,
      status: "failed",
    });
  }
};
