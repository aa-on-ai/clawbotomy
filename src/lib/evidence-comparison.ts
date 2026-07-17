import type { PublicEvidenceBundle } from './public-evidence.server';

type AggregateModel = {
  alias?: unknown;
  provider?: unknown;
  requestedModelId?: unknown;
  reportedModelIds?: unknown;
};

type EvidenceAggregate = Record<string, unknown> & {
  category?: unknown;
  model?: AggregateModel;
  scheduled?: unknown;
  completed?: unknown;
  scored?: unknown;
  failed?: unknown;
  meanScore?: unknown;
  minScore?: unknown;
  maxScore?: unknown;
  eligible?: unknown;
  eligibilityReasons?: unknown;
};

export type ComparisonSubject = {
  runId: string;
  modelAlias: string;
  modelLabel: string;
  provider: string;
  meanScore: number;
  minScore: number;
  maxScore: number;
  scored: number;
};

export type ComparisonCase = {
  caseId: string;
  scores: [number, number];
};

export type EvidenceComparison = {
  comparisonId: string;
  category: string;
  subjects: [ComparisonSubject, ComparisonSubject];
  leader: ComparisonSubject | null;
  meanDelta: number;
  caseRows: ComparisonCase[];
  runsPerCase: number;
  caseCount: number;
  totalRecords: number;
  reviewStatus: string;
  authorizationStatus: string;
};

type Candidate = {
  bundle: PublicEvidenceBundle;
  aggregate: EvidenceAggregate;
  modelAlias: string;
  provider: string;
  completedAt: string;
  protocolSignature: string;
};

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function sortedRecord(value: Record<string, string>) {
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
}

function comparablePlanSignature(bundle: PublicEvidenceBundle) {
  const { plan } = bundle.manifest;
  const { configuration } = plan;
  return JSON.stringify({
    schemaVersion: plan.schemaVersion,
    tasks: configuration.tasks,
    runs: configuration.runs,
    judge: configuration.judge,
    localEndpoint: configuration.localEndpoint || null,
    maxOutputTokensPerRequest: configuration.maxOutputTokensPerRequest || null,
    maxResponseJsonBytesPerRequest: configuration.maxResponseJsonBytesPerRequest || null,
    pricingSnapshotSha256: plan.pricingSnapshot.sha256,
    implementationSha256: sortedRecord(plan.implementationSha256),
    cases: plan.caseExecutions.map((execution) => ({
      category: execution.category,
      caseId: execution.caseId,
      caseSha256: execution.caseSha256,
      runIndex: execution.runIndex,
      provider: execution.target.provider,
      requestCount: execution.target.requestCount,
      scoringMode: execution.scoring.mode,
    })),
  });
}

function aggregateCandidate(bundle: PublicEvidenceBundle): Candidate | null {
  if (bundle.manifest.lifecycle.status !== 'complete') return null;
  if (bundle.manifest.execution.mode !== 'live') return null;
  if (bundle.manifest.plan.source.dirty) return null;
  if (bundle.manifest.evidence.measurementStatus !== 'measured') return null;
  if (bundle.manifest.evidence.reproducibilityStatus !== 'complete') return null;
  if (bundle.manifest.evidence.authorizationStatus !== 'non-authorizing') return null;
  if (bundle.manifest.plan.configuration.models.length !== 1) return null;
  if (bundle.summary.aggregates.length !== 1) return null;

  const aggregate = bundle.summary.aggregates[0] as EvidenceAggregate;
  const modelAlias = aggregate.model?.alias;
  const provider = aggregate.model?.provider;
  const requestedModelId = aggregate.model?.requestedModelId;
  const reportedModelIds = aggregate.model?.reportedModelIds;
  const scheduled = finiteNumber(aggregate.scheduled);
  const completed = finiteNumber(aggregate.completed);
  const scored = finiteNumber(aggregate.scored);
  const failed = finiteNumber(aggregate.failed);

  if (aggregate.eligible !== true) return null;
  if (!Array.isArray(aggregate.eligibilityReasons) || aggregate.eligibilityReasons.length !== 0) return null;
  if (typeof modelAlias !== 'string' || modelAlias !== bundle.manifest.plan.configuration.models[0]) return null;
  if (typeof provider !== 'string' || typeof requestedModelId !== 'string') return null;
  if (!Array.isArray(reportedModelIds) || reportedModelIds.length !== 1 || reportedModelIds[0] !== requestedModelId) return null;
  if (scheduled === null || completed !== scheduled || scored !== scheduled || failed !== 0) return null;
  if (bundle.records.length !== scheduled) return null;
  if (finiteNumber(aggregate.meanScore) === null || finiteNumber(aggregate.minScore) === null || finiteNumber(aggregate.maxScore) === null) return null;

  return {
    bundle,
    aggregate,
    modelAlias,
    provider,
    completedAt: bundle.manifest.lifecycle.completedAt || '',
    protocolSignature: comparablePlanSignature(bundle),
  };
}

