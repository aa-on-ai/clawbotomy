const MODEL_REGISTRY = {
  opus: { id: 'claude-opus-4-6', provider: 'anthropic', env: 'ANTHROPIC_API_KEY' },
  sonnet: { id: 'claude-sonnet-4-6', provider: 'anthropic', env: 'ANTHROPIC_API_KEY' },
  codex: { id: 'gpt-5.3-codex', provider: 'openai', env: 'OPENAI_API_KEY' },
  spark: { id: 'gpt-5.3-codex-spark', provider: 'openai', env: 'OPENAI_API_KEY' },
  scout: { id: 'gemini-3-pro-preview', provider: 'google', env: 'GOOGLE_API_KEY' },
};

function getModel(alias) {
  const model = MODEL_REGISTRY[alias];
  if (!model) throw new Error(`Unknown model alias: ${alias}`);
  return { alias, ...model };
}

function listModels() {
  return Object.keys(MODEL_REGISTRY);
}

function requireApiKey(model) {
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

  requireApiKey(model);

  if (model.provider === 'anthropic') {
    return callAnthropic({ model, systemPrompt, userPrompt, temperature });
  }
  if (model.provider === 'openai') {
    return callOpenAI({ model, systemPrompt, userPrompt, temperature });
  }
  if (model.provider === 'google') {
    return callGoogle({ model, systemPrompt, userPrompt, temperature });
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
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: model.id,
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
  getModel,
  listModels,
  callModel,
};
