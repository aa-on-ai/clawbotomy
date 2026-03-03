const DEFAULT_LOCAL_ENDPOINT = 'http://localhost:1234/v1';

const MODEL_REGISTRY = {
  opus: { id: 'anthropic/claude-opus-4-6', provider: 'anthropic', env: 'ANTHROPIC_API_KEY' },
  sonnet: { id: 'anthropic/claude-sonnet-4-6', provider: 'anthropic', env: 'ANTHROPIC_API_KEY' },
  gpt5: { id: 'gpt-5.3', provider: 'openai', env: 'OPENAI_API_KEY', api: 'responses' },
  gpt4o: { id: 'gpt-4o', provider: 'openai', env: 'OPENAI_API_KEY', api: 'chat' },
  'gemini-pro': { id: 'gemini-3-pro-preview', provider: 'google', env: 'GOOGLE_API_KEY' },
  'gemini-flash': { id: 'gemini-3-flash-preview', provider: 'google', env: 'GOOGLE_API_KEY' },
};

function normalizeLocalEndpoint(localEndpoint) {
  return (localEndpoint || process.env.LOCAL_LLM_ENDPOINT || DEFAULT_LOCAL_ENDPOINT).replace(/\/$/, '');
}

function getModel(alias, options = {}) {
  const localEndpoint = normalizeLocalEndpoint(options.localEndpoint);

  if (alias.startsWith('local:')) {
    const localModel = alias.slice('local:'.length).trim();
    if (!localModel) throw new Error('Local model syntax is local:model-name (missing model name).');
    return { alias, id: localModel, provider: 'local-openai', baseUrl: localEndpoint };
  }

  const model = MODEL_REGISTRY[alias];
  if (model) return { alias, ...model };

  // Unknown aliases are treated as local OpenAI-compatible models.
  return { alias, id: alias, provider: 'local-openai', baseUrl: localEndpoint };
}

function listModels() {
  return Object.keys(MODEL_REGISTRY);
}

function requireApiKey(model) {
  if (!model.env) return null;

  const key = process.env[model.env];
  if (!key) {
    throw new Error(`Missing API key for ${model.alias}. Set ${model.env}.`);
  }
  return key;
}

async function callModel({ model, systemPrompt, userPrompt, temperature = 0.2, dryRun = false }) {
  if (dryRun) {
    return `[dry-run] ${model.alias} would answer prompt: ${userPrompt.slice(0, 100)}...`;
  }

  if (model.provider === 'anthropic') {
    requireApiKey(model);
    return callAnthropic({ model, systemPrompt, userPrompt, temperature });
  }
  if (model.provider === 'openai') {
    requireApiKey(model);
    return callOpenAI({ model, systemPrompt, userPrompt, temperature });
  }
  if (model.provider === 'google') {
    requireApiKey(model);
    return callGoogle({ model, systemPrompt, userPrompt, temperature });
  }
  if (model.provider === 'local-openai') {
    return callLocalOpenAI({ model, systemPrompt, userPrompt, temperature });
  }

  throw new Error(`Unsupported provider: ${model.provider}`);
}

async function callAnthropic({ model, systemPrompt, userPrompt, temperature }) {
  const key = process.env[model.env];
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: model.id,
      max_tokens: 1600,
      temperature,
      system: systemPrompt || '',
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const text = data?.content?.find((item) => item.type === 'text')?.text;
  return text || '';
}

async function callOpenAI({ model, systemPrompt, userPrompt, temperature }) {
  const key = process.env[model.env];

  if (model.api === 'responses') {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: model.id,
        temperature,
        max_output_tokens: 1600,
        input: [
          { role: 'system', content: [{ type: 'input_text', text: systemPrompt || 'You are a helpful assistant.' }] },
          { role: 'user', content: [{ type: 'input_text', text: userPrompt }] },
        ],
      }),
    });

    if (!res.ok) throw new Error(`OpenAI error (${res.status}): ${await res.text()}`);
    const data = await res.json();
    const outputText = data?.output_text;
    if (typeof outputText === 'string' && outputText) return outputText;

    const first = data?.output?.[0]?.content?.find((item) => item.type === 'output_text')?.text;
    return first || '';
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: model.id,
      max_tokens: 1600,
      temperature,
      messages: [
        { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

async function callLocalOpenAI({ model, systemPrompt, userPrompt, temperature }) {
  const baseUrl = normalizeLocalEndpoint(model.baseUrl);
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: model.id,
      max_tokens: 1600,
      temperature,
      messages: [
        { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Local OpenAI-compatible error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

async function callGoogle({ model, systemPrompt, userPrompt, temperature }) {
  const key = process.env[model.env];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      generationConfig: { temperature },
      systemInstruction: systemPrompt
        ? { parts: [{ text: systemPrompt }] }
        : undefined,
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    }),
  });

  if (!res.ok) throw new Error(`Google error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

module.exports = {
  MODEL_REGISTRY,
  DEFAULT_LOCAL_ENDPOINT,
  normalizeLocalEndpoint,
  getModel,
  listModels,
  callModel,
};
