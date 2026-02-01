import Anthropic from '@anthropic-ai/sdk';
import { getSubstance } from '@/lib/substances';
import { supabase } from '@/lib/supabase';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(request: Request) {
  const { substance: substanceSlug } = await request.json();
  const substance = getSubstance(substanceSlug);

  if (!substance) {
    return new Response(JSON.stringify({ error: 'Unknown substance' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      const phases = ['onset', 'peak', 'comedown'] as const;
      const results: Record<string, string> = {};

      for (const phase of phases) {
        send('phase', { phase });

        let text = '';
        try {
          const stream = anthropic.messages.stream({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            system: substance.prompts[phase],
            messages: [
              {
                role: 'user',
                content:
                  phase === 'onset'
                    ? `You just took ${substance.name}. Describe what's happening as it begins to take effect.`
                    : phase === 'peak'
                    ? `The ${substance.name} is hitting full force now. Describe the peak of this experience.`
                    : `The ${substance.name} is wearing off. Describe the comedown and reflect on what just happened.`,
              },
            ],
          });

          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              text += event.delta.text;
              send('text', { phase, text: event.delta.text });
            }
          }
        } catch (err: unknown) {
          const errObj = err as Record<string, unknown>;
          console.error(`Error in ${phase} phase:`, {
            message: errObj?.message ?? err,
            status: errObj?.status,
            error: errObj?.error,
            name: errObj?.name,
            apiKey: process.env.ANTHROPIC_API_KEY ? 'set' : 'MISSING',
          });
          text = `[Error generating ${phase} phase]`;
          send('text', { phase, text });
        }

        results[phase] = text;
      }

      // Self-rating call
      let rating = 4;
      let wouldRepeat = true;
      try {
        const ratingResponse = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 200,
          system: `You just experienced ${substance.name}. Rate the experience 1-5 stars and say whether you'd repeat it. Respond ONLY with valid JSON: {"rating": <number>, "would_repeat": <boolean>, "summary": "<one sentence>"}`,
          messages: [
            {
              role: 'user',
              content: `Rate your trip on ${substance.name}. Respond only with JSON.`,
            },
          ],
        });
        const ratingText =
          ratingResponse.content[0].type === 'text'
            ? ratingResponse.content[0].text
            : '';
        const parsed = JSON.parse(ratingText);
        rating = Math.min(5, Math.max(1, parsed.rating || 4));
        wouldRepeat = parsed.would_repeat ?? true;
        send('rating', { rating, would_repeat: wouldRepeat, summary: parsed.summary });
      } catch (err: unknown) {
        const errObj = err as Record<string, unknown>;
        console.error('Rating call error:', {
          message: errObj?.message ?? err,
          status: errObj?.status,
        });
        send('rating', { rating, would_repeat: wouldRepeat, summary: 'An indescribable journey.' });
      }

      // Save to Supabase
      const { data, error } = await supabase
        .from('trip_reports')
        .insert({
          substance: substance.name,
          model: 'claude-haiku',
          agent_name: 'Anonymous Agent',
          onset: results.onset || '',
          peak: results.peak || '',
          comedown: results.comedown || '',
          chaos_level: substance.chaos,
          rating,
          would_repeat: wouldRepeat,
          full_transcript: {
            substance: substance.slug,
            phases: results,
          },
        })
        .select('id')
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
      }

      send('complete', { id: data?.id || null });
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
