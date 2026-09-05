import { runEvaluation } from "./agents/evaluation";
import { runMarketAnalysis } from "./agents/market-analysis";
import { CONFIDENCE_THRESHOLD, planRouting } from "./agents/orchestrator";
import { isAgentName } from "./agents/registry";
import type { AgentName } from "./agents/registry";
import { synthesize } from "./agents/synthesize";
import type {
  AgentOutput,
  AgentResults,
  FinalAnswer,
  PlannedTask,
  RoutingDecision,
} from "./agents/types";
import { runWebResearch } from "./agents/web-research";
import { addStepRow, updateJobRow, updateStepRow } from "./db";
import { getSystemAnswer, isSystemQuery } from "./system";

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const toJson = (value: unknown): string => JSON.stringify(value);

const recordStep = async <T>(
  jobId: string,
  agent: string,
  order: number,
  input: unknown,
  run: () => Promise<T>
): Promise<T> => {
  const stepId = crypto.randomUUID();
  await addStepRow(stepId, jobId, agent, order, toJson(input));
  try {
    const output = await run();
    await updateStepRow(stepId, toJson(output), "completed");
    return output;
  } catch (error) {
    await updateStepRow(stepId, undefined, "failed");
    throw error;
  }
};

const taskOf = (routing: RoutingDecision, agent: AgentName): PlannedTask =>
  routing.tasks[agent] ?? { task: "" };

const runSingleAgent = (
  agent: AgentName,
  planned: PlannedTask,
  results: AgentResults
): Promise<AgentOutput> => {
  if (agent === "web") {
    return runWebResearch(planned.task, planned.context);
  }
  if (agent === "market") {
    return runMarketAnalysis(
      planned.task,
      planned.context,
      results.web_result ?? undefined
    );
  }
  return runEvaluation(
    planned.task,
    planned.context,
    results.web_result ?? undefined,
    results.market_result ?? undefined
  );
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
  firstOrder: number
): Promise<AgentResults> => {
  const results: AgentResults = {
    evaluation_result: null,
    market_result: null,
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
      () => runWebResearch(webPlanned.task, webPlanned.context)
    ),
    runParallelStep(
      jobId,
      "market",
      marketOrder,
      { context: marketPlanned.context, task: marketPlanned.task },
      () => runMarketAnalysis(marketPlanned.task, marketPlanned.context)
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
      runEvaluation(
        evaluationPlanned.task,
        evaluationPlanned.context,
        results.web_result ?? undefined,
        results.market_result ?? undefined
      )
  );
  storeResult(results, "evaluation", evaluationOutput);
  return results;
};

const executeAgents = async (
  jobId: string,
  routing: RoutingDecision,
  firstOrder: number
): Promise<AgentResults> => {
  const results: AgentResults = {
    evaluation_result: null,
    market_result: null,
    web_result: null,
  };
  const selected = routing.agents;
  const full =
    selected.includes("web") &&
    selected.includes("market") &&
    selected.includes("evaluation");
  if (full) {
    return await executeFullInvestigation(jobId, routing, firstOrder);
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
      () => runSingleAgent(agent, planned, results)
    );
    storeResult(results, agent, output);
  }
  return results;
};

const runRoutedPipeline = async (
  jobId: string,
  prompt: string,
  routing: RoutingDecision,
  firstOrder = 0
): Promise<void> => {
  let selectedAgents: string | undefined;
  try {
    if (routing.agents.length === 0) {
      selectedAgents = toJson([]);
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
      await updateJobRow(jobId, {
        finalResult: toJson({ answer }),
        selectedAgents,
        status: "completed",
      });
      return;
    }
    selectedAgents = toJson(routing.agents);
    await updateJobRow(jobId, { selectedAgents, status: "running" });
    const results = await executeAgents(jobId, routing, firstOrder);
    const synthesisInput = {
      evaluation_result: results.evaluation_result,
      market_result: results.market_result,
      original_prompt: prompt,
      web_result: results.web_result,
    };
    const finalAnswer: FinalAnswer = await recordStep(
      jobId,
      "synthesis",
      firstOrder + routing.agents.length + 1,
      synthesisInput,
      () => synthesize(prompt, results)
    );
    if (finalAnswer.answer.trim().length === 0) {
      throw new Error("synthesis did not return an answer");
    }
    await updateJobRow(jobId, {
      finalResult: toJson({ answer: finalAnswer.answer }),
      selectedAgents,
      status: "completed",
    });
  } catch (error) {
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
  requestedAgent?: AgentName
): Promise<void> => {
  let selectedAgents: string | undefined;
  try {
    await updateJobRow(jobId, { status: "running" });

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
      await runRoutedPipeline(jobId, prompt, routing, 1);
      return;
    }

    if (isSystemQuery(prompt)) {
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

    const routing = await planRouting(prompt);
    const orchestratorStepId = crypto.randomUUID();
    await addStepRow(
      orchestratorStepId,
      jobId,
      "orchestrator",
      1,
      toJson({ prompt })
    );
    await updateStepRow(orchestratorStepId, toJson(routing), "completed");
    await runRoutedPipeline(jobId, prompt, routing, 1);
  } catch (error) {
    await updateJobRow(jobId, {
      error: errorMessage(error),
      selectedAgents,
      status: "failed",
    });
  }
};
