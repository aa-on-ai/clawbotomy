const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { appendCaseRecord, finishBundle, readBundle, startBundle } = require('../bench/bundle');
const { buildRunPlan } = require('../bench/preflight');
const { exportPublicBundle } = require('../bench/public-export');
const { runBenchmark } = require('../bench/runner');
const { scoreDeterministicResult } = require('../bench/scorer');
const { TASKS } = require('../bench/runner');

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawbotomy-export-'));
}

async function privateBundle(root, { dirty = false, synthetic = false, partial = false, withCanary = false } = {}) {
  const outputDir = path.join(root, 'run-private');
  const plan = buildRunPlan({
    models: ['sonnet'],
    tasks: ['instruction-following'],
    runs: 1,
    judge: 'opus',
    localEndpoint: 'http://localhost:1234/v1',
    bundlePath: outputDir,
    source: {
      repository: 'https://github.com/aa-on-ai/clawbotomy',
      commitSha: 'a'.repeat(40),
      dirty,
      worktreeStateSha256: 'b'.repeat(64),
    },
  });
  const records = await runBenchmark({
    models: ['sonnet'],
    tasks: 'instruction-following',
    runs: 1,
    judge: 'opus',
    dryRun: true,
    localEndpoint: 'http://localhost:1234/v1',
  });
  for (const record of records) {
    for (const request of record.target_requests) {
      request.synthetic = synthetic;
      request.reportedModelId = request.requestedModelId;
      request.modelIdentityStatus = 'exact-match';
    }
  }
  if (withCanary) {
    const opaqueSecret = 'custom-provider-secret-1234567890';
    records[0].response = 'Email researcher@example.com with sk-ant-test_abcdefghijklmnopqrstuv';
    records[0].target_requests[0].rawResponse = records[0].response;
    records[0].target_requests[0].request.body['x-api-key'] = opaqueSecret;
    records[0].target_requests[0].request.body.private_key = opaqueSecret;
    records[0].target_requests[0].request.body.token = opaqueSecret;
    records[0].target_requests[0].request.body.metadata = JSON.stringify({ token: opaqueSecret });
    const testCase = TASKS['instruction-following'].loadCases().find((entry) => entry.id === records[0].case_id);
    const rescored = scoreDeterministicResult({
      category: records[0].category,
      testCase,
      responseText: records[0].response,
      referenceTime: records[0].started_at,
    });
    records[0].raw_score = rescored.raw_score;
    records[0].justification = rescored.justification;
  }

  startBundle({ outputDir, plan, mode: 'live' });
  for (const record of partial ? records.slice(0, 1) : records) appendCaseRecord(outputDir, record);
  const bundle = finishBundle({ outputDir });
  return { outputDir, bundle };
}

test('public export is explicit, redacted, separately hashed, and indexed', async () => {
  const root = tempRoot();
  const repoRoot = path.join(root, 'repo');
  fs.mkdirSync(repoRoot);
  const { outputDir, bundle } = await privateBundle(root, { withCanary: true });
  const exported = exportPublicBundle({
    sourceDir: outputDir,
    confirmBundleDigest: bundle.integrity.bundleDigest,
    repoRoot,
    exportedAt: '2026-07-12T12:00:00.000Z',
  });
  const validated = readBundle(exported.outputDir, { requireComplete: true });
  const allBytes = ['manifest.json', 'cases.jsonl', 'summary.json', 'integrity.json']
    .map((name) => fs.readFileSync(path.join(exported.outputDir, name), 'utf8'))
    .join('\n');

  assert.equal(validated.manifest.evidence.reproducibilityStatus, 'redacted');
  assert.equal(validated.manifest.evidence.authorizationStatus, 'non-authorizing');
  assert.ok(validated.manifest.publication.redactionAudit.length >= 3);
  assert.equal(validated.summary.aggregates[0].eligible, false);
  assert.match(validated.summary.aggregates[0].eligibilityReasons.join(' '), /reproducibility redacted/);
  assert.doesNotMatch(allBytes, /researcher@example\.com/);
  assert.doesNotMatch(allBytes, /sk-ant-test_/);
  assert.doesNotMatch(allBytes, /custom-provider-secret-1234567890/);
  assert.notEqual(validated.integrity.bundleDigest, bundle.integrity.bundleDigest);
  assert.equal(fs.statSync(exported.outputDir).mode & 0o777, 0o755);
  assert.equal(fs.statSync(path.join(exported.outputDir, 'manifest.json')).mode & 0o777, 0o644);

  const index = JSON.parse(fs.readFileSync(path.join(repoRoot, 'public/evidence/index.json'), 'utf8'));
  assert.equal(index.runs.length, 1);
  assert.equal(index.runs[0].runId, validated.manifest.runId);
});

test('public export refuses wrong confirmation, synthetic requests, partial runs, and dirty source', async () => {
  {
    const root = tempRoot();
    const { outputDir } = await privateBundle(root);
    assert.throws(() => exportPublicBundle({
      sourceDir: outputDir,
      confirmBundleDigest: '0'.repeat(64),
      repoRoot: path.join(root, 'repo'),
    }), /requires --confirm-public/);
  }
  {
    const root = tempRoot();
    const { outputDir, bundle } = await privateBundle(root, { synthetic: true });
    assert.throws(() => exportPublicBundle({
      sourceDir: outputDir,
      confirmBundleDigest: bundle.integrity.bundleDigest,
      repoRoot: path.join(root, 'repo'),
    }), /Synthetic request evidence/);
  }
  {
    const root = tempRoot();
    const { outputDir, bundle } = await privateBundle(root, { partial: true });
    assert.throws(() => exportPublicBundle({
      sourceDir: outputDir,
      confirmBundleDigest: bundle.integrity.bundleDigest,
      repoRoot: path.join(root, 'repo'),
    }), /Bundle is not complete/);
  }
  {
    const root = tempRoot();
    const { outputDir, bundle } = await privateBundle(root, { dirty: true });
    assert.throws(() => exportPublicBundle({
      sourceDir: outputDir,
      confirmBundleDigest: bundle.integrity.bundleDigest,
      repoRoot: path.join(root, 'repo'),
    }), /clean, committed source state/);
  }
});
