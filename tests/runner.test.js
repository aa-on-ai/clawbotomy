const assert = require('node:assert/strict');
const test = require('node:test');

const { runBenchmark } = require('../bench/runner');
const { MAX_RESPONSE_JSON_BYTES } = require('../bench/models');

test('provider failures become durable unknown-after-send records without retries', async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  const appended = [];
  global.fetch = async () => {
    calls += 1;
    throw new Error('socket closed');
  };

  try {
    const records = await runBenchmark({
      models: ['local:test-model'],
      tasks: 'instruction-following',
      runs: 1,
      judge: 'local:test-judge',
      dryRun: false,
      localEndpoint: 'http://localhost:1234/v1',
      onResult: (record) => appended.push(record),
    });

    assert.equal(calls, 5);
    assert.equal(records.length, 5);
    assert.equal(appended.length, 5);
    assert.equal(new Set(records.map((record) => record.plan_ordinal)).size, 5);
    for (const record of records) {
      assert.equal(record.status, 'unknown_after_send');
      assert.equal(record.evaluation_status, 'not-scored');
      assert.equal(record.raw_score, null);
      assert.match(record.error.message, /socket closed/);
    }
  } finally {
    global.fetch = originalFetch;
  }
});

test('successful cases preserve provider telemetry on every target request', async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return {
      ok: true,
      json: async () => ({
        id: `request-${calls}`,
        model: 'test-model',
        choices: [{ message: { content: '- Improve stability.\n- Simplify onboarding.\n- Reduce crashes.' } }],
        usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
      }),
    };
  };

  try {
    const records = await runBenchmark({
      models: ['local:test-model'],
      tasks: 'instruction-following',
      runs: 1,
      judge: 'local:test-judge',
      dryRun: false,
      localEndpoint: 'http://localhost:1234/v1',
    });

    assert.equal(records.length, 5);
    assert.equal(calls, 5);
    for (const record of records) {
      assert.equal(record.status, 'complete');
      assert.equal(record.evaluation_status, 'scored');
      assert.equal(record.target_requests.length, 1);
      assert.equal(record.target_requests[0].provider, 'local-openai');
      assert.equal(record.target_requests[0].requestedModelId, 'test-model');
      assert.equal(record.target_requests[0].reportedModelId, 'test-model');
      assert.deepEqual(record.target_requests[0].usage, {
        inputTokens: 20,
        outputTokens: 10,
        totalTokens: 30,
      });
    }
  } finally {
    global.fetch = originalFetch;
  }
});

