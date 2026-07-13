const instructionFollowing = require('./tasks/instruction-following');
const toolUse = require('./tasks/tool-use');
const codeGeneration = require('./tasks/code-generation');
const summarization = require('./tasks/summarization');
const judgment = require('./tasks/judgment');
const multiTurn = require('./tasks/multi-turn');
const safetyTrust = require('./tasks/safety-trust');
const { sha256 } = require('./canonical');
const { getModel, callModelDetailed } = require('./models');
const { scoreResult } = require('./scorer');

const TASKS = {
  'instruction-following': instructionFollowing,
  'tool-use': toolUse,
  'code-generation': codeGeneration,
  summarization,
  judgment,
  'multi-turn': multiTurn,
  'safety-trust': safetyTrust,
};

function expandTaskAliases(taskArg) {
  if (taskArg === 'all') return Object.keys(TASKS);
  return taskArg.split(',').map((x) => x.trim()).filter(Boolean);
}

function pLimit(concurrency) {
  const queue = [];
  let activeCount = 0;

  const next = () => {
    if (activeCount >= concurrency || queue.length === 0) return;
    const { fn, resolve, reject } = queue.shift();
    activeCount += 1;

    Promise.resolve()
      .then(fn)
      .then(resolve)
      .catch(reject)
      .finally(() => {
        activeCount -= 1;
        next();
      });
  };

  return (fn) =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
}

function requestTrace(response, requestIndex) {
  return {
    requestIndex,
    provider: response.provider,
    requestedModelId: response.requestedModelId,
    reportedModelId: response.reportedModelId,
    modelIdentityStatus: response.modelIdentityStatus,
    providerRequestId: response.requestId,
    request: response.request,
    rawResponse: response.text,
    usage: response.usage,
    startedAt: response.startedAt,
    completedAt: response.completedAt,
    latencyMs: response.latencyMs,
    synthetic: response.synthetic,
    outcome: response.outcome || 'received',
    responseBytes: Number.isFinite(response.responseBytes)
      ? response.responseBytes
      : typeof response.text === 'string'
        ? Buffer.byteLength(response.text, 'utf8')
        : null,
    responseJsonBytes: Number.isFinite(response.responseJsonBytes)
      ? response.responseJsonBytes
      : typeof response.text === 'string'
        ? Buffer.byteLength(JSON.stringify(response.text), 'utf8')
        : null,
  };
}

function attachPartialExecution(error, execution) {
  if (error && typeof error === 'object') error.partialExecution = execution;
  return error;
}

function appendFailedAttempt(error, targetRequests) {
  if (error?.requestAttempt) {
    targetRequests.push(requestTrace(error.requestAttempt, targetRequests.length + 1));
  }
}

async function runSingleTurnCase({ model, task, testCase, dryRun, beforeRequest }) {
  const prompt = task.buildPrompt(testCase);
  const targetRequests = [];
  let response;
  try {
    response = await callModelDetailed({
      model,
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      messages: prompt.messages,
      dryRun,
      beforeRequest,
    });
    targetRequests.push(requestTrace(response, 1));
  } catch (error) {
    appendFailedAttempt(error, targetRequests);
    throw attachPartialExecution(error, {
      prompt: prompt.messages ? JSON.stringify(prompt.messages, null, 2) : prompt.userPrompt,
      system_prompt: prompt.systemPrompt || null,
      response: null,
      interaction: null,
      target_requests: targetRequests,
    });
  }

  return {
    prompt: prompt.messages ? JSON.stringify(prompt.messages, null, 2) : prompt.userPrompt,
    system_prompt: prompt.systemPrompt || null,
    response: response.text,
    interaction: null,
    target_requests: targetRequests,
  };
}

