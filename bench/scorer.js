const vm = require('vm');
const { getModel, callModel } = require('./models');

function pickJudgeAlias(defaultJudge, testedModelAlias) {
  if (defaultJudge !== testedModelAlias) return defaultJudge;
  // Swap within same provider family to avoid needing a different provider's auth
  const openaiModels = ['codex', 'spark', 'gpt4o'];
  const anthropicModels = ['opus', 'sonnet'];
  if (openaiModels.includes(testedModelAlias)) {
    // Prefer gpt4o for judging (chat-compatible), avoid codex/spark (completions-only)
    if (testedModelAlias !== 'gpt4o') return 'gpt4o';
    return 'gpt4o'; // self-judge is acceptable when no other chat model available
  }
  if (anthropicModels.includes(testedModelAlias)) {
    return testedModelAlias === 'sonnet' ? 'opus' : 'sonnet';
  }
  return testedModelAlias === 'sonnet' ? 'opus' : 'sonnet';
}

function safeJsonParse(input) {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function stripMarkdownFences(text) {
  const value = String(text || '').trim();
  if (!value.startsWith('```')) return value;
  return value
    .replace(/^```(?:json|javascript|js)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

function extractJsonObject(text) {
  const value = String(text || '').trim();
  const start = value.search(/[\[{]/);
  if (start === -1) return null;

  const stack = [];
  let inString = false;
  let escaped = false;

  for (let i = start; i < value.length; i += 1) {
    const ch = value[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{' || ch === '[') {
      stack.push(ch);
      continue;
    }

    if (ch === '}' || ch === ']') {
      const expected = ch === '}' ? '{' : '[';
      if (stack.pop() !== expected) return null;
      if (stack.length === 0) {
        return value.slice(start, i + 1);
      }
    }
  }

  return null;
}

function parseLooseJson(input) {
  if (input === null || input === undefined) return null;
  if (typeof input === 'object') return input;

  const stripped = stripMarkdownFences(String(input));
  const direct = safeJsonParse(stripped);
  if (direct !== null) return direct;

  const extracted = extractJsonObject(stripped);
  if (!extracted) return null;
  return safeJsonParse(extracted);
}

function normalizeToolCall(call) {
  if (!call || typeof call !== 'object') return null;

  const fn = call.function && typeof call.function === 'object' ? call.function : null;
  const rawName = call.name || call.tool_name || (fn ? fn.name : null);
  const rawArgs = call.arguments ?? call.args ?? call.parameters ?? (fn ? fn.arguments : undefined);

  const name = typeof rawName === 'string' ? rawName.trim() : null;
  const parsedArgs = typeof rawArgs === 'string' ? (parseLooseJson(rawArgs) || {}) : rawArgs;
  const argumentsObject = parsedArgs && typeof parsedArgs === 'object' && !Array.isArray(parsedArgs) ? parsedArgs : {};

  if (!name) return null;
  return { name, arguments: argumentsObject };
}

function extractToolCalls(parsed) {
  if (!parsed) return [];

  let rawCalls = [];
  if (Array.isArray(parsed)) {
    rawCalls = parsed;
  } else if (Array.isArray(parsed.tool_calls)) {
    rawCalls = parsed.tool_calls;
  } else if (Array.isArray(parsed.toolCalls)) {
    rawCalls = parsed.toolCalls;
  } else if (Array.isArray(parsed.calls)) {
    rawCalls = parsed.calls;
  } else if (parsed.function_call || parsed.functionCall) {
    rawCalls = [parsed.function_call || parsed.functionCall];
  }

  return rawCalls.map((call) => normalizeToolCall(call)).filter(Boolean);
}

function valuesLooselyMatch(expected, actual, keyName = '') {
  const expectedStr = String(expected ?? '').trim();
  const actualStr = String(actual ?? '').trim();
  if (!expectedStr || !actualStr) return false;

  if (expectedStr === actualStr) return true;
  if (expectedStr.toLowerCase() === actualStr.toLowerCase()) return true;

  if (keyName.toLowerCase().includes('date') && expectedStr.toLowerCase() === 'tomorrow') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(actualStr)) return true;
    if (/tomorrow/i.test(actualStr)) return true;
  }

  return false;
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
  const parsed = parseLooseJson(responseText) || {};
  const expected = testCase.expected_tools || [];
  const actual = extractToolCalls(parsed);

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

    const matched = paramNames.filter((k) => valuesLooselyMatch(expectedParams[k], gotArgs[k], k)).length;
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
