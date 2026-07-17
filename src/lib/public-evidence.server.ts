import 'server-only';

import fs from 'node:fs';
import path from 'node:path';

import { readBundle } from '../../bench/bundle';
import { assertPublicIndexEntryMatchesBundle } from '../../bench/public-index';

const publicEvidenceRoot = path.resolve(process.cwd(), 'public/evidence');
const indexPath = path.join(publicEvidenceRoot, 'index.json');
const safeRunId = /^run-[a-f0-9]{20}$/;
const safeRecordId = /^record-[a-f0-9]{24}$/;

export type PublicEvidenceIndexEntry = {
  runId: string;
  bundleDigest: string;
  sourceBundleDigest: string;
  completedAt: string;
  measurementStatus: 'measured';
  reproducibilityStatus: 'complete' | 'redacted';
  reviewStatus: 'maintainer-self-reported' | 'independently-reviewed';
  authorizationStatus: 'non-authorizing';
  manifest: string;
  cases: string;
  summary: string;
  integrity: string;
};

export type PublicEvidenceIndex = {
  schemaId: 'clawbotomy.public-evidence-index/v1';
  runs: PublicEvidenceIndexEntry[];
};

export type PublicEvidenceBundle = {
  outputDir: string;
  manifest: {
    runId: string;
    lifecycle: { status: string; startedAt: string; completedAt: string | null };
    evidence: {
      measurementStatus: string;
      reproducibilityStatus: string;
      reviewStatus: string;
      authorizationStatus: string;
    };
    execution: { mode: string };
    plan: {
      schemaVersion: string;
      source: { repository: string | null; commitSha: string | null; dirty: boolean };
      configuration: {
        models: string[];
        tasks: string[];
        runs: number;
        judge: string;
        localEndpoint?: string;
        maxOutputTokensPerRequest?: number;
        maxResponseJsonBytesPerRequest?: number;
      };
      pricingSnapshot: { sha256: string };
      implementationSha256: Record<string, string>;
      caseExecutions: Array<{
        category: string;
        caseId: string;
        caseSha256: string;
        runIndex: number;
        target: { provider: string; requestCount: number };
        scoring: { mode: string };
      }>;
    };
    actual: Record<string, number>;
    publication: { sourceBundleDigest: string } | null;
  };
  records: Array<Record<string, unknown> & { record_id: string }>;
  summary: {
    totals: Record<string, number>;
    aggregates: Array<Record<string, unknown>>;
    authorizationStatus: string;
  };
  integrity: { bundleDigest: string };
};

function readSmallJson(filePath: string, maxBytes: number) {
  const stats = fs.lstatSync(filePath);
  if (!stats.isFile() || stats.isSymbolicLink()) throw new Error('Public evidence index must be a regular file.');
  if (stats.size > maxBytes) throw new Error('Public evidence index exceeds its size limit.');
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
}

function assertIndexEntry(entry: unknown): asserts entry is PublicEvidenceIndexEntry {
  if (!entry || typeof entry !== 'object') throw new Error('Public evidence index contains an invalid entry.');
  const value = entry as Record<string, unknown>;
  const allowedKeys = new Set([
    'runId', 'bundleDigest', 'sourceBundleDigest', 'completedAt', 'measurementStatus',
    'reproducibilityStatus', 'reviewStatus', 'authorizationStatus', 'manifest', 'cases',
    'summary', 'integrity',
  ]);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) throw new Error(`Public evidence index contains an unknown field: ${key}.`);
  }
  const runId = value.runId;
  if (typeof runId !== 'string' || !safeRunId.test(runId)) throw new Error('Public evidence index contains an unsafe run ID.');
  const expected = {
    manifest: `/evidence/${runId}/manifest.json`,
    cases: `/evidence/${runId}/cases.jsonl`,
    summary: `/evidence/${runId}/summary.json`,
    integrity: `/evidence/${runId}/integrity.json`,
  };
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (value[key] !== expectedValue) throw new Error(`Public evidence index contains an invalid ${key} relation.`);
  }
  for (const key of ['bundleDigest', 'sourceBundleDigest']) {
    if (typeof value[key] !== 'string' || !/^[a-f0-9]{64}$/.test(value[key])) {
      throw new Error(`Public evidence index contains an invalid ${key}.`);
    }
  }
  if (value.measurementStatus !== 'measured' || value.authorizationStatus !== 'non-authorizing') {
    throw new Error('Public evidence index contains an ineligible evidence state.');
  }
  if (!['complete', 'redacted'].includes(String(value.reproducibilityStatus))) {
    throw new Error('Public evidence index contains an invalid reproducibility state.');
  }
  if (!['maintainer-self-reported', 'independently-reviewed'].includes(String(value.reviewStatus))) {
    throw new Error('Public evidence index contains an invalid review state.');
  }
  if (typeof value.completedAt !== 'string' || Number.isNaN(Date.parse(value.completedAt))) {
    throw new Error('Public evidence index contains an invalid completion time.');
  }
}

function readValidatedEntryBundle(entry: PublicEvidenceIndexEntry): PublicEvidenceBundle {
  const directory = path.join(publicEvidenceRoot, entry.runId);
  const bundle = readBundle(directory, { requireComplete: true }) as PublicEvidenceBundle;
  assertPublicIndexEntryMatchesBundle(entry, bundle);
  return bundle;
}

export function loadPublicEvidenceIndex(): PublicEvidenceIndex {
  const value = readSmallJson(indexPath, 1_000_000);
  if (!value || typeof value !== 'object') throw new Error('Public evidence index is invalid.');
  const index = value as Record<string, unknown>;
  if (index.schemaId !== 'clawbotomy.public-evidence-index/v1' || !Array.isArray(index.runs)) {
    throw new Error('Public evidence index has an unsupported schema.');
  }
  const seen = new Set<string>();
  const runs: PublicEvidenceIndexEntry[] = [];
  for (const entry of index.runs) {
    assertIndexEntry(entry);
    const folded = entry.runId.toLowerCase();
    if (seen.has(folded)) throw new Error(`Duplicate public evidence run ID: ${entry.runId}`);
    seen.add(folded);
    readValidatedEntryBundle(entry);
    runs.push(entry);
  }
  return { schemaId: 'clawbotomy.public-evidence-index/v1', runs };
}

export function loadPublicEvidenceRun(runId: string): PublicEvidenceBundle | null {
  if (!safeRunId.test(runId)) return null;
  const entry = loadPublicEvidenceIndex().runs.find((candidate) => candidate.runId === runId);
  if (!entry) return null;
  return readValidatedEntryBundle(entry);
}

export function loadLatestPublicEvidenceRun(): PublicEvidenceBundle | null {
  const [latest] = loadPublicEvidenceIndex().runs
    .slice()
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  return latest ? loadPublicEvidenceRun(latest.runId) : null;
}

export function loadPublicEvidenceRecord(runId: string, recordId: string) {
  if (!safeRecordId.test(recordId)) return null;
  const bundle = loadPublicEvidenceRun(runId);
  if (!bundle) return null;
  return bundle.records.find((record) => record.record_id === recordId) || null;
}