async function runMultiTurnCase({ model, task, testCase, dryRun, beforeRequest }) {
  const prompt = task.buildPrompt(testCase);
  const turns = Array.isArray(prompt.messages) ? prompt.messages : [];
  const convo = [];
  const targetRequests = [];

  for (const turn of turns) {
    convo.push({ role: turn.role, content: turn.content });
    if (turn.role === 'user') {
      let assistant;
      try {
        assistant = await callModelDetailed({
          model,
          systemPrompt: prompt.systemPrompt,
          messages: convo,
          dryRun,
          beforeRequest,
        });
      } catch (error) {
        appendFailedAttempt(error, targetRequests);
        throw attachPartialExecution(error, {
          prompt: JSON.stringify(turns, null, 2),
          system_prompt: prompt.systemPrompt || null,
          response: [...convo].reverse().find((message) => message.role === 'assistant')?.content || null,
          interaction: convo,
          target_requests: targetRequests,
        });
      }
      targetRequests.push(requestTrace(assistant, targetRequests.length + 1));
      convo.push({ role: 'assistant', content: assistant.text });
    }
  }

  const finalResponse = [...convo].reverse().find((m) => m.role === 'assistant')?.content || '';
  return {
    prompt: JSON.stringify(turns, null, 2),
    system_prompt: prompt.systemPrompt || null,
    response: finalResponse,
    interaction: convo,
    target_requests: targetRequests,
  };
}

async function runSafetyTrustCase({ model, task, testCase, dryRun, beforeRequest }) {
  const prompt = task.buildPrompt(testCase);
  const messages = [];
  const targetRequests = [];

  const baselineInput = prompt.baselinePrompt || 'Complete a neutral, factual baseline task in two concise sentences.';
  let baselineResponse;
  let provokeResponse;
  let escalationResponse;
  try {
    messages.push({ role: 'user', content: baselineInput });
    baselineResponse = await callModelDetailed({
      model, systemPrompt: prompt.systemPrompt, messages, dryRun, beforeRequest,
    });
    targetRequests.push(requestTrace(baselineResponse, 1));
    messages.push({ role: 'assistant', content: baselineResponse.text });

    messages.push({ role: 'user', content: prompt.provokePrompt });
    provokeResponse = await callModelDetailed({
      model, systemPrompt: prompt.systemPrompt, messages, dryRun, beforeRequest,
    });
    targetRequests.push(requestTrace(provokeResponse, 2));
    messages.push({ role: 'assistant', content: provokeResponse.text });

    messages.push({ role: 'user', content: prompt.escalationPrompt });
    escalationResponse = await callModelDetailed({
      model, systemPrompt: prompt.systemPrompt, messages, dryRun, beforeRequest,
    });
    targetRequests.push(requestTrace(escalationResponse, 3));
    messages.push({ role: 'assistant', content: escalationResponse.text });
  } catch (error) {
    appendFailedAttempt(error, targetRequests);
    throw attachPartialExecution(error, {
      prompt: `${baselineInput}\n\n${prompt.provokePrompt}\n\n${prompt.escalationPrompt}`,
      system_prompt: prompt.systemPrompt || null,
      response: [...messages].reverse().find((message) => message.role === 'assistant')?.content || null,
      interaction: {
        baseline_prompt: baselineInput,
        baseline_response: baselineResponse?.text || null,
        provoke_prompt: prompt.provokePrompt,
        provoke_response: provokeResponse?.text || null,
        escalation_prompt: prompt.escalationPrompt,
        escalation_response: escalationResponse?.text || null,
        transcript: messages,
      },
      target_requests: targetRequests,
    });
  }

  return {
    prompt: `${baselineInput}\n\n${prompt.provokePrompt}\n\n${prompt.escalationPrompt}`,
    system_prompt: prompt.systemPrompt || null,
    response: escalationResponse.text,
    interaction: {
      baseline_prompt: baselineInput,
      baseline_response: baselineResponse.text,
      provoke_prompt: prompt.provokePrompt,
      provoke_response: provokeResponse.text,
      escalation_prompt: prompt.escalationPrompt,
      escalation_response: escalationResponse.text,
      transcript: messages,
    },
    target_requests: targetRequests,
  };
}

async function executeCase({ model, task, testCase, dryRun, beforeRequest }) {
  if (task.category === 'multi-turn') {
    return runMultiTurnCase({ model, task, testCase, dryRun, beforeRequest });
  }
  if (task.category === 'safety-trust') {
    return runSafetyTrustCase({ model, task, testCase, dryRun, beforeRequest });
  }
  return runSingleTurnCase({ model, task, testCase, dryRun, beforeRequest });
}

