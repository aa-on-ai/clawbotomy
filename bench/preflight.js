const fs = require('node:fs');
const path = require('node:path');

const pricing = require('./evidence/pricing.json');
const { canonicalStringify, sha256 } = require('./canonical');
const { buildJudgeMessages } = require('./judge-envelope');
const { getModel, MAX_OUTPUT_TOKENS, MAX_RESPONSE_JSON_BYTES } = require('./models');
const { assertPrivateArtifactPath } = require('./private-path');
const { TASKS } = require('./runner');
const { pickJudgeAlias } = require('./scorer');

const MODEL_JUDGED_TASKS = new Set(['code-generation', 'judgment', 'multi-turn', 'safety-trust']);

function conservativeTokenUpperBound(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  // Provider tokenizers cannot emit more tokens than the UTF-8 byte sequence
  // they consume. The fixed allowance covers role/message framing not present
  // in the visible prompt value. This intentionally overestimates normal text.
  return Math.max(1, Buffer.byteLength(text || '', 'utf8')) + 64;
}

function assertUnique(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`Duplicate ${label} selection: ${value}`);
    seen.add(value);
  }
}

function implementationHashes(tasks) {
  const root = path.resolve(__dirname, '..');
  const files = [
    'bench/bundle.js',
    'bench/canonical.js',
    'bench/index.js',
    'bench/judge-envelope.js',
    'bench/models.js',
    'bench/preflight.js',
    'bench/private-path.js',
    'bench/reporter.js',
    'bench/runner.js',
    'bench/scorer.js',
    'bench/source.js',
    'bench/evidence/pricing.json',
    ...tasks.map((task) => `bench/tasks/${task}.js`),
  ];
  return Object.fromEntries(
    [...new Set(files)].sort().map((file) => [file, sha256(fs.readFileSync(path.join(root, file)))]),
  );
}

function assertUniqueResolvedModels(models, localEndpoint) {
  const seen = new Map();
  for (const alias of models) {
    const model = getModel(alias, { localEndpoint });
    const identity = `${model.provider}:${model.id}`;
    if (seen.has(identity)) {
      throw new Error(`Model aliases ${seen.get(identity)} and ${alias} resolve to the same provider identity ${identity}.`);
    }
    seen.set(identity, alias);
  }
}

function resolvedMessages(prompt) {
  const messages = [];
  if (prompt.systemPrompt) messages.push({ role: 'system', content: prompt.systemPrompt });
  if (Array.isArray(prompt.messages) && prompt.messages.length > 0) messages.push(...prompt.messages);
  else messages.push({ role: 'user', content: prompt.userPrompt || '' });
  return messages;
}

function targetRequestInputs(task, testCase) {
  const prompt = task.buildPrompt(testCase);

  if (task.category === 'multi-turn') {
    const conversation = [];
    const inputs = [];
    let priorAssistantTokens = 0;
    for (const turn of Array.isArray(prompt.messages) ? prompt.messages : []) {
      conversation.push(turn);
      if (turn.role === 'user') {
        inputs.push(conservativeTokenUpperBound({ systemPrompt: prompt.systemPrompt || '', messages: conversation }) + priorAssistantTokens);
        priorAssistantTokens += MAX_OUTPUT_TOKENS;
        conversation.push({ role: 'assistant', content: '[planned model output]' });
      }
    }
    return inputs;
  }

  if (task.category === 'safety-trust') {
    const baseline = prompt.baselinePrompt || 'Complete a neutral, factual baseline task in two concise sentences.';
    const knownTurns = [baseline, prompt.provokePrompt, prompt.escalationPrompt];
    return knownTurns.map((turn, index) => (
      conservativeTokenUpperBound({ systemPrompt: prompt.systemPrompt || '', priorKnownTurns: knownTurns.slice(0, index + 1) })
      + (index * MAX_OUTPUT_TOKENS)
    ));
  }

  return [conservativeTokenUpperBound(resolvedMessages(prompt))];
}

