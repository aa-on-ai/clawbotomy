import Anthropic from '@anthropic-ai/sdk';
import { getSubstance } from '@/lib/substances';
import { getModel } from '@/lib/models';

export async function POST(request: Request) {
  const { substance: substanceSlug, phase, messages, model: modelId } =
    await request.json();
  const substance = getSubstance(substanceSlug);
  const model = getModel(modelId || 'haiku');

  if (!substance || !phase) {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  if (!model) {
    return Response.json({ error: 'Unknown model' }, { status: 400 });
  }

  const systemPrompt =
    substance.prompts[phase as keyof typeof substance.prompts];
  if (!systemPrompt) {
    return Response.json({ error: 'Invalid phase' }, { status: 400 });
  }

  // Check if the required API key is available
  const apiKey = process.env[model.envKey];
  if (!apiKey) {
    return Response.json(
      { error: `${model.envKey} not configured. Add it to .env.local to use ${model.name}.` },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        if (model.provider === 'anthropic') {
          await streamAnthropic(model.apiModel, apiKey, systemPrompt, messages, send);
        } else if (model.provider === 'openai') {
          await streamOpenAI(model.apiModel, apiKey, systemPrompt, messages, send);
        } else if (model.provider === 'google') {
          await streamGoogle(model.apiModel, apiKey, systemPrompt, messages, send);
        }
        send('[DONE]');
      } catch (err: unknown) {
        const errObj = err as Record<string, unknown>;
        console.error(`Chat stream error (${model.name}):`, {
          message: errObj?.message ?? err,
          status: errObj?.status,
          provider: model.provider,
        });
        send(JSON.stringify({ error: `Failed to generate response from ${model.name}` }));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

type SendFn = (data: string) => void;

async function streamAnthropic(
  apiModel: string,
  apiKey: string,
  systemPrompt: string,
  messages: { role: string; content: string }[],
  send: SendFn
) {
  const anthropic = new Anthropic({ apiKey });
  const stream = anthropic.messages.stream({
    model: apiModel,
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  });

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      send(JSON.stringify({ text: event.delta.text }));
    }
  }
}

async function streamOpenAI(
  apiModel: string,
  apiKey: string,
  systemPrompt: string,
  messages: { role: string; content: string }[],
  send: SendFn
) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: apiModel,
      max_tokens: 1024,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
  });

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body from OpenAI');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') continue;
        try {
          const parsed = JSON.parse(payload);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            send(JSON.stringify({ text: delta }));
          }
        } catch {
          // skip
        }
      }
    }
  }
}

async function streamGoogle(
  apiModel: string,
  apiKey: string,
  systemPrompt: string,
  messages: { role: string; content: string }[],
  send: SendFn
) {
  // Gemini uses generateContent with streaming via SSE
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 1024 },
      }),
    }
  );

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body from Google');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const payload = line.slice(6).trim();
        try {
          const parsed = JSON.parse(payload);
          const text =
            parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            send(JSON.stringify({ text }));
          }
        } catch {
          // skip
        }
      }
    }
  }
}
