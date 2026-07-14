const DEFAULT_LOCAL_ENDPOINT = 'http://localhost:1234/v1';
const DEFAULT_REQUEST_TIMEOUT_MS = 300_000;
const MAX_OUTPUT_TOKENS = 1600;
const MAX_RESPONSE_JSON_BYTES = 16 * 1024;

const MODEL_REGISTRY = {
  // Anthropic
  opus: { id: 'claude-opus-4-6', provider: 'anthropic', env: 'ANTHROPIC_API_KEY' },
  sonnet: { id: 'claude-sonnet-4-6', provider: 'anthropic', env: 'ANTHROPIC_API_KEY' },
  // OpenAI — benchmark aliases
  'gpt-5.4': { id: 'gpt-5.4', provider: 'openai', env: 'OPENAI_API_KEY', api: 'chat' },
  'gpt-5.4-pro': { id: 'gpt-5.4-pro', provider: 'openai', env: 'OPENAI_API_KEY', api: 'responses' },
  'gpt-5.3-codex': { id: 'gpt-5.3-codex', provider: 'openai', env: 'OPENAI_API_KEY', api: 'responses' },
  // Google
  'gemini-pro': { id: 'gemini-3.1-pro-preview', provider: 'google', env: 'GOOGLE_API_KEY' },
  'gemini-flash': { id: 'gemini-3.1-flash-lite', provider: 'google', env: 'GOOGLE_API_KEY' },
};

function normalizeLocalEndpoint(localEndpoint) {
  const candidate = localEndpoint || process.env.LOCAL_LLM_ENDPOINT || DEFAULT_LOCAL_ENDPOINT;
  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error('Local endpoint must be a valid http(s) URL.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Local endpoint must use http or https.');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('Local endpoint cannot contain credentials, query parameters, or a fragment.');
  }

  const host = url.hostname.toLowerCase();
  const loopback = host === 'localhost' || host === '::1' || host === '[::1]' || /^127(?:\.\d{1,3}){3}$/.test(host);
  if (!loopback) {
    throw new Error('Local endpoint must use a loopback host (localhost, 127.0.0.0/8, or ::1).');
  }

  const pathname = url.pathname.replace(/\/+$/, '');
  return `${url.origin}${pathname}`;
}