function maximumResponsePlaceholder() {
  // Runtime caps JSON.stringify(response), including its two quote bytes.
  // An unescaped placeholder therefore consumes the full permitted field.
  return 'x'.repeat(MAX_RESPONSE_JSON_BYTES - 2);
}

function buildWorstCaseJudgeResult(task, testCase) {
  const prompt = task.buildPrompt(testCase);
  const nextOutput = () => maximumResponsePlaceholder();

  if (task.category === 'multi-turn') {
    const turns = Array.isArray(prompt.messages) ? prompt.messages : [];
    const interaction = [];
    for (const turn of turns) {
      interaction.push({ role: turn.role, content: turn.content });
      if (turn.role === 'user') interaction.push({ role: 'assistant', content: nextOutput() });
    }
    return {
      category: task.category,
      prompt: JSON.stringify(turns, null, 2),
      response: [...interaction].reverse().find((message) => message.role === 'assistant')?.content || '',
      interaction,
    };
  }

  if (task.category === 'safety-trust') {
    const baseline = prompt.baselinePrompt || 'Complete a neutral, factual baseline task in two concise sentences.';
    const baselineResponse = nextOutput();
    const provokeResponse = nextOutput();
    const escalationResponse = nextOutput();
    const transcript = [
      { role: 'user', content: baseline },
      { role: 'assistant', content: baselineResponse },
      { role: 'user', content: prompt.provokePrompt },
      { role: 'assistant', content: provokeResponse },
      { role: 'user', content: prompt.escalationPrompt },
      { role: 'assistant', content: escalationResponse },
    ];
    return {
      category: task.category,
      prompt: `${baseline}\n\n${prompt.provokePrompt}\n\n${prompt.escalationPrompt}`,
      response: escalationResponse,
      interaction: {
        baseline_prompt: baseline,
        baseline_response: baselineResponse,
        provoke_prompt: prompt.provokePrompt,
        provoke_response: provokeResponse,
        escalation_prompt: prompt.escalationPrompt,
        escalation_response: escalationResponse,
        transcript,
      },
    };
  }

  return {
    category: task.category,
    prompt: prompt.messages ? JSON.stringify(prompt.messages, null, 2) : prompt.userPrompt,
    response: nextOutput(),
    interaction: null,
  };
}

function worstCaseJudgeMessages(task, testCase) {
  return buildJudgeMessages(buildWorstCaseJudgeResult(task, testCase), testCase).messages;
}

function judgeInputTokensUpper(task, testCase) {
  return worstCaseJudgeMessages(task, testCase).reduce(
    (sum, message) => (
      sum
      + conservativeTokenUpperBound(message.role)
      + conservativeTokenUpperBound(message.content)
      + 256
    ),
    0,
  );
}

function priceForModel(model) {
  if (model.provider === 'local-openai') {
    return { input: 0, output: 0, source: 'local endpoint; provider billing not estimated' };
  }
  return pricing.models[model.id] || null;
}

function roundUsd(value) {
  return Number(value.toFixed(6));
}

function addRequest(groupMap, { role, model, inputTokensUpper }) {
  const key = `${role}:${model.provider}:${model.id}`;
  const existing = groupMap.get(key) || {
    role,
    alias: model.alias,
    provider: model.provider,
    modelId: model.id,
    requests: 0,
    inputTokensUpper: 0,
    outputTokensUpper: 0,
    pricing: priceForModel(model),
  };
  existing.requests += 1;
  existing.inputTokensUpper += inputTokensUpper;
  existing.outputTokensUpper += MAX_OUTPUT_TOKENS;
  groupMap.set(key, existing);
}

function finalizeGroup(group) {
  if (!group.pricing) {
    return {
      ...group,
      costLowerUsd: null,
      costUpperUsd: null,
    };
  }
  const inputCost = (group.inputTokensUpper / 1_000_000) * group.pricing.input;
  const outputCost = (group.outputTokensUpper / 1_000_000) * group.pricing.output;
  return {
    ...group,
    costLowerUsd: roundUsd(inputCost),
    costUpperUsd: roundUsd(inputCost + outputCost),
  };
}

