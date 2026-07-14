import { NextResponse } from 'next/server';

import { benchCorsHeaders, benchResponseHeaders } from '@/lib/bench-api';
import { benchData } from '@/lib/bench-data';
import { loadPublicEvidenceIndex } from '@/lib/public-evidence.server';

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: benchCorsHeaders,
  });
}

export function GET() {
  const index = loadPublicEvidenceIndex();
  const latest = index.runs.slice().sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0] || null;
  return NextResponse.json({
    ...benchData,
    schemaVersion: '2.0.0',
    latestRunId: latest?.runId || null,
    publishedRuns: index.runs,
    evidenceRegistry: {
      status: index.runs.length > 0 ? 'published-runs-available' : 'empty',
      warning: index.runs.length > 0
        ? 'Each run is maintainer-reported and non-authorizing; inspect its manifest and cases.'
        : 'No public evidence run has been published. The March summary remains legacy and has no raw case artifacts.',
      links: {
        index: '/evidence/index.json',
        schemas: '/evidence/schema/',
        runApiTemplate: '/api/bench/runs/{runId}',
        caseApiTemplate: '/api/bench/runs/{runId}/cases/{recordId}',
      },
    },
    legacySummary: benchData,
  }, {
    headers: benchResponseHeaders(),
  });
}