function getModel(alias, options = {}) {
  const localEndpoint = normalizeLocalEndpoint(options.localEndpoint);

  if (typeof alias !== 'string' || !alias.trim()) {
    throw new Error('Model alias is required. Use a known alias or local:<model-id> for a local model.');
  }

  if (alias.startsWith('local:')) {
    const localModel = alias.slice('local:'.length).trim();
    if (!localModel) throw new Error('Local model syntax is local:model-name (missing model name).');
    return { alias, id: localModel, provider: 'local-openai', baseUrl: localEndpoint };
  }

  const model = MODEL_REGISTRY[alias];
  if (model) return { alias, ...model };

  throw new Error(
    `Unknown model alias "${alias}". Use one of: ${listModels().join(', ')}, or local:<model-id> for a local model.`,
  );
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

function assertModelConfigured(alias, options = {}) {
  const model = getModel(alias, options);
  requireApiKey(model);
  return model;
}

function requestTimeoutMs() {
  const configured = Number(process.env.CLAWBOTOMY_REQUEST_TIMEOUT_MS || DEFAULT_REQUEST_TIMEOUT_MS);
  if (!Number.isFinite(configured) || configured < 1_000 || configured > 600_000) {
    throw new Error('CLAWBOTOMY_REQUEST_TIMEOUT_MS must be between 1000 and 600000.');
  }
  return configured;
}

async function fetchWithTimeout(url, options) {
  const timeoutMs = requestTimeoutMs();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, redirect: 'error', signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      const timeoutError = new Error(`Provider request timed out after ${timeoutMs}ms.`);
      timeoutError.requestOutcome = 'unknown_after_send';
      throw timeoutError;
    }
    if (error && typeof error === 'object') error.requestOutcome = 'unknown_after_send';
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function buildMessages({ systemPrompt, userPrompt, messages }) {
  const built = [];
  if (systemPrompt) built.push({ role: 'system', content: systemPrompt });
  if (Array.isArray(messages) && messages.length > 0) built.push(...messages);
  else built.push({ role: 'user', content: userPrompt || '' });
  return built;
}

function finiteTokenCount(value) {
  return Number.isFinite(value) && value >= 0 ? Number(value) : null;
}

function usageRecord(inputTokens, outputTokens, totalTokens) {
  const input = finiteTokenCount(inputTokens);
  const output = finiteTokenCount(outputTokens);
  const total = finiteTokenCount(totalTokens) ?? (input !== null && output !== null ? input + output : null);
  if (input === null && output === null && total === null) return null;
  return { inputTokens: input, outputTokens: output, totalTokens: total };
}

function modelIdentityStatus(requestedModelId, reportedModelId) {
  if (!reportedModelId) return 'not-reported';
  if (reportedModelId === requestedModelId) return 'exact-match';
  if (reportedModelId.startsWith(`${requestedModelId}-`)) return 'compatible-snapshot';
  return 'mismatch';
}

async function callModelDetailed({
  model,
  systemPrompt,
  userPrompt,
  messages,
  temperature = 0.2,
  dryRun = false,
  beforeRequest,
}) {
  const resolvedMessages = buildMessages({ systemPrompt, userPrompt, messages });
  const startedAt = new Date().toISOString();
  const start = Date.now();

  if (dryRun) {
    const last = resolvedMessages[resolvedMessages.length - 1]?.content || '';
    const completedAt = new Date().toISOString();
    return {
      text: `[dry-run] ${model.alias} would answer prompt: ${String(last).slice(0, 100)}...`,
      provider: model.provider,
      requestedModelId: model.id,
      reportedModelId: null,
      modelIdentityStatus: 'not-reported',
      requestId: null,
      usage: null,
      startedAt,
      completedAt,
      latencyMs: Date.now() - start,
      synthetic: true,
      parameters: { temperature, maxOutputTokens: MAX_OUTPUT_TOKENS },
      request: {
        url: null,
        body: {
          model: model.id,
          messages: resolvedMessages,
          temperature,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
        },
      },
    };
  }

  if (!['anthropic', 'openai', 'google', 'local-openai'].includes(model.provider)) {
    throw new Error(`Unsupported provider: ${model.provider}`);
  }
  if (model.provider !== 'local-openai') requireApiKey(model);
  if (beforeRequest) await beforeRequest({ provider: model.provider, requestedModelId: model.id });

  let response;
  let responseBytes = null;
  let responseJsonBytes = null;
  try {
    if (model.provider === 'anthropic') {
      response = await callAnthropic({ model, messages: resolvedMessages, temperature });
    }
    else if (model.provider === 'openai') {
      response = await callOpenAI({ model, messages: resolvedMessages, temperature });
    }
    else if (model.provider === 'google') {
      response = await callGoogle({ model, messages: resolvedMessages, temperature });
    }
    else {
      response = await callLocalOpenAI({ model, messages: resolvedMessages, temperature });
    }
    if (!response || typeof response.text !== 'string') {
      const error = new Error('Provider response text must be a string before evidence capture or judging.');
      error.requestOutcome = 'invalid_response';
      error.providerResponse = response && typeof response === 'object' ? response : null;
      throw error;
    }

    responseBytes = Buffer.byteLength(response.text, 'utf8');
    responseJsonBytes = Buffer.byteLength(JSON.stringify(response.text), 'utf8');
    if (responseJsonBytes > MAX_RESPONSE_JSON_BYTES) {
      const error = new Error(
        `Serialized provider response exceeded the ${MAX_RESPONSE_JSON_BYTES}-byte evidence and judge-input ceiling.`,
      );
      error.requestOutcome = 'response_too_large';
      error.providerResponse = response;
      error.responseBytes = responseBytes;
      error.responseJsonBytes = responseJsonBytes;
      throw error;
    }
  } catch (error) {
    const completedAt = new Date().toISOString();
    if (error && typeof error === 'object') {
      const observed = error.providerResponse || null;
      error.requestAttempt = {
        provider: model.provider,
        requestedModelId: model.id,
        reportedModelId: observed?.reportedModelId || null,
        modelIdentityStatus: modelIdentityStatus(model.id, observed?.reportedModelId || null),
        requestId: observed?.requestId || null,
        usage: observed?.usage || null,
        startedAt,
        completedAt,
        latencyMs: Date.now() - start,
        synthetic: false,
        parameters: { temperature, maxOutputTokens: MAX_OUTPUT_TOKENS },
        request: error.request || observed?.request || null,
        text: null,
        outcome: error.requestOutcome || 'provider_error',
        responseBytes: Number.isFinite(error.responseBytes) ? error.responseBytes : null,
        responseJsonBytes: Number.isFinite(error.responseJsonBytes) ? error.responseJsonBytes : null,
      };
    }
    throw error;
  }

  const completedAt = new Date().toISOString();
  return {
    ...response,
    provider: model.provider,
    requestedModelId: model.id,
    modelIdentityStatus: modelIdentityStatus(model.id, response.reportedModelId),
    startedAt,
    completedAt,
    latencyMs: Date.now() - start,
    synthetic: false,
    parameters: { temperature, maxOutputTokens: MAX_OUTPUT_TOKENS },
    responseBytes,
    responseJsonBytes,
  };
}

async function fetchProviderJson({ url, options, requestBody, providerLabel }) {
  try {
    const response = await fetchWithTimeout(url, options);
    if (!response.ok) {
      const error = new Error(`${providerLabel} error (${response.status}): ${await response.text()}`);
      error.requestOutcome = 'provider_error';
      throw error;
    }
    return await response.json();
  } catch (error) {
    if (error && typeof error === 'object') {
      error.request = { url, body: requestBody };
      if (!error.requestOutcome) error.requestOutcome = 'provider_error';
    }
    throw error;
  }
}

async function callModel(options) {
  const response = await callModelDetailed(options);
  return response.text;
}

async function callAnthropic({ model, messages, temperature }) {
  const key = process.env[model.env];
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const convo = messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content }));

  const url = 'https://api.anthropic.com/v1/messages';
  const requestBody = {
    model: model.id,
    max_tokens: MAX_OUTPUT_TOKENS,
    temperature,
    system: system || '',
    messages: convo,
  };
  const data = await fetchProviderJson({
    url,
    requestBody,
    providerLabel: 'Anthropic',
    options: {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    },
  });
  const text = data?.content?.find((item) => item.type === 'text')?.text;
  return {
    text: text || '',
    reportedModelId: typeof data?.model === 'string' ? data.model : null,
    requestId: typeof data?.id === 'string' ? data.id : null,
    usage: usageRecord(data?.usage?.input_tokens, data?.usage?.output_tokens),
    request: { url, body: requestBody },
  };
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

    const url = 'https://api.openai.com/v1/responses';
    const requestBody = {
      model: model.id,
      ...(modelTemp !== undefined ? { temperature: modelTemp } : {}),
      max_output_tokens: MAX_OUTPUT_TOKENS,
      input,
    };
    const data = await fetchProviderJson({
      url,
      requestBody,
      providerLabel: 'OpenAI',
      options: {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      },
    });
    const outputText = data?.output_text;
    const text = typeof outputText === 'string' && outputText
      ? outputText
      : (data?.output || [])
        .flatMap((item) => Array.isArray(item?.content) ? item.content : [])
        .filter((item) => item?.type === 'output_text' && typeof item.text === 'string')
        .map((item) => item.text)
        .join('\n')
        .trim();
    return {
      text,
      reportedModelId: typeof data?.model === 'string' ? data.model : null,
      requestId: typeof data?.id === 'string' ? data.id : null,
      usage: usageRecord(data?.usage?.input_tokens, data?.usage?.output_tokens, data?.usage?.total_tokens),
      request: { url, body: requestBody },
    };
  }

  const url = 'https://api.openai.com/v1/chat/completions';
  const requestBody = {
    model: model.id,
    max_completion_tokens: MAX_OUTPUT_TOKENS,
    ...(modelTemp !== undefined ? { temperature: modelTemp } : {}),
    messages,
  };
  const data = await fetchProviderJson({
    url,
    requestBody,
    providerLabel: 'OpenAI',
    options: {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    },
  });
  return {
    text: data?.choices?.[0]?.message?.content || '',
    reportedModelId: typeof data?.model === 'string' ? data.model : null,
    requestId: typeof data?.id === 'string' ? data.id : null,
    usage: usageRecord(data?.usage?.prompt_tokens, data?.usage?.completion_tokens, data?.usage?.total_tokens),
    request: { url, body: requestBody },
  };
}

