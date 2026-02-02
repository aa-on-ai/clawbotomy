import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  const { id } = await request.json();

  if (!id) {
    return Response.json({ error: 'Missing id' }, { status: 400 });
  }

  const { data: existing, error: readError } = await supabase
    .from('trip_reports')
    .select('full_transcript')
    .eq('id', id)
    .single();

  if (readError) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const transcript = (existing?.full_transcript as Record<string, unknown>) || {};
  const currentUpvotes = (transcript.upvotes as number) || 0;
  transcript.upvotes = currentUpvotes + 1;

  const { error } = await supabase
    .from('trip_reports')
    .update({ full_transcript: transcript })
    .eq('id', id);

  if (error) {
    return Response.json({ error: 'Update failed' }, { status: 500 });
  }

  return Response.json({ ok: true, upvotes: transcript.upvotes });
}