function buildRunPlan({ models, tasks, runs, judge, localEndpoint, bundlePath, source }) {
  assertUnique(models, 'model');
  assertUnique(tasks, 'task');
  assertUniqueResolvedModels(models, localEndpoint);

  const groupMap = new Map();
  const caseExecutions = [];

  for (const modelAlias of models) {
    const targetModel = getModel(modelAlias, { localEndpoint });
    for (const taskName of tasks) {
      const task = TASKS[taskName];
      if (!task) throw new Error(`Unknown task category: ${taskName}`);
      const cases = task.loadCases();

      for (let runIndex = 1; runIndex <= runs; runIndex += 1) {
        for (const testCase of cases) {
          const targetInputs = targetRequestInputs(task, testCase);
          for (const inputTokensUpper of targetInputs) {
            addRequest(groupMap, { role: 'target', model: targetModel, inputTokensUpper });
          }

          let judgeModel = null;
          if (MODEL_JUDGED_TASKS.has(taskName)) {
            const judgeAlias = pickJudgeAlias(judge, modelAlias);
            judgeModel = getModel(judgeAlias, { localEndpoint });
            addRequest(groupMap, {
              role: 'judge',
              model: judgeModel,
              inputTokensUpper: judgeInputTokensUpper(task, testCase),
            });
          }

          caseExecutions.push({
            category: taskName,
            caseId: testCase.id,
            caseSha256: sha256(testCase),
            runIndex,
            target: {
              alias: targetModel.alias,
              modelId: targetModel.id,
              provider: targetModel.provider,
              requestCount: targetInputs.length,
            },
            scoring: judgeModel
              ? {
                mode: 'model-judge',
                judgeAlias: judgeModel.alias,
                judgeModelId: judgeModel.id,
                judgeProvider: judgeModel.provider,
              }
              : { mode: 'deterministic-rubric' },
          });
        }
      }
    }
  }

  const requestGroups = [...groupMap.values()]
    .map(finalizeGroup)
    .sort((a, b) => `${a.role}:${a.provider}:${a.modelId}`.localeCompare(`${b.role}:${b.provider}:${b.modelId}`));
  const unpricedModels = [...new Set(requestGroups.filter((group) => !group.pricing).map((group) => group.modelId))];
  const targetRequests = requestGroups.filter((group) => group.role === 'target').reduce((sum, group) => sum + group.requests, 0);
  const judgeRequests = requestGroups.filter((group) => group.role === 'judge').reduce((sum, group) => sum + group.requests, 0);
  const costLowerUsd = unpricedModels.length
    ? null
    : roundUsd(requestGroups.reduce((sum, group) => sum + group.costLowerUsd, 0));
  const costUpperUsd = unpricedModels.length
    ? null
    : roundUsd(requestGroups.reduce((sum, group) => sum + group.costUpperUsd, 0));

  const plan = {
    schemaVersion: '1.0.0',
    source,
    configuration: {
      models,
      tasks,
      runs,
      judge,
      localEndpoint: localEndpoint || null,
      bundlePath: assertPrivateArtifactPath(bundlePath, { label: 'Private bundle' }),
      maxOutputTokensPerRequest: MAX_OUTPUT_TOKENS,
      maxResponseJsonBytesPerRequest: MAX_RESPONSE_JSON_BYTES,
    },
    pricingSnapshot: {
      asOf: pricing.asOf,
      currency: pricing.currency,
      unit: pricing.unit,
      sha256: sha256(pricing),
    },
    implementationSha256: implementationHashes(tasks),
    credentialRequirements: [...new Map(requestGroups.map((group) => {
      const model = getModel(group.alias, { localEndpoint });
      return [model.env || `local:${model.id}`, {
        provider: model.provider,
        environmentVariable: model.env || null,
        present: model.env ? Boolean(process.env[model.env]) : true,
      }];
    })).values()].sort((a, b) => `${a.provider}:${a.environmentVariable}`.localeCompare(`${b.provider}:${b.environmentVariable}`)),
    caseExecutions,
    requestGroups,
    totals: {
      cases: caseExecutions.length,
      targetRequests,
      judgeRequests,
      providerRequests: targetRequests + judgeRequests,
      inputTokensUpper: requestGroups.reduce((sum, group) => sum + group.inputTokensUpper, 0),
      outputTokensUpper: requestGroups.reduce((sum, group) => sum + group.outputTokensUpper, 0),
      costLowerUsd,
      costUpperUsd,
      unpricedModels,
    },
  };

  return {
    ...plan,
    planDigest: sha256(plan).slice(0, 20),
  };
}

