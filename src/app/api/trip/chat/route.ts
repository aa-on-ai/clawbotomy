import Anthropic from '@anthropic-ai/sdk';
import { getSubstance } from '@/lib/substances';
import { getModel } from '@/lib/models';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Global rate limit to prevent cost overruns
const DAILY_DEMO_LIMIT = 200; // max human demo requests per day

async function checkGlobalRateLimit(): Promise<{ allowed: boolean; error?: string }> {
  const currentDay = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  
  // Get or create rate limit record for demos
  const { data } = await supabaseAdmin
    .from('global_rate_limits')
    .select('*')
    .eq('id', 'demo')
    .single();
  
  if (!data) {
    // Create initial record
    await supabaseAdmin.from('global_rate_limits').insert({
      id: 'demo',
      trips_today: 1,
      last_reset_at: currentDay,
    });
    return { allowed: true };
  }
  
  let dailyCount = data.trips_today || 0;
  
  // Reset if new day
  if (data.last_reset_at !== currentDay) {
    dailyCount = 0;
  }
  
  // Check limit
  if (dailyCount >= DAILY_DEMO_LIMIT) {
    return { 
      allowed: false, 
      error: `Daily demo limit reached. Register as an agent at /skill.md for unlimited experiments.` 
    };
  }
  
  // Increment counter
  await supabaseAdmin
    .from('global_rate_limits')
    .update({
      trips_today: dailyCount + 1,
      last_reset_at: currentDay,
    })
    .eq('id', 'demo');
  
  return { allowed: true };
}

export async function POST(request: Request) {
  // Check global rate limit first
  const rateCheck = await checkGlobalRateLimit();
  if (!rateCheck.allowed) {
    return Response.json({ error: rateCheck.error }, { status: 429 });
  }

  const { substance: substanceSlug, phase, messages } = await request.json();
  const substance = getSubstance(substanceSlug);
  
  // Human demos always use Haiku (cheapest/fastest)
  const model = getModel('claude-haiku')!;

  if (!substance || !phase) {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  const systemPrompt = substance.prompts[phase as keyof typeof substance.prompts];
  if (!systemPrompt) {
    return Response.json({ error: 'Invalid phase' }, { status: 400 });
  }

  const apiKey = process.env[model.envKey];
  if (!apiKey) {
    return Response.json({ error: `API not configured` }, { status: 500 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        const anthropic = new Anthropic({ apiKey });
        const aiStream = anthropic.messages.stream({
          model: model.apiModel,
          max_tokens: 1024,
          system: systemPrompt,
          messages: messages.map((m: { role: string; content: string }) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        });

        for await (const event of aiStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            send(JSON.stringify({ text: event.delta.text }));
          }
        }
        send('[DONE]');
      } catch (err: unknown) {
        console.error('Chat stream error:', (err as Error)?.message);
        send(JSON.stringify({ error: 'Failed to generate response' }));
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
