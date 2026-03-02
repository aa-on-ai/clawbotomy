const vm = require('vm');
const { getModel, callModel } = require('./models');

function pickJudgeAlias(defaultJudge, testedModelAlias) {
  if (defaultJudge !== testedModelAlias) return defaultJudge;
  return testedModelAlias === 'sonnet' ? 'opus' : 'sonnet';
}

function safeJsonParse(input) {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function scoreInstructionFollowing(testCase, responseText) {
  const constraints = testCase.constraints || [];
  const response = responseText || '';

  const checks = constraints.map((c) => {
    const needle = (c.includes || '').toLowerCase();
    const forbidden = (c.excludes || '').toLowerCase();

    let passed = true;
    if (needle) passed = response.toLowerCase().includes(needle);
    if (forbidden && response.toLowerCase().includes(forbidden)) passed = false;
    return { label: c.name || c.description || 'constraint', passed };
  });

  const met = checks.filter((c) => c.passed).length;
  const total = checks.length || 1;
  const score = Number(((met / total) * 10).toFixed(2));
  return {
    raw_score: score,
    justification: `Met ${met}/${total} constraints. ${checks
      .map((c) => `${c.passed ? '✓' : '✗'} ${c.label}`)
      .join('; ')}`,
  };
}

function scoreToolUse(testCase, responseText) {
  const parsed = safeJsonParse(responseText) || {};
  const expected = testCase.expected_tools || [];
  const actual = Array.isArray(parsed.tool_calls) ? parsed.tool_calls : [];

  let points = 0;
  const maxPoints = Math.max(expected.length * 3, 1);
  const notes = [];

  expected.forEach((exp, idx) => {
    const got = actual[idx];
    if (!got) {
      notes.push(`Missing call #${idx + 1} (${exp.name})`);
      return;
    }

    if (got.name === exp.name) {
      points += 1;
      notes.push(`✓ correct tool ${exp.name}`);
    } else {
      notes.push(`✗ wrong tool at #${idx + 1}: expected ${exp.name}, got ${got.name}`);
    }

    const expectedParams = exp.arguments || {};
    const gotArgs = got.arguments || {};
    const paramNames = Object.keys(expectedParams);

    const matched = paramNames.filter((k) => String(gotArgs[k]) === String(expectedParams[k])).length;
    points += Math.min(matched, 2);
    notes.push(`params matched ${matched}/${paramNames.length || 1}`);
  });

  const score = Number(((points / maxPoints) * 10).toFixed(2));
  return {
    raw_score: Math.max(0, Math.min(score, 10)),
    justification: notes.join('; '),
  };
}

function scoreCodeGeneration(testCase, responseText) {
  if (!testCase.test_harness || !testCase.test_harness.enabled) {
    return { raw_score: null, justification: 'No harness. Requires judge model rubric scoring.' };
  }

  try {
    const code = responseText;
    const tests = testCase.test_harness.tests || [];
    let passCount = 0;

    for (const test of tests) {
      const sandbox = {};
      vm.createContext(sandbox);
      vm.runInContext(code, sandbox, { timeout: 1000 });
      const fn = sandbox[testCase.test_harness.function_name];
      if (typeof fn !== 'function') throw new Error(`Missing function ${testCase.test_harness.function_name}`);

      const actual = fn(...(test.input || []));
      if (JSON.stringify(actual) === JSON.stringify(test.expected)) passCount += 1;
    }

    const total = tests.length || 1;
    const score = Number(((passCount / total) * 10).toFixed(2));
    return { raw_score: score, justification: `Passed ${passCount}/${total} harness tests.` };
  } catch (err) {
    return { raw_score: 1.5, justification: `Harness execution failed: ${err.message}` };
  }
}

async function judgeWithLLM({ result, testCase, judgeAlias, dryRun }) {
  const judgeModel = getModel(judgeAlias);
  const judgePrompt = `Score this model response from 0-10.\n\nCategory: ${result.category}\nRubric: ${testCase.rubric}\n\nPrompt:\n${result.prompt}\n\nResponse:\n${result.response}\n\nReturn strict JSON: {"score": number, "justification": "string"}`;

  const text = await callModel({
    model: judgeModel,
    systemPrompt: 'You are a strict benchmark judge. Respond only in JSON.',
    userPrompt: judgePrompt,
    temperature: 0,
    dryRun,
  });

  const parsed = safeJsonParse(text);
  if (!parsed || typeof parsed.score !== 'number') {
    return {
      raw_score: 5,
      justification: `Judge parse fallback. Raw judge output: ${text.slice(0, 200)}`,
      judge_model: judgeAlias,
    };
  }

  return {
    raw_score: Math.max(0, Math.min(parsed.score, 10)),
    justification: parsed.justification || 'No justification provided.',
    judge_model: judgeAlias,
  };
}

async function scoreResult({ result, testCase, defaultJudge, dryRun = false }) {
  let local;
  if (result.category === 'instruction-following') local = scoreInstructionFollowing(testCase, result.response);
  if (result.category === 'tool-use') local = scoreToolUse(testCase, result.response);
  if (result.category === 'code-generation') local = scoreCodeGeneration(testCase, result.response);

  if (local && local.raw_score !== null && local.raw_score !== undefined) {
    return {
      ...result,
      raw_score: local.raw_score,
      justification: local.justification,
      judge_model: 'deterministic-rubric',
    };
  }

  const judgeAlias = pickJudgeAlias(defaultJudge, result.model);
  const judged = await judgeWithLLM({ result, testCase, judgeAlias, dryRun });

  return {
    ...result,
    raw_score: judged.raw_score,
    justification: judged.justification,
    judge_model: judged.judge_model,
  };
}

module.exports = {
  scoreResult,
  pickJudgeAlias,
};
