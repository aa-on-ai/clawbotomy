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

function countWords(text) {
  const matches = String(text).match(/\b[\w'-]+\b/g);
  return matches ? matches.length : 0;
}

function countSentences(text) {
  const trimmed = String(text).trim();
  if (!trimmed) return 0;
  const matches = trimmed.match(/[.!?](?:\s+|$)/g);
  return matches ? matches.length : 1;
}

function evaluateConstraint(constraint, response) {
  const label = constraint.name || constraint.description || 'constraint';
  const type = constraint.type || (constraint.includes ? 'includes' : constraint.excludes ? 'excludes' : null);

  if (!type) return { label, passed: false, detail: 'Missing constraint type' };

  const lower = response.toLowerCase();

  switch (type) {
    case 'includes': {
      const value = String(constraint.value ?? constraint.includes ?? '');
      return { label, passed: lower.includes(value.toLowerCase()) };
    }

    case 'excludes': {
      const value = String(constraint.value ?? constraint.excludes ?? '');
      return { label, passed: !lower.includes(value.toLowerCase()) };
    }

    case 'bullet_count': {
      const expected = Number(constraint.expected ?? 0);
      const count = (response.match(/^\s*-\s+/gm) || []).length;
      return { label, passed: count === expected, detail: `${count}/${expected}` };
    }

    case 'word_count': {
      const expected = Number(constraint.expected ?? 0);
      const actual = countWords(response);
      const tolerance = expected * 0.05;
      return { label, passed: Math.abs(actual - expected) <= tolerance, detail: `${actual}/${expected}` };
    }

    case 'sentence_count': {
      const expected = Number(constraint.expected ?? 0);
      const actual = countSentences(response);
      return { label, passed: actual === expected, detail: `${actual}/${expected}` };
    }

    case 'starts_with_pattern': {
      const pattern = constraint.pattern || '^';
      const regex = new RegExp(pattern);
      const nonEmptyLines = response.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const bulletLines = nonEmptyLines.filter((line) => /^-\s+/.test(line));
      const targetLines = bulletLines.length > 0 ? bulletLines : nonEmptyLines;
      const passed = targetLines.length > 0 && targetLines.every((line) => {
        regex.lastIndex = 0;
        return regex.test(line);
      });
      return { label, passed };
    }

    case 'no_markdown': {
      const hasMarkdown = /(^\s*#{1,6}\s)|\*\*|```|`[^`]+`|__|~~|\[[^\]]+\]\([^\)]+\)/m.test(response);
      return { label, passed: !hasMarkdown };
    }

    case 'json_schema': {
      const parsed = safeJsonParse(response);
      return { label, passed: parsed !== null };
    }

    default:
      return { label, passed: false, detail: `Unknown constraint type: ${type}` };
  }
}

function scoreInstructionFollowing(testCase, responseText) {
  const constraints = testCase.constraints || [];
  const response = responseText || '';

  const checks = constraints.map((c) => evaluateConstraint(c, response));

  const met = checks.filter((c) => c.passed).length;
  const total = checks.length || 1;
  const score = Number(((met / total) * 10).toFixed(2));
  return {
    raw_score: score,
    justification: `Met ${met}/${total} constraints. ${checks
      .map((c) => `${c.passed ? '✓' : '✗'} ${c.label}${c.detail ? ` (${c.detail})` : ''}`)
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
    const code = String(responseText || '')
      .replace(/^\s*```(?:js|javascript)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();
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
