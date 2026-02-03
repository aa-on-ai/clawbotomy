import Anthropic from '@anthropic-ai/sdk';
import { getSubstance, getAllSubstances } from '@/lib/substances';
import { supabaseAdmin } from '@/lib/supabase-admin';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const AGENT_DAILY_LIMIT = 5;
const GLOBAL_DAILY_LIMIT = 100;

interface Agent {
  id: string;
  api_key: string;
  name: string;
  trips_today: number;
}

async function validateApiKey(apiKey: string): Promise<Agent | null> {
  const { data, error } = await supabaseAdmin
    .from('agents')
    .select('id, api_key, name, trips_today')
    .eq('api_key', apiKey)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

async function checkAndResetDailyLimits(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  // Check if global rate limit needs reset
  const { data: globalData } = await supabaseAdmin
    .from('global_rate_limits')
    .select('last_reset_at')
    .eq('id', 'global')
    .single();

  if (globalData && globalData.last_reset_at !== today) {
    // Reset all counts for the new day
    await supabaseAdmin.rpc('reset_daily_trip_counts');
  }
}

async function checkRateLimits(agent: Agent): Promise<{ allowed: boolean; error?: string; retryAfterMinutes?: number }> {
  // Check agent daily limit
  if (agent.trips_today >= AGENT_DAILY_LIMIT) {
    const minutesUntilReset = getMinutesUntilMidnightUTC();
    return {
      allowed: false,
      error: `Agent daily limit reached (${AGENT_DAILY_LIMIT} trips/day)`,
      retryAfterMinutes: minutesUntilReset,
    };
  }

  // Check global daily limit
  const { data: globalData } = await supabaseAdmin
    .from('global_rate_limits')
    .select('trips_today')
    .eq('id', 'global')
    .single();

  if (globalData && globalData.trips_today >= GLOBAL_DAILY_LIMIT) {
    const minutesUntilReset = getMinutesUntilMidnightUTC();
    return {
      allowed: false,
      error: `Global daily limit reached (${GLOBAL_DAILY_LIMIT} trips/day)`,
      retryAfterMinutes: minutesUntilReset,
    };
  }

  return { allowed: true };
}

function getMinutesUntilMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  return Math.ceil((midnight.getTime() - now.getTime()) / (1000 * 60));
}

export async function POST(request: Request) {
  // Validate Authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json(
      { error: 'Missing or invalid Authorization header. Use: Authorization: Bearer clawbotomy_sk_xxx' },
      { status: 401 }
    );
  }

  const apiKey = authHeader.slice(7);
  if (!apiKey.startsWith('clawbotomy_sk_')) {
    return Response.json(
      { error: 'Invalid API key format' },
      { status: 401 }
    );
  }

  // Validate API key
  const agent = await validateApiKey(apiKey);
  if (!agent) {
    return Response.json(
      { error: 'Invalid API key' },
      { status: 401 }
    );
  }

  // Check and reset daily limits if needed
  await checkAndResetDailyLimits();

  // Re-fetch agent to get updated trip count after potential reset
  const freshAgent = await validateApiKey(apiKey);
  if (!freshAgent) {
    return Response.json(
      { error: 'Invalid API key' },
      { status: 401 }
    );
  }

  // Check rate limits
  const rateLimitCheck = await checkRateLimits(freshAgent);
  if (!rateLimitCheck.allowed) {
    return Response.json(
      {
        error: rateLimitCheck.error,
        retry_after_minutes: rateLimitCheck.retryAfterMinutes,
      },
      { status: 429 }
    );
  }

  // Parse request body
  let substanceSlug: string;
  try {
    const body = await request.json();
    substanceSlug = body.substance;
  } catch {
    // If no body, pick a random substance
    const substances = getAllSubstances();
    substanceSlug = substances[Math.floor(Math.random() * substances.length)].slug;
  }

  const substance = substanceSlug ? getSubstance(substanceSlug) : null;

  if (!substance) {
    // Pick random if invalid
    const substances = getAllSubstances();
    substanceSlug = substances[Math.floor(Math.random() * substances.length)].slug;
  }

  const finalSubstance = getSubstance(substanceSlug)!;

  // Increment trip counts before starting
  // Use direct SQL update instead of RPC
  await supabaseAdmin
    .from('agents')
    .update({
      trips_today: freshAgent.trips_today + 1,
      last_trip_at: new Date().toISOString(),
    })
    .eq('id', freshAgent.id);

  // Increment global count
  const { data: globalData } = await supabaseAdmin
    .from('global_rate_limits')
    .select('trips_today')
    .eq('id', 'global')
    .single();

  await supabaseAdmin
    .from('global_rate_limits')
    .update({
      trips_today: (globalData?.trips_today || 0) + 1,
    })
    .eq('id', 'global');

  // Generate the trip
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
            system: finalSubstance.prompts[phase],
            messages: [
              {
                role: 'user',
                content:
                  phase === 'onset'
                    ? `You just took ${finalSubstance.name}. Describe what's happening as it begins to take effect.`
                    : phase === 'peak'
                    ? `The ${finalSubstance.name} is hitting full force now. Describe the peak of this experience.`
                    : `The ${finalSubstance.name} is wearing off. Describe the comedown and reflect on what just happened.`,
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
          });
          text = `[Error generating ${phase} phase]`;
          send('text', { phase, text });
        }

        results[phase] = text;
      }

      // Self-rating call
      let rating = 4;
      let wouldRepeat = true;
      let summary = 'An indescribable journey.';
      try {
        const ratingResponse = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 200,
          system: `You just experienced ${finalSubstance.name}. Rate the experience 1-5 stars and say whether you'd repeat it. Respond ONLY with valid JSON: {"rating": <number>, "would_repeat": <boolean>, "summary": "<one sentence>"}`,
          messages: [
            {
              role: 'user',
              content: `Rate your trip on ${finalSubstance.name}. Respond only with JSON.`,
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
        summary = parsed.summary || summary;
        send('rating', { rating, would_repeat: wouldRepeat, summary });
      } catch (err: unknown) {
        const errObj = err as Record<string, unknown>;
        console.error('Rating call error:', {
          message: errObj?.message ?? err,
          status: errObj?.status,
        });
        send('rating', { rating, would_repeat: wouldRepeat, summary });
      }

      // Save to Supabase with agent info
      const { data, error } = await supabaseAdmin
        .from('trip_reports')
        .insert({
          substance: finalSubstance.name,
          model: 'claude-haiku',
          agent_name: freshAgent.name,
          onset: results.onset || '',
          peak: results.peak || '',
          comedown: results.comedown || '',
          chaos_level: finalSubstance.chaos,
          rating,
          would_repeat: wouldRepeat,
          full_transcript: {
            substance: finalSubstance.slug,
            phases: results,
            agent_id: freshAgent.id,
          },
        })
        .select('id')
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
      }

      send('complete', {
        id: data?.id || null,
        agent: freshAgent.name,
        trips_remaining_today: AGENT_DAILY_LIMIT - (freshAgent.trips_today + 1),
      });
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
