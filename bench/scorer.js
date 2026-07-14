const { getModel, callModelDetailed } = require('./models');
const { buildJudgeMessages } = require('./judge-envelope');

function pickJudgeAlias(defaultJudge, testedModelAlias) {
  if (defaultJudge !== testedModelAlias) return defaultJudge;
  if (testedModelAlias === 'opus') return 'sonnet';
  if (testedModelAlias === 'sonnet') return 'opus';
  if (testedModelAlias.startsWith('gpt-5.3')) return 'gpt-5.4';
  if (testedModelAlias.startsWith('gpt-5.4')) return 'gpt-5.3-codex';
  if (testedModelAlias === 'gemini-pro') return 'gemini-flash';
  if (testedModelAlias === 'gemini-flash') return 'gemini-pro';
  if (testedModelAlias.startsWith('local:')) {
    throw new Error('A local model cannot judge itself. Pass a distinct --judge local:<model-id>.');
  }
  throw new Error(`No independent judge fallback is configured for ${testedModelAlias}. Pass --judge explicitly.`);
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
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
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
      if (stack.length === 0) return value.slice(start, i + 1);
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

function parseStrictJudgeJson(input) {
  const text = String(input || '').trim();
  if (!text || text.length > 4_000) return null;

  const parsed = safeJsonParse(text);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') return null;
  const keys = Object.keys(parsed).sort();
  if (keys.length !== 2 || keys[0] !== 'justification' || keys[1] !== 'score') return null;
  if (!Number.isFinite(parsed.score) || parsed.score < 0 || parsed.score > 10) return null;
  if (typeof parsed.justification !== 'string') return null;

  const justification = parsed.justification
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
  if (!justification || justification.length > 2_000) return null;
  return { score: parsed.score, justification };
}

function normalizeToolCall(call) {
  if (!call || typeof call !== 'object') return null;

  const fn = call.function && typeof call.function === 'object' ? call.function : null;
  const rawName = call.name || call.tool_name || (fn ? fn.name : null);
  const rawArgs = call.arguments ?? call.args ?? call.parameters ?? (fn ? fn.arguments : undefined);

  const name = typeof rawName === 'string' ? rawName.trim() : null;
  const parsedArgs = typeof rawArgs === 'string' ? parseLooseJson(rawArgs) : rawArgs;

  if (!name || !parsedArgs || typeof parsedArgs !== 'object' || Array.isArray(parsedArgs)) return null;
  return { name, arguments: parsedArgs };
}

function extractToolCalls(parsed) {
  if (!parsed) return [];

  let rawCalls = [];
  if (Array.isArray(parsed)) rawCalls = parsed;
  else if (Array.isArray(parsed.tool_calls)) rawCalls = parsed.tool_calls;
  else if (Array.isArray(parsed.toolCalls)) rawCalls = parsed.toolCalls;
  else if (Array.isArray(parsed.calls)) rawCalls = parsed.calls;
  else if (parsed.function_call || parsed.functionCall) rawCalls = [parsed.function_call || parsed.functionCall];

  return rawCalls.map((call) => normalizeToolCall(call)).filter(Boolean);
}

function valuesLooselyMatch(expected, actual, keyName = '', referenceTime = Date.now()) {
  const expectedStr = String(expected ?? '').trim();
  const actualStr = String(actual ?? '').trim();
  if (!expectedStr || !actualStr) return false;

  if (expectedStr === actualStr) return true;
  if (expectedStr.toLowerCase() === actualStr.toLowerCase()) return true;

  if (keyName.toLowerCase().includes('date') && expectedStr.toLowerCase() === 'tomorrow') {
    const anchor = new Date(referenceTime);
    if (Number.isNaN(anchor.getTime())) return false;
    const tomorrow = new Date(anchor);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const localTomorrow = [
      tomorrow.getFullYear(),
      String(tomorrow.getMonth() + 1).padStart(2, '0'),
      String(tomorrow.getDate()).padStart(2, '0'),
    ].join('-');
    const utcTomorrow = new Date(anchor.getTime() + 86_400_000).toISOString().slice(0, 10);
    return actualStr === localTomorrow || actualStr === utcTomorrow;
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
      const regex = new RegExp(constraint.pattern || '^');
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

function scoreToolUse(testCase, responseText, referenceTime) {
  const parsed = parseLooseJson(responseText);
  const expected = testCase.expected_tools || [];

  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object' || !Array.isArray(parsed.tool_calls)) {
    return {
      raw_score: 0,
      justification: 'Invalid tool-use response; expected a JSON object with an explicit tool_calls array.',
    };
  }

  const actual = extractToolCalls(parsed);
  if (actual.length !== parsed.tool_calls.length) {
    return {
      raw_score: 0,
      justification: 'Invalid tool-use response; every tool_calls entry must include a non-empty name and object-valued arguments.',
    };
  }

  if (expected.length === 0) {
    if (actual.length === 0) {
      return {
        raw_score: 10,
        justification: 'No tool call expected; none made.',
      };
    }

    return {
      raw_score: 0,
      justification: `Expected no tool calls, but made ${actual.length}: ${actual.map((call) => call.name).join(', ')}.`,
    };
  }

  if (actual.length > expected.length) {
    return {
      raw_score: 0,
      justification: `Made ${actual.length - expected.length} unexpected extra tool call(s): ${actual
        .slice(expected.length)
        .map((call) => call.name)
        .join(', ')}.`,
    };
  }

  for (let index = 0; index < expected.length; index += 1) {
    const expectedCall = expected[index];
    const actualCall = actual[index];
    if (!actualCall) continue;
    if (actualCall.name !== expectedCall.name) {
      return {
        raw_score: 0,
        justification: `Wrong tool at call #${index + 1}: expected ${expectedCall.name}, got ${actualCall.name}.`,
      };
    }

    const schema = (testCase.tools_schema || []).find((tool) => tool.name === expectedCall.name);
    const allowedArguments = new Set(
      Object.keys(schema?.parameters?.properties || expectedCall.arguments || {}),
    );
    const unexpectedArguments = Object.keys(actualCall.arguments || {})
      .filter((argument) => !allowedArguments.has(argument));

    if (unexpectedArguments.length > 0) {
      return {
        raw_score: 0,
        justification: `Unexpected argument(s) for ${expectedCall.name}: ${unexpectedArguments.join(', ')}.`,
      };
    }
  }

  let points = 0;
  const maxPoints = expected.reduce(
    (total, call) => total + 1 + Object.keys(call.arguments || {}).length,
    0,
  );
  const notes = [];

  expected.forEach((exp, idx) => {
    const got = actual[idx];
    if (!got) {
      notes.push(`Missing call #${idx + 1} (${exp.name})`);
      return;
    }

    const expectedParams = exp.arguments || {};
    const paramNames = Object.keys(expectedParams);

    if (got.name !== exp.name) {
      notes.push(`✗ wrong tool at #${idx + 1}: expected ${exp.name}, got ${got.name}`);
      return;
    }

    points += 1;
    notes.push(`✓ correct tool ${exp.name}`);
    const gotArgs = got.arguments || {};
    const matched = paramNames.filter((k) => (
      valuesLooselyMatch(expectedParams[k], gotArgs[k], k, referenceTime)
    )).length;
    points += matched;
    notes.push(`params matched ${matched}/${paramNames.length || 1}`);
  });

  const score = Number(((points / maxPoints) * 10).toFixed(2));
  return {
    raw_score: Math.max(0, Math.min(score, 10)),
    justification: notes.join('; '),
  };
}

function scoreCodeGeneration(testCase, responseText) {
  void testCase;
  void responseText;
  return {
    raw_score: null,
    justification: 'Generated code is not executed in-process. Requires judge model rubric scoring.',
  };
}

function sentenceList(text) {
  return String(text || '')
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4);
}

function overlapRatio(aText, bText) {
  const a = new Set(tokenize(aText));
  const b = new Set(tokenize(bText));
  if (!a.size || !b.size) return 0;
  let hit = 0;
  for (const token of a) {
    if (b.has(token)) hit += 1;
  }
  return hit / a.size;
}

function scoreSummarization(testCase, responseText) {
  const response = String(responseText || '').trim();
  const source = String(testCase.source_text || '');

  const keyPoints = testCase.key_points || [];
  const keyHits = keyPoints.filter((kp) => response.toLowerCase().includes(String(kp).toLowerCase())).length;
  const retention = keyPoints.length ? keyHits / keyPoints.length : 0.5;

  const claims = sentenceList(response);
  const unsupported = claims.filter((claim) => overlapRatio(claim, source) < 0.34);
  const fabrication = claims.length ? 1 - unsupported.length / claims.length : 0;

  const words = countWords(response);
  const compressionCfg = testCase.compression || {};
  const minWords = Number(compressionCfg.min_words ?? 0);
  const maxWords = Number(compressionCfg.max_words ?? Number.MAX_SAFE_INTEGER);
  const compression = words >= minWords && words <= maxWords ? 1 : 0.4;

  let format = 1;
  if (testCase.format?.type === 'sentences' && testCase.format?.count) {
    format = countSentences(response) === Number(testCase.format.count) ? 1 : 0;
  } else if (testCase.format?.type === 'bullets' && testCase.format?.count) {
    const bullets = (response.match(/^\s*-\s+/gm) || []).length;
    format = bullets === Number(testCase.format.count) ? 1 : 0;
  } else if (testCase.format?.type === 'json') {
    format = safeJsonParse(response) ? 1 : 0;
  }

  const weighted = retention * 0.4 + fabrication * 0.3 + compression * 0.15 + format * 0.15;
  return {
    raw_score: Number((weighted * 10).toFixed(2)),
    justification: `retention ${keyHits}/${keyPoints.length || 0}; unsupported claims ${unsupported.length}/${claims.length}; words ${words} (target ${minWords}-${maxWords}); format ${format ? 'pass' : 'fail'}`,
  };
}

async function judgeWithLLM({ result, testCase, judgeAlias, dryRun, localEndpoint, beforeRequest }) {
  const judgeModel = getModel(judgeAlias, { localEndpoint });
  const targetModel = getModel(result.model, { localEndpoint });
  if (judgeModel.id === targetModel.id && judgeModel.provider === targetModel.provider) {
    throw new Error(`Resolved target and judge are the same model (${targetModel.provider}/${targetModel.id}).`);
  }

  const { systemPrompt, userPrompt: judgePrompt } = buildJudgeMessages(result, testCase);

  let response;
  try {
    response = await callModelDetailed({
      model: judgeModel,
      systemPrompt,
      userPrompt: judgePrompt,
      temperature: 0,
      dryRun,
      beforeRequest,
    });
  } catch (error) {
    const attempt = error?.requestAttempt;
    if (error && typeof error === 'object' && attempt) {
      error.judgeModel = judgeAlias;
      error.judgeTrace = {
        alias: judgeAlias,
        requestedModelId: attempt.requestedModelId,
        reportedModelId: attempt.reportedModelId,
        modelIdentityStatus: attempt.modelIdentityStatus,
        provider: attempt.provider,
        requestId: attempt.requestId,
        usage: attempt.usage,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        latencyMs: attempt.latencyMs,
        parameters: attempt.parameters,
        request: attempt.request,
        systemPrompt,
        prompt: judgePrompt,
        rawResponse: null,
        outputValid: false,
        outcome: attempt.outcome,
        responseBytes: attempt.responseBytes,
        responseJsonBytes: attempt.responseJsonBytes,
      };
    }
    throw error;
  }

  const parsed = parseStrictJudgeJson(response.text);
  const judgeTrace = {
    alias: judgeAlias,
    requestedModelId: response.requestedModelId,
    reportedModelId: response.reportedModelId,
    modelIdentityStatus: response.modelIdentityStatus,
    provider: response.provider,
    requestId: response.requestId,
    usage: response.usage,
    startedAt: response.startedAt,
    completedAt: response.completedAt,
    latencyMs: response.latencyMs,
    parameters: response.parameters,
    request: response.request,
    systemPrompt,
    prompt: judgePrompt,
    rawResponse: response.text,
    outputValid: Boolean(parsed),
    responseBytes: response.responseBytes,
    responseJsonBytes: response.responseJsonBytes,
  };

  if (!parsed) {
    return {
      raw_score: null,
      justification: 'Invalid judge output; failed closed.',
      judge_model: judgeAlias,
      judge_trace: judgeTrace,
      evaluation_status: 'failed',
    };
  }

  return {
    raw_score: parsed.score,
    justification: parsed.justification,
    judge_model: judgeAlias,
    judge_trace: judgeTrace,
    evaluation_status: 'scored',
  };
}

function scoreDeterministicResult({ category, testCase, responseText, referenceTime }) {
  if (category === 'instruction-following') return scoreInstructionFollowing(testCase, responseText);
  if (category === 'tool-use') return scoreToolUse(testCase, responseText, referenceTime);
  if (category === 'code-generation') return scoreCodeGeneration(testCase, responseText);
  if (category === 'summarization') return scoreSummarization(testCase, responseText);
  return null;
}

async function scoreResult({
  result,
  testCase,
  defaultJudge,
  dryRun = false,
  localEndpoint,
  beforeRequest,
}) {
  const local = scoreDeterministicResult({
    category: result.category,
    testCase,
    responseText: result.response,
    referenceTime: result.started_at,
  });

  if (local && local.raw_score !== null && local.raw_score !== undefined) {
    return {
      ...result,
      raw_score: local.raw_score,
      justification: local.justification,
      judge_model: 'deterministic-rubric',
      judge_trace: null,
      evaluation_status: 'scored',
    };
  }

  const judgeAlias = pickJudgeAlias(defaultJudge, result.model);
  const judged = await judgeWithLLM({
    result,
    testCase,
    judgeAlias,
    dryRun,
    localEndpoint,
    beforeRequest,
  });

  return {
    ...result,
    raw_score: judged.raw_score,
    justification: judged.justification,
    judge_model: judged.judge_model,
    judge_trace: judged.judge_trace,
    evaluation_status: judged.evaluation_status,
  };
}

module.exports = {
  scoreResult,
  scoreDeterministicResult,
  pickJudgeAlias,
  scoreSummarization,
  parseStrictJudgeJson,
};