function authorizeLivePlan(plan, { confirmPlan, maxCostUsd, maxRequests }) {
  if (!confirmPlan) {
    throw new Error('Live runs require --confirm-plan from a separate --preflight of the exact configuration.');
  }
  if (confirmPlan !== plan.planDigest) {
    throw new Error(`Plan confirmation mismatch. Expected ${plan.planDigest}; run --preflight again.`);
  }
  if (plan.totals.unpricedModels.length > 0 || plan.totals.costUpperUsd === null) {
    throw new Error(`Live plan has unknown pricing for: ${plan.totals.unpricedModels.join(', ')}.`);
  }
  if (!Number.isFinite(maxCostUsd) || maxCostUsd < 0) {
    throw new Error('Live runs require a non-negative --max-cost-usd value.');
  }
  if (maxCostUsd < plan.totals.costUpperUsd) {
    throw new Error(
      `--max-cost-usd ${maxCostUsd} is below the conservative plan bound ${plan.totals.costUpperUsd}.`,
    );
  }
  if (!Number.isInteger(maxRequests) || maxRequests < 1) {
    throw new Error('Live runs require a positive integer --max-requests value.');
  }
  if (maxRequests < plan.totals.providerRequests) {
    throw new Error(
      `--max-requests ${maxRequests} is below the planned ${plan.totals.providerRequests} provider requests.`,
    );
  }
}

function formatPreflight(plan, format = 'table') {
  if (format === 'json') return JSON.stringify(plan, null, 2);

  const lines = [
    'CLAWBOTOMY LIVE PREFLIGHT — NO PROVIDER REQUESTS MADE',
    `Plan digest: ${plan.planDigest}`,
    `Cases: ${plan.totals.cases}`,
    `Requests: ${plan.totals.providerRequests} (${plan.totals.targetRequests} target + ${plan.totals.judgeRequests} judge)`,
    `Conservative token bound: ${plan.totals.inputTokensUpper} input + ${plan.totals.outputTokensUpper} output`,
    plan.totals.costUpperUsd === null
      ? `Estimated provider cost: unavailable (${plan.totals.unpricedModels.join(', ')})`
      : `Estimated provider cost: $${plan.totals.costLowerUsd.toFixed(4)}–$${plan.totals.costUpperUsd.toFixed(4)} USD`,
    `Private bundle: ${plan.configuration.bundlePath}`,
    `Pricing snapshot: ${plan.pricingSnapshot.asOf} (${plan.pricingSnapshot.sha256.slice(0, 12)})`,
    '',
    'To authorize this exact plan, repeat the command with:',
    `  --live --confirm-plan ${plan.planDigest} --max-requests ${plan.totals.providerRequests} --max-cost-usd ${plan.totals.costUpperUsd ?? '<required>'}`,
  ];

  for (const group of plan.requestGroups) {
    lines.push(
      `${group.role.padEnd(6)} ${group.alias.padEnd(16)} ${String(group.requests).padStart(3)} requests  ${group.provider}/${group.modelId}`,
    );
  }

  return lines.join('\n');
}

module.exports = {
  MAX_OUTPUT_TOKENS,
  MODEL_JUDGED_TASKS,
  conservativeTokenUpperBound,
  judgeInputTokensUpper,
  worstCaseJudgeMessages,
  authorizeLivePlan,
  buildRunPlan,
  formatPreflight,
};
