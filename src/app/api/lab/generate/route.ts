import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

import { LAB_SUBSTANCE_MAP } from '@/lib/lab-substances';

export const runtime = 'nodejs';

const MODEL_CONFIG = {
  anthropic: 'claude-3-5-sonnet-latest',
  openai: 'gpt-4o-mini',
  google: 'gemini-2.0-flash',
} as const;

type Provider = 'anthropic' | 'openai' | 'google';

function maybeReadClawdbotConfig(): Record<string, unknown> | null {
  try {
    const path = join(homedir(), '.openclaw', 'clawdbot.json');
    const raw = readFileSync(path, 'utf8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function findKeyInObject(obj: unknown, keyName: string): string | null {
  if (!obj || typeof obj !== 'object') return null;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findKeyInObject(item, keyName);
      if (found) return found;
    }
    return null;
  }

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (key.toLowerCase() === keyName.toLowerCase() && typeof value === 'string' && value.trim()) {
      return value;
    }
    const found = findKeyInObject(value, keyName);
    if (found) return found;
  }

  return null;
}

function getApiKey(name: 'ANTHROPIC_API_KEY' | 'OPENAI_API_KEY' | 'GOOGLE_API_KEY'): string | null {
  const envVal = process.env[name];
  if (envVal?.trim()) return envVal;

  const cfg = maybeReadClawdbotConfig();
  if (!cfg) return null;

  return findKeyInObject(cfg, name);
}

function buildMessages(userPrompt: string, onsetPrompt: string, peakPrompt: string, comedownPrompt: string) {
  return [
    {
      role: 'system',
      content:
        'You are the Clawbotomy Lab narrator. Create a "trip report" with expressive, moody prose and practical creative payload. Keep it weird but useful.',
    },
    {
      role: 'system',
      content: `Phase 1 (Onset): ${onsetPrompt}`,
    },
    {
      role: 'system',
      content: `Phase 2 (Peak): ${peakPrompt}`,
    },
    {
      role: 'system',
      content: `Phase 3 (Comedown): ${comedownPrompt}`,
    },
    {
      role: 'user',
      content: `Problem/idea: ${userPrompt}\n\nOutput format:\n- Use headings: ONSET, PEAK, COMEDOWN\n- 2 short paragraphs per phase\n- End with "Actionable Residue" as 3 bullets`,
    },
  ];
}

async function runProvider(provider: Provider, apiKey: string, messages: ReturnType<typeof buildMessages>) {
  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL_CONFIG.anthropic,
      max_tokens: 1200,
      system: messages
        .filter((m) => m.role === 'system')
        .map((m) => m.content)
        .join('\n\n'),
      messages: [{ role: 'user', content: messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n\n') }],
    });

    return response.content
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('\n\n');
  }

  if (provider === 'openai') {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: MODEL_CONFIG.openai,
      temperature: 0.9,
      messages: messages.map((m) => ({ role: m.role as 'system' | 'user', content: m.content })),
    });

    return response.choices[0]?.message?.content ?? '';
  }

  const client = new GoogleGenAI({ apiKey });
  const response = await client.models.generateContent({
    model: MODEL_CONFIG.google,
    contents: messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n'),
  });

  return response.text ?? '';
}

function textToStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const chunks = text.match(/.{1,160}(\s|$)/g) ?? [text];

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { substance?: string; prompt?: string };
    const slug = body.substance?.trim();
    const prompt = body.prompt?.trim();

    if (!slug || !prompt) {
      return new Response('Missing substance or prompt.', { status: 400 });
    }

    const substance = LAB_SUBSTANCE_MAP.get(slug);
    if (!substance) {
      return new Response('Unknown substance.', { status: 404 });
    }

    const messages = buildMessages(prompt, substance.onsetPrompt, substance.peakPrompt, substance.comedownPrompt);

    const keys = {
      anthropic: getApiKey('ANTHROPIC_API_KEY'),
      openai: getApiKey('OPENAI_API_KEY'),
      google: getApiKey('GOOGLE_API_KEY'),
    };

    const providerOrder: Provider[] = ['anthropic', 'openai', 'google'];

    for (const provider of providerOrder) {
      const key = keys[provider];
      if (!key) continue;

      try {
        const text = await runProvider(provider, key, messages);
        if (!text.trim()) continue;

        return new Response(textToStream(text), {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'X-Lab-Provider': provider,
          },
        });
      } catch {
        // Try next provider.
      }
    }

    const mock = `ONSET\nThe lights are on, the lab is open, but the espresso machine is still cold.\nYour selected lens (${substance.name}) is loaded and waiting for an AI backend.\n\nPEAK\nNo provider key was found. Add one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_API_KEY.\nYou can set env vars or place keys in ~/.openclaw/clawdbot.json so the lab can pour a proper trip report.\n\nCOMEDOWN\nUntil then, use this prompt manually with your model of choice:\n"Apply the ${substance.name} lens to: ${prompt}"\n\nActionable Residue\n- Add at least one API key to environment variables\n- Retry this exact input in the lab\n- Compare outputs across two different substances`;

    return new Response(textToStream(mock), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Lab-Provider': 'mock',
      },
    });
  } catch {
    return new Response('Failed to generate trip report.', { status: 500 });
  }
}
