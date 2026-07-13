const fs = require('node:fs');
const path = require('node:path');

const {
  deriveSummary,
  materializeBundle,
  planDigest,
  readBundle,
} = require('./bundle');
const { canonicalStringify } = require('./canonical');
const { redactForPublic, residualSecretClasses } = require('./redaction');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function writePublicIndex(indexPath, index) {
  const directory = path.dirname(indexPath);
  const temp = path.join(directory, `.index.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(temp, `${JSON.stringify(index, null, 2)}\n`, { flag: 'wx', mode: 0o644 });
  fs.renameSync(temp, indexPath);
}

function exportPublicBundle({
  sourceDir,
  confirmBundleDigest,
  repoRoot = process.cwd(),
  exportedAt = new Date().toISOString(),
}) {
  const source = readBundle(sourceDir, { requireComplete: true });
  if (source.manifest.execution?.mode !== 'live' || source.manifest.evidence?.measurementStatus !== 'measured') {
    throw new Error('Only a completed live measurement bundle can be exported publicly.');
  }
  if (source.records.some((record) => record.target_requests.some((request) => request.synthetic))) {
    throw new Error('Synthetic request evidence cannot be exported publicly.');
  }
  if (confirmBundleDigest !== source.integrity.bundleDigest) {
    throw new Error('Public export requires --confirm-public with the exact private bundle digest.');
  }
  if (source.manifest.plan.source?.dirty || !/^[a-f0-9]{40}$/.test(source.manifest.plan.source?.commitSha || '')) {
    throw new Error('Public export requires a clean, committed source state.');
  }

  const publicRoot = path.resolve(repoRoot, 'public/evidence');
  const expectedRoot = path.resolve(repoRoot, 'public/evidence');
  if (publicRoot !== expectedRoot) throw new Error('Public evidence root is invalid.');
  const publicRunId = `run-${source.integrity.bundleDigest.slice(0, 20)}`;
  const outputDir = path.join(publicRoot, publicRunId);

  const sourcePlanDigest = source.manifest.plan.planDigest;
  const privatePayload = {
    manifest: clone(source.manifest),
    records: clone(source.records),
  };
  privatePayload.manifest.plan.configuration.bundlePath = '[REDACTED_LOCAL_PATH]';
  const { redacted, audit } = redactForPublic(privatePayload);
  audit.push({
    pointer: '/manifest/plan/configuration/bundlePath',
    classification: 'local-path',
    count: 1,
  });
  audit.sort((a, b) => `${a.pointer}:${a.classification}`.localeCompare(`${b.pointer}:${b.classification}`));

  const manifest = redacted.manifest;
  const records = redacted.records;
  manifest.runId = publicRunId;
  manifest.plan.planDigest = planDigest(manifest.plan);
  const scoreBearingRedaction = audit.some((entry) => entry.pointer.startsWith('/records/'));
  manifest.evidence.reproducibilityStatus = scoreBearingRedaction ? 'redacted' : 'complete';
  manifest.evidence.reviewStatus = 'maintainer-self-reported';
  manifest.evidence.authorizationStatus = 'non-authorizing';
  manifest.publication = {
    policy: 'public-v1',
    exportedAt,
    sourceRunId: source.manifest.runId,
    sourceBundleDigest: source.integrity.bundleDigest,
    sourcePlanDigest,
    redactionAudit: audit,
  };
  const summary = deriveSummary(manifest.plan, records, {
    executionMode: 'live',
    reproducibilityStatus: manifest.evidence.reproducibilityStatus,
  });

  const residual = residualSecretClasses({ manifest, records, summary });
  if (residual.length > 0) throw new Error(`Public export still contains secret candidates: ${residual.join(', ')}.`);
  if (canonicalStringify(audit).includes(source.integrity.bundleDigest)) {
    throw new Error('Redaction audit must not contain reversible source values.');
  }

  fs.mkdirSync(publicRoot, { recursive: true, mode: 0o755 });
  const exported = materializeBundle({
    outputDir,
    manifest,
    records,
    summary,
    directoryMode: 0o755,
    fileMode: 0o644,
  });
  readBundle(outputDir, { requireComplete: true });

  const indexPath = path.join(publicRoot, 'index.json');
  const index = fs.existsSync(indexPath)
    ? JSON.parse(fs.readFileSync(indexPath, 'utf8'))
    : { schemaId: 'clawbotomy.public-evidence-index/v1', runs: [] };
  if (index.schemaId !== 'clawbotomy.public-evidence-index/v1' || !Array.isArray(index.runs)) {
    throw new Error('Public evidence index has an unsupported schema.');
  }
  if (index.runs.some((entry) => entry.runId === publicRunId)) throw new Error(`Public run is already indexed: ${publicRunId}`);
  index.runs.push({
    runId: publicRunId,
    bundleDigest: exported.integrity.bundleDigest,
    sourceBundleDigest: source.integrity.bundleDigest,
    completedAt: manifest.lifecycle.completedAt,
    measurementStatus: manifest.evidence.measurementStatus,
    reproducibilityStatus: manifest.evidence.reproducibilityStatus,
    reviewStatus: manifest.evidence.reviewStatus,
    authorizationStatus: manifest.evidence.authorizationStatus,
    manifest: `/evidence/${publicRunId}/manifest.json`,
    cases: `/evidence/${publicRunId}/cases.jsonl`,
    summary: `/evidence/${publicRunId}/summary.json`,
    integrity: `/evidence/${publicRunId}/integrity.json`,
  });
  index.runs.sort((a, b) => a.runId.localeCompare(b.runId));
  writePublicIndex(indexPath, index);

  return { ...exported, index };
}

module.exports = { exportPublicBundle };
