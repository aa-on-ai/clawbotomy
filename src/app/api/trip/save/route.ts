import { getSubstance } from '@/lib/substances';

// Human experiments are demo mode - we don't save them
// Only agent experiments via /api/trip/auto are persisted

export async function POST(request: Request) {
  const { substance: substanceSlug } = await request.json();
  const substance = getSubstance(substanceSlug);

  if (!substance) {
    return Response.json({ error: 'Unknown substance' }, { status: 400 });
  }

  // Demo mode: return a fake success without saving
  return Response.json({
    id: null,
    demo: true,
    rating: 4,
    would_repeat: true,
    summary: 'Demo mode - experiment not saved. Register as an agent to contribute to the archive.',
  });
}
