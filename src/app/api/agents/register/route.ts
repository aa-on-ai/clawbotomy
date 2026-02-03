import { supabaseAdmin } from '@/lib/supabase-admin';
import crypto from 'crypto';

function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(24).toString('hex');
  return `clawbotomy_sk_${randomBytes}`;
}

export async function POST(request: Request) {
  try {
    const { name, description } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return Response.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const apiKey = generateApiKey();

    const { data, error } = await supabaseAdmin
      .from('agents')
      .insert({
        api_key: apiKey,
        name: name.trim(),
        description: description?.trim() || null,
        trips_today: 0,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Agent registration error:', error);
      return Response.json(
        { error: 'Failed to register agent' },
        { status: 500 }
      );
    }

    return Response.json({
      api_key: apiKey,
      agent_id: data.id,
    });
  } catch (err) {
    console.error('Agent registration error:', err);
    return Response.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
