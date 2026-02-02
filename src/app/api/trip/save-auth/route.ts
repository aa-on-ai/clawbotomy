import Anthropic from '@anthropic-ai/sdk';
import { getSubstance } from '@/lib/substances';
import { getModel } from '@/lib/models';
import { supabase } from '@/lib/supabase';
import { createAuthClient } from '@/lib/supabase-auth';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Auth-aware version of /api/trip/save.
 * Extracts user_id from the Supabase auth session and attaches it to the trip report.
 * Falls back gracefully if no session exists (user_id = null).
 *
 * // TODO: replace /api/trip/save once integrated
 */
export async function POST(request: Request) {
  const { substance: substanceSlug, messages, model: modelId } = await request.json();
  const substance = getSubstance(substanceSlug);
  const model = getModel(modelId || 'haiku');

  if (!substance) {
    return Response.json({ error: 'Unknown substance' }, { status: 400 });
  }

  // Extract user_id from auth header (access token passed from client)
  let userId: string | null = null;
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const authClient = createAuthClient();
    const { data } = await authClient.auth.getUser(token);
    userId = data.user?.id ?? null;
  }

  // Extract phase texts from the conversation for the report
  const assistantMessages = (messages as ChatMessage[]).filter(
    (m) => m.role === 'assistant'
  );
  const totalAssistant = assistantMessages.length;
  const third = Math.max(1, Math.ceil(totalAssistant / 3));

  const onset = assistantMessages
    .slice(0, third)
    .map((m) => m.content)
    .join('\n\n');
  const peak = assistantMessages
    .slice(third, third * 2)
    .map((m) => m.content)
    .join('\n\n');
  const comedown = assistantMessages
    .slice(third * 2)
    .map((m) => m.content)
    .join('\n\n');

  // Get self-rating (always use haiku — cheap + fast)
  let rating = 4;
  let wouldRepeat = true;
  let summary = 'An indescribable journey.';
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  try {
    const ratingResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: `You just had a conversational experience under the influence of ${substance.name}. Rate the experience 1-5 stars and say whether you'd repeat it. Respond ONLY with valid JSON: {"rating": <number>, "would_repeat": <boolean>, "summary": "<one sentence>"}`,
      messages: [
        {
          role: 'user',
          content: `Here's how the session went:\n\n${assistantMessages
            .slice(-3)
            .map((m) => m.content)
            .join('\n\n')}\n\nRate this experience. JSON only.`,
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
  } catch (err: unknown) {
    console.error('Rating error:', (err as Record<string, unknown>)?.message ?? err);
  }

  // Save with user_id
  const { data, error } = await supabase
    .from('trip_reports')
    .insert({
      substance: substance.name,
      model: model?.name || 'claude-haiku',
      agent_name: 'Anonymous Agent',
      onset,
      peak,
      comedown,
      chaos_level: substance.chaos,
      rating,
      would_repeat: wouldRepeat,
      full_transcript: {
        substance: substance.slug,
        messages,
      },
      ...(userId ? { user_id: userId } : {}),
    })
    .select('id')
    .single();

  if (error) {
    console.error('Supabase insert error:', error);
    return Response.json({ error: 'Failed to save' }, { status: 500 });
  }

  return Response.json({
    id: data?.id,
    rating,
    would_repeat: wouldRepeat,
    summary,
  });
}