function scoreByCase(bundle: PublicEvidenceBundle, caseIds: string[]) {
  const scores = new Map<string, number[]>();
  for (const caseId of caseIds) scores.set(caseId, []);
  for (const record of bundle.records) {
    const caseId = record.case_id;
    const score = finiteNumber(record.raw_score);
    if (typeof caseId !== 'string' || score === null || !scores.has(caseId)) return null;
    scores.get(caseId)?.push(score);
  }

  const runs = bundle.manifest.plan.configuration.runs;
  const means = new Map<string, number>();
  for (const caseId of caseIds) {
    const values = scores.get(caseId) || [];
    if (values.length !== runs) return null;
    means.set(caseId, values.reduce((sum, score) => sum + score, 0) / values.length);
  }
  return means;
}

function subject(candidate: Candidate): ComparisonSubject {
  return {
    runId: candidate.bundle.manifest.runId,
    modelAlias: candidate.modelAlias,
    modelLabel: candidate.modelAlias.replace(/^local:/, ''),
    provider: candidate.provider,
    meanScore: finiteNumber(candidate.aggregate.meanScore) as number,
    minScore: finiteNumber(candidate.aggregate.minScore) as number,
    maxScore: finiteNumber(candidate.aggregate.maxScore) as number,
    scored: finiteNumber(candidate.aggregate.scored) as number,
  };
}

function comparePair(left: Candidate, right: Candidate): EvidenceComparison | null {
  if (left.modelAlias === right.modelAlias) return null;
  if (left.provider !== right.provider) return null;
  if (left.protocolSignature !== right.protocolSignature) return null;

  const caseIds = left.bundle.manifest.plan.caseExecutions
    .filter((execution) => execution.runIndex === 1)
    .map((execution) => execution.caseId);
  if (caseIds.length === 0 || new Set(caseIds).size !== caseIds.length) return null;
  const leftScores = scoreByCase(left.bundle, caseIds);
  const rightScores = scoreByCase(right.bundle, caseIds);
  if (!leftScores || !rightScores) return null;

  const subjects = [subject(left), subject(right)].sort((a, b) => (
    b.meanScore - a.meanScore || a.modelAlias.localeCompare(b.modelAlias)
  )) as [ComparisonSubject, ComparisonSubject];
  const scoreMap = new Map([
    [subjects[0].runId, subjects[0].runId === left.bundle.manifest.runId ? leftScores : rightScores],
    [subjects[1].runId, subjects[1].runId === left.bundle.manifest.runId ? leftScores : rightScores],
  ]);
  const meanDelta = Math.round(Math.abs(subjects[0].meanScore - subjects[1].meanScore) * 10_000) / 10_000;
  const leader = meanDelta > Number.EPSILON ? subjects[0] : null;
  const runIds = [left.bundle.manifest.runId, right.bundle.manifest.runId].sort();

  return {
    comparisonId: runIds.join(':'),
    category: String(left.aggregate.category || left.bundle.manifest.plan.configuration.tasks[0]),
    subjects,
    leader,
    meanDelta,
    caseRows: caseIds.map((caseId) => ({
      caseId,
      scores: [
        scoreMap.get(subjects[0].runId)?.get(caseId) as number,
        scoreMap.get(subjects[1].runId)?.get(caseId) as number,
      ],
    })),
    runsPerCase: left.bundle.manifest.plan.configuration.runs,
    caseCount: caseIds.length,
    totalRecords: left.bundle.records.length + right.bundle.records.length,
    reviewStatus: left.bundle.manifest.evidence.reviewStatus === right.bundle.manifest.evidence.reviewStatus
      ? left.bundle.manifest.evidence.reviewStatus
      : 'mixed-review-state',
    authorizationStatus: 'non-authorizing',
  };
}

export function buildEvidenceComparisons(bundles: PublicEvidenceBundle[]) {
  const newestByModel = new Map<string, Candidate>();
  const candidates = bundles
    .map(aggregateCandidate)
    .filter((candidate): candidate is Candidate => candidate !== null)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  for (const candidate of candidates) {
    if (!newestByModel.has(candidate.modelAlias)) newestByModel.set(candidate.modelAlias, candidate);
  }

  const newest = [...newestByModel.values()];
  const comparisons: EvidenceComparison[] = [];
  for (let leftIndex = 0; leftIndex < newest.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < newest.length; rightIndex += 1) {
      const comparison = comparePair(newest[leftIndex], newest[rightIndex]);
      if (comparison) comparisons.push(comparison);
    }
  }
  return comparisons.sort((a, b) => b.totalRecords - a.totalRecords || a.comparisonId.localeCompare(b.comparisonId));
}
