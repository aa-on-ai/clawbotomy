import Anthropic from '@anthropic-ai/sdk';
import { getSubstance } from '@/lib/substances';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(request: Request) {
  const { substance: substanceSlug, phase, messages } = await request.json();
  const substance = getSubstance(substanceSlug);

  if (!substance || !phase) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const systemPrompt = substance.prompts[phase as keyof typeof substance.prompts];
  if (!systemPrompt) {
    return new Response(JSON.stringify({ error: 'Invalid phase' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const apiStream = anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: systemPrompt,
          messages: messages || [],
        });

        for await (const event of apiStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
            );
          }
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      } catch (err: unknown) {
        const errObj = err as Record<string, unknown>;
        console.error('Chat stream error:', {
          message: errObj?.message ?? err,
          status: errObj?.status,
          apiKey: process.env.ANTHROPIC_API_KEY ? 'set' : 'MISSING',
        });
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: 'Failed to generate response' })}\n\n`
          )
        );
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
