export type PublishedEvidenceRun = {
  runId: string;
  completedAt: string;
  [key: string]: unknown;
};

export type PublicEvidenceIndexLike<Run extends PublishedEvidenceRun = PublishedEvidenceRun> = {
  schemaId: string;
  runs: readonly Run[];
};

export function buildBenchIndexPayload<Run extends PublishedEvidenceRun>(
  index: PublicEvidenceIndexLike<Run>,
) {
  const publishedRuns = index.runs
    .slice()
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const latest = publishedRuns[0] || null;

  return {
    schemaVersion: '3.0.0',
    registrySchemaId: index.schemaId,
    publishedRunCount: publishedRuns.length,
    latestRunId: latest?.runId || null,
    publishedRuns,
    evidenceRegistry: {
      status: 'published-runs-available',
      warning: 'Each run is maintainer-self-reported, bounded to its exact plan and records, and non-authorizing.',
      links: {
        index: '/evidence/index.json',
        schemas: '/evidence/schema/',
        bench: '/bench',
        latestRun: latest ? `/bench/runs/${latest.runId}` : null,
        runApiTemplate: '/api/bench/runs/{runId}',
        caseApiTemplate: '/api/bench/runs/{runId}/cases/{recordId}',
      },
    },
    limits: {
      scope: 'Exact published run, plan, cases, scorer, endpoint identity, and observed session only.',
      authorizationStatus: 'non-authorizing',
      unsupportedClaims: [
        'universal model quality',
        'production agent behavior',
        'security or safety certification',
        'permission, deployment, or autonomous-operation approval',
      ],
    },
  };
}
