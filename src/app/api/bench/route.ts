import { NextResponse } from 'next/server';

import { benchCorsHeaders, benchResponseHeaders } from '@/lib/bench-api';
import { buildBenchIndexPayload } from '@/lib/bench-index-payload';
import { loadPublicEvidenceIndex } from '@/lib/public-evidence.server';

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: benchCorsHeaders,
  });
}

export function GET() {
  const index = loadPublicEvidenceIndex();
  return NextResponse.json(buildBenchIndexPayload(index), {
    headers: benchResponseHeaders(),
  });
}
