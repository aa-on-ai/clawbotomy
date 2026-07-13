const assert = require('node:assert/strict');
const test = require('node:test');

const { callModel, callModelDetailed, getModel } = require('../bench/models');

test('GPT-5.4 Pro uses Responses and reads output text after reasoning items', async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  let request;
  process.env.OPENAI_API_KEY = 'test-only';
  global.fetch = async (url, options) => {
    request = { url, body: JSON.parse(options.body) };
    return {
      ok: true,
      json: async () => ({
        output: [
          { type: 'reasoning', content: [] },
          { type: 'message', content: [{ type: 'output_text', text: 'first' }] },
          { type: 'message', content: [{ type: 'output_text', text: 'second' }] },
        ],
      }),
    };
  };

  try {
    const response = await callModel({
      model: getModel('gpt-5.4-pro'),
      messages: [{ role: 'user', content: 'Test' }],
    });
    assert.equal(request.url, 'https://api.openai.com/v1/responses');
    assert.equal(request.body.model, 'gpt-5.4-pro');
    assert.equal('temperature' in request.body, false);
    assert.equal(response, 'first\nsecond');
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});

test('Gemini Flash uses the GA ID and maps assistant turns to model', async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GOOGLE_API_KEY;
  let request;
  process.env.GOOGLE_API_KEY = 'test-only';
  global.fetch = async (url, options) => {
    request = { url, headers: options.headers, body: JSON.parse(options.body) };
    return {
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }),
    };
  };

  try {
    const model = getModel('gemini-flash');
    const response = await callModel({
      model,
      messages: [
        { role: 'user', content: 'one' },
        { role: 'assistant', content: 'two' },
        { role: 'user', content: 'three' },
      ],
    });
    assert.equal(model.id, 'gemini-3.1-flash-lite');
    assert.match(request.url, /gemini-3\.1-flash-lite:generateContent/);
    assert.doesNotMatch(request.url, /[?&]key=/);
    assert.equal(request.headers['x-goog-api-key'], 'test-only');
    assert.deepEqual(request.body.contents.map((message) => message.role), ['user', 'model', 'user']);
    assert.equal(request.body.generationConfig.maxOutputTokens, 1600);
    assert.equal(response, 'ok');
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GOOGLE_API_KEY;
    else process.env.GOOGLE_API_KEY = originalKey;
  }
});

test('supplied conversations retain the benchmark system prompt', async () => {
  const originalFetch = global.fetch;
  let request;
  global.fetch = async (url, options) => {
    request = { url, body: JSON.parse(options.body) };
    return {
      ok: true,
      json: async () => ({ model: 'test-model', choices: [{ message: { content: 'ok' } }] }),
    };
  };

  try {
    await callModelDetailed({
      model: getModel('local:test-model'),
      systemPrompt: 'SYSTEM PROMPT MUST BE SENT',
      messages: [{ role: 'user', content: 'turn one' }],
    });
    assert.equal(request.body.messages[0].role, 'system');
    assert.equal(request.body.messages[0].content, 'SYSTEM PROMPT MUST BE SENT');
  } finally {
    global.fetch = originalFetch;
  }
});

test('local endpoints are loopback-only and cannot carry credentials or query data', () => {
  assert.equal(
    getModel('local:test', { localEndpoint: 'http://[::1]:8080/v1/' }).baseUrl,
    'http://[::1]:8080/v1',
  );
  for (const endpoint of [
    'http://user:password@localhost:8080/v1',
    'http://localhost:8080/v1?token=secret',
    'http://169.254.169.254/latest',
    'http://192.168.1.20:8080/v1',
    'file:///tmp/model',
  ]) {
    assert.throws(() => getModel('local:test', { localEndpoint: endpoint }), /Local endpoint/);
  }
});

test('detailed calls retain allowlisted request, identity, usage, and latency telemetry', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      id: 'request-test-1',
      model: 'test-model-v1',
      choices: [{ message: { content: 'response' } }],
      usage: { prompt_tokens: 12, completion_tokens: 4, total_tokens: 16 },
    }),
  });

  try {
    const response = await callModelDetailed({
      model: getModel('local:test-model-v1'),
      messages: [{ role: 'user', content: 'hello' }],
    });
    assert.equal(response.text, 'response');
    assert.equal(response.requestId, 'request-test-1');
    assert.equal(response.requestedModelId, 'test-model-v1');
    assert.equal(response.reportedModelId, 'test-model-v1');
    assert.equal(response.modelIdentityStatus, 'exact-match');
    assert.deepEqual(response.usage, { inputTokens: 12, outputTokens: 4, totalTokens: 16 });
    assert.equal(response.request.url, 'http://localhost:1234/v1/chat/completions');
    assert.equal(response.request.body.model, 'test-model-v1');
    assert.ok(response.latencyMs >= 0);
    assert.match(response.startedAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.match(response.completedAt, /^\d{4}-\d{2}-\d{2}T/);
  } finally {
    global.fetch = originalFetch;
  }
});