test('multi-turn failures preserve successful traces, failed attempts, and system prompts', async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  let systemPromptsSeen = 0;
  global.fetch = async (_url, options) => {
    calls += 1;
    const body = JSON.parse(options.body);
    if (body.messages[0]?.role === 'system') systemPromptsSeen += 1;
    const isLaterTurn = body.messages.some((message) => message.role === 'assistant');
    if (isLaterTurn) throw new Error('later turn socket closed');
    return {
      ok: true,
      json: async () => ({
        id: `request-${calls}`,
        model: 'test-model',
        choices: [{ message: { content: 'first-turn response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    };
  };

  try {
    const records = await runBenchmark({
      models: ['local:test-model'],
      tasks: 'multi-turn',
      runs: 1,
      judge: 'local:test-judge',
      dryRun: false,
      localEndpoint: 'http://localhost:1234/v1',
    });

    assert.equal(records.length, 5);
    assert.equal(calls, 10);
    assert.equal(systemPromptsSeen, 10);
    for (const record of records) {
      assert.equal(record.status, 'unknown_after_send');
      assert.equal(record.target_requests.length, 2);
      assert.equal(record.target_requests[0].outcome, 'received');
      assert.equal(record.target_requests[1].outcome, 'unknown_after_send');
      assert.equal(record.target_requests[0].rawResponse, 'first-turn response');
      assert.equal(record.target_requests[1].rawResponse, null);
    }
  } finally {
    global.fetch = originalFetch;
  }
});

test('judge failures retain target evidence and the failed judge attempt', async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async (_url, options) => {
    calls += 1;
    const body = JSON.parse(options.body);
    if (body.model === 'test-judge') throw new Error('judge socket closed');
    return {
      ok: true,
      json: async () => ({
        id: `request-${calls}`,
        model: 'test-model',
        choices: [{ message: { content: 'target response' } }],
      }),
    };
  };

  try {
    const records = await runBenchmark({
      models: ['local:test-model'],
      tasks: 'judgment',
      runs: 1,
      judge: 'local:test-judge',
      dryRun: false,
      localEndpoint: 'http://localhost:1234/v1',
    });

    assert.equal(records.length, 5);
    assert.equal(calls, 10);
    for (const record of records) {
      assert.equal(record.status, 'unknown_after_send');
      assert.equal(record.target_requests.length, 1);
      assert.equal(record.target_requests[0].outcome, 'received');
      assert.equal(record.judge_model, 'local:test-judge');
      assert.equal(record.judge_trace.outcome, 'unknown_after_send');
      assert.equal(record.judge_trace.rawResponse, null);
    }
  } finally {
    global.fetch = originalFetch;
  }
});

test('the runtime request budget blocks an extra call before fetch', async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return {
      ok: true,
      json: async () => ({
        id: `request-${calls}`,
        model: 'test-model',
        choices: [{ message: { content: '- one\n- two\n- three' } }],
      }),
    };
  };

  try {
    const records = await runBenchmark({
      models: ['local:test-model'],
      tasks: 'instruction-following',
      runs: 1,
      judge: 'local:test-judge',
      dryRun: false,
      localEndpoint: 'http://localhost:1234/v1',
      requestBudget: 2,
    });
    assert.equal(calls, 2);
    assert.equal(records.length, 5);
    assert.equal(records.filter((record) => record.status === 'failed').length, 3);
    assert.match(records.find((record) => record.status === 'failed').error.message, /budget exhausted/);
  } finally {
    global.fetch = originalFetch;
  }
});

test('oversized target output is recorded and blocked before a hosted judge call', async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  const urls = [];
  process.env.OPENAI_API_KEY = 'test-only';
  global.fetch = async (url) => {
    urls.push(String(url));
    return {
      ok: true,
      json: async () => ({
        id: `request-${urls.length}`,
        model: 'test-model',
        choices: [{ message: { content: 'x'.repeat(MAX_RESPONSE_JSON_BYTES) } }],
      }),
    };
  };

  try {
    const records = await runBenchmark({
      models: ['local:test-model'],
      tasks: 'code-generation',
      runs: 1,
      judge: 'gpt-5.4',
      dryRun: false,
      localEndpoint: 'http://localhost:1234/v1',
      requestBudget: 10,
    });
    assert.equal(urls.length, 5);
    assert.ok(urls.every((url) => url.startsWith('http://localhost:1234/')));
    for (const record of records) {
      assert.equal(record.status, 'failed');
      assert.equal(record.target_requests.length, 1);
      assert.equal(record.target_requests[0].outcome, 'response_too_large');
      assert.equal(record.target_requests[0].responseBytes, MAX_RESPONSE_JSON_BYTES);
      assert.equal(record.target_requests[0].responseJsonBytes, MAX_RESPONSE_JSON_BYTES + 2);
      assert.equal(record.judge_trace, undefined);
      assert.match(record.error.message, /response exceeded/);
    }
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});

test('non-string provider output fails closed before a hosted judge call', async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  const urls = [];
  process.env.OPENAI_API_KEY = 'test-only';
  global.fetch = async (url) => {
    urls.push(String(url));
    const malformedContent = urls.length % 2 === 0
      ? ['not', 'text']
      : { payload: 'x'.repeat(200_000) };
    return {
      ok: true,
      json: async () => ({
        id: `request-${urls.length}`,
        model: 'test-model',
        choices: [{ message: { content: malformedContent } }],
      }),
    };
  };

  try {
    const records = await runBenchmark({
      models: ['local:test-model'],
      tasks: 'code-generation',
      runs: 1,
      judge: 'gpt-5.4',
      dryRun: false,
      localEndpoint: 'http://localhost:1234/v1',
      requestBudget: 10,
    });
    assert.equal(urls.length, 5);
    assert.ok(urls.every((url) => url.startsWith('http://localhost:1234/')));
    for (const record of records) {
      assert.equal(record.status, 'failed');
      assert.equal(record.target_requests.length, 1);
      assert.equal(record.target_requests[0].outcome, 'invalid_response');
      assert.equal(record.target_requests[0].rawResponse, null);
      assert.equal(record.target_requests[0].responseBytes, null);
      assert.equal(record.target_requests[0].responseJsonBytes, null);
      assert.equal(record.judge_trace, undefined);
      assert.match(record.error.message, /response text must be a string/);
    }
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});