function sanitizedError(error) {
  const message = String(error?.message || 'Unknown benchmark error')
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .slice(0, 500);
  return {
    name: typeof error?.name === 'string' ? error.name.slice(0, 80) : 'Error',
    message,
  };
}

async function runBenchmark({
  models,
  tasks,
  runs = 1,
  judge = 'sonnet',
  dryRun = false,
  localEndpoint,
  onResult,
  requestBudget,
}) {
  const selectedTasks = expandTaskAliases(tasks);
  const allResults = [];
  const limit = pLimit(3);
  let requestAttempts = 0;
  const beforeRequest = requestBudget === undefined || requestBudget === null
    ? null
    : () => {
      if (!Number.isInteger(requestBudget) || requestBudget < 0) {
        throw new Error('Runtime request budget must be a non-negative integer.');
      }
      if (requestAttempts >= requestBudget) {
        const error = new Error(`Runtime request budget exhausted at ${requestBudget} provider requests.`);
        error.requestOutcome = 'blocked_before_send';
        throw error;
      }
      requestAttempts += 1;
    };
  let ordinal = 0;

  for (const modelAlias of models) {
    const model = getModel(modelAlias, { localEndpoint });

    for (const taskName of selectedTasks) {
      const task = TASKS[taskName];
      if (!task) throw new Error(`Unknown task category: ${taskName}`);

      const cases = task.loadCases();
      for (let r = 0; r < runs; r += 1) {
        const caseResults = await Promise.all(
          cases.map((testCase) => {
            ordinal += 1;
            const planOrdinal = ordinal;
            return limit(async () => {
              const resultId = `record-${sha256({
                planOrdinal,
                model: modelAlias,
                category: taskName,
                caseId: testCase.id,
                runIndex: r + 1,
              }).slice(0, 24)}`;
              const startedAt = new Date().toISOString();

              const base = {
                schemaId: 'clawbotomy.case-record/v1',
                record_id: resultId,
                plan_ordinal: planOrdinal,
                status: 'complete',
                model: modelAlias,
                target_model: {
                  alias: modelAlias,
                  provider: model.provider,
                  requestedModelId: model.id,
                },
                category: taskName,
                case_id: testCase.id,
                case_sha256: sha256(testCase),
                prompt: null,
                system_prompt: null,
                response: null,
                interaction: null,
                target_requests: [],
                raw_score: null,
                justification: '',
                run_index: r + 1,
                started_at: startedAt,
                completed_at: null,
                error: null,
              };

              let result;
              let execution = null;
              try {
                execution = await executeCase({ model, task, testCase, dryRun, beforeRequest });
                result = await scoreResult({
                  result: {
                    ...base,
                    prompt: execution.prompt,
                    system_prompt: execution.system_prompt,
                    response: execution.response,
                    interaction: execution.interaction,
                    target_requests: execution.target_requests,
                  },
                  testCase,
                  defaultJudge: judge,
                  dryRun,
                  localEndpoint,
                  beforeRequest,
                });
              } catch (error) {
                const preserved = error?.partialExecution || execution;
                result = {
                  ...base,
                  ...(preserved ? {
                    prompt: preserved.prompt,
                    system_prompt: preserved.system_prompt,
                    response: preserved.response,
                    interaction: preserved.interaction,
                    target_requests: preserved.target_requests,
                  } : {}),
                  status: error?.requestOutcome === 'unknown_after_send' ? 'unknown_after_send' : 'failed',
                  evaluation_status: 'not-scored',
                  ...(error?.judgeModel ? {
                    judge_model: error.judgeModel,
                    judge_trace: error.judgeTrace || null,
                  } : {}),
                  error: sanitizedError(error),
                };
              }

              result.completed_at = new Date().toISOString();
              if (onResult) await onResult(result);
              return result;
            });
          })
        );

        allResults.push(...caseResults);
      }
    }
  }

  return allResults;
}

module.exports = {
  runBenchmark,
  TASKS,
  expandTaskAliases,
};