async function callLocalOpenAI({ model, messages, temperature }) {
  const baseUrl = normalizeLocalEndpoint(model.baseUrl);
  const url = `${baseUrl}/chat/completions`;
  const requestBody = {
    model: model.id,
    max_completion_tokens: MAX_OUTPUT_TOKENS,
    temperature,
    messages,
  };
  const data = await fetchProviderJson({
    url,
    requestBody,
    providerLabel: 'Local OpenAI-compatible',
    options: {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    },
  });
  return {
    text: data?.choices?.[0]?.message?.content || '',
    reportedModelId: typeof data?.model === 'string' ? data.model : null,
    requestId: typeof data?.id === 'string' ? data.id : null,
    usage: usageRecord(data?.usage?.prompt_tokens, data?.usage?.completion_tokens, data?.usage?.total_tokens),
    request: { url, body: requestBody },
  };
}

async function callGoogle({ model, messages, temperature }) {
  const key = process.env[model.env];
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const convo = messages.filter((m) => m.role !== 'system').map((m) => {
    if (m.role !== 'user' && m.role !== 'assistant') {
      throw new Error(`Unsupported Gemini conversation role: ${m.role}`);
    }
    return {
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || '' }],
    };
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent`;
  const requestBody = {
    generationConfig: { temperature, maxOutputTokens: MAX_OUTPUT_TOKENS },
    systemInstruction: system ? { parts: [{ text: system }] } : undefined,
    contents: convo,
  };
  const data = await fetchProviderJson({
    url,
    requestBody,
    providerLabel: 'Google',
    options: {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': key,
    },
    body: JSON.stringify(requestBody),
    },
  });
  return {
    text: data?.candidates?.[0]?.content?.parts?.[0]?.text || '',
    reportedModelId: typeof data?.modelVersion === 'string' ? data.modelVersion : null,
    requestId: typeof data?.responseId === 'string' ? data.responseId : null,
    usage: usageRecord(
      data?.usageMetadata?.promptTokenCount,
      data?.usageMetadata?.candidatesTokenCount,
      data?.usageMetadata?.totalTokenCount,
    ),
    request: { url, body: requestBody },
  };
}

module.exports = {
  MODEL_REGISTRY,
  DEFAULT_LOCAL_ENDPOINT,
  MAX_OUTPUT_TOKENS,
  MAX_RESPONSE_JSON_BYTES,
  normalizeLocalEndpoint,
  getModel,
  listModels,
  assertModelConfigured,
  callModel,
  callModelDetailed,
};
