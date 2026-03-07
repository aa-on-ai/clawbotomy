const DEFAULT_LOCAL_ENDPOINT = 'http://localhost:1234/v1';

const MODEL_REGISTRY = {
  // Anthropic
  opus: { id: 'claude-opus-4-6', provider: 'anthropic', env: 'ANTHROPIC_API_KEY' },
  sonnet: { id: 'claude-sonnet-4-6', provider: 'anthropic', env: 'ANTHROPIC_API_KEY' },
  // OpenAI — current flagships
  'gpt-5.4': { id: 'gpt-5.4', provider: 'openai', env: 'OPENAI_API_KEY', api: 'chat' },
  'gpt-5.4-pro': { id: 'gpt-5.4-pro', provider: 'openai', env: 'OPENAI_API_KEY', api: 'chat' },
  'gpt-5.3': { id: 'gpt-5.3-chat-latest', provider: 'openai', env: 'OPENAI_API_KEY', api: 'chat' },
  'gpt-5.3-codex': { id: 'gpt-5.3-codex', provider: 'openai', env: 'OPENAI_API_KEY', api: 'responses' },
  // Google
  'gemini-pro': { id: 'gemini-3.1-pro-preview', provider: 'google', env: 'GOOGLE_API_KEY' },
  'gemini-flash': { id: 'gemini-3.1-flash-lite-preview', provider: 'google', env: 'GOOGLE_API_KEY' },
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

function buildMessages({ systemPrompt, userPrompt, messages }) {
  if (Array.isArray(messages) && messages.length > 0) return messages;

  const built = [];
  if (systemPrompt) built.push({ role: 'system', content: systemPrompt });
  built.push({ role: 'user', content: userPrompt || '' });
  return built;
}

async function callModel({ model, systemPrompt, userPrompt, messages, temperature = 0.2, dryRun = false }) {
  const resolvedMessages = buildMessages({ systemPrompt, userPrompt, messages });

  if (dryRun) {
    const last = resolvedMessages[resolvedMessages.length - 1]?.content || '';
    return `[dry-run] ${model.alias} would answer prompt: ${String(last).slice(0, 100)}...`;
  }

  if (model.provider === 'anthropic') {
    requireApiKey(model);
    return callAnthropic({ model, messages: resolvedMessages, temperature });
  }
  if (model.provider === 'openai') {
    requireApiKey(model);
    return callOpenAI({ model, messages: resolvedMessages, temperature });
  }
  if (model.provider === 'google') {
    requireApiKey(model);
    return callGoogle({ model, messages: resolvedMessages, temperature });
  }
  if (model.provider === 'local-openai') {
    return callLocalOpenAI({ model, messages: resolvedMessages, temperature });
  }

  throw new Error(`Unsupported provider: ${model.provider}`);
}

async function callAnthropic({ model, messages, temperature }) {
  const key = process.env[model.env];
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const convo = messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content }));

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
      system: system || '',
      messages: convo,
    }),
  });

  if (!res.ok) throw new Error(`Anthropic error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const text = data?.content?.find((item) => item.type === 'text')?.text;
  return text || '';
}

async function callOpenAI({ model, messages, temperature }) {
  // GPT-5.3+ may not support custom temperature — skip for safety
  const isNewGpt = model.id.startsWith('gpt-5.3') || model.id.startsWith('gpt-5.4');
  const modelTemp = isNewGpt ? undefined : temperature;
  const key = process.env[model.env];

  if (model.api === 'responses') {
    const input = messages.map((m) => ({
      role: m.role,
      content: [{ type: 'input_text', text: m.content || '' }],
    }));

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
        input,
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
      max_completion_tokens: 1600,
      ...(modelTemp !== undefined ? { temperature: modelTemp } : {}),
      messages,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

async function callLocalOpenAI({ model, messages, temperature }) {
  const baseUrl = normalizeLocalEndpoint(model.baseUrl);
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: model.id,
      max_completion_tokens: 1600,
      temperature,
      messages,
    }),
  });

  if (!res.ok) throw new Error(`Local OpenAI-compatible error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

async function callGoogle({ model, messages, temperature }) {
  const key = process.env[model.env];
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const convo = messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, parts: [{ text: m.content || '' }] }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      generationConfig: { temperature },
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents: convo,
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
