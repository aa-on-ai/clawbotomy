const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  appendCaseRecord,
  deriveSummary,
  finishBundle,
  readBundle,
  readPlanFile,
  startBundle,
  writePlanFile,
} = require('../bench/bundle');
const { sha256 } = require('../bench/canonical');
const { buildRunPlan } = require('../bench/preflight');
const { runBenchmark } = require('../bench/runner');

const source = {
  repository: 'https://github.com/aa-on-ai/clawbotomy',
  commitSha: 'a'.repeat(40),
  dirty: false,
  worktreeStateSha256: 'b'.repeat(64),
};

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawbotomy-bundle-'));
}

function createPlan(outputDir) {
  return buildRunPlan({
    models: ['sonnet'],
    tasks: ['instruction-following'],
    runs: 1,
    judge: 'opus',
    localEndpoint: 'http://localhost:1234/v1',
    bundlePath: outputDir,
    source,
  });
}

async function createSyntheticBundle(outputDir) {
  const plan = createPlan(outputDir);
  startBundle({ outputDir, plan, mode: 'dry-run' });
  const records = await runBenchmark({
    models: ['sonnet'],
    tasks: 'instruction-following',
    runs: 1,
    judge: 'opus',
    dryRun: true,
    localEndpoint: 'http://localhost:1234/v1',
    onResult: (record) => appendCaseRecord(outputDir, record),
  });
  const bundle = finishBundle({ outputDir });
  return { ...bundle, plan, records };
}

function rehashBundle(outputDir) {
  const files = {};
  for (const name of ['manifest.json', 'cases.jsonl', 'summary.json']) {
    const bytes = fs.readFileSync(path.join(outputDir, name));
    files[name] = { sha256: sha256(bytes), bytes: bytes.length };
  }
  const integrity = {
    schemaId: 'clawbotomy.integrity/v1',
    algorithm: 'sha256',
    files,
    bundleDigest: sha256(files),
  };
  fs.writeFileSync(path.join(outputDir, 'integrity.json'), `${JSON.stringify(integrity, null, 2)}\n`);
}

test('a completed synthetic bundle round-trips with deterministic summary and private modes', async () => {
  const outputDir = path.join(tempRoot(), 'run-synthetic');
  await createSyntheticBundle(outputDir);
  const bundle = readBundle(outputDir, { requireComplete: true });

  assert.equal(bundle.manifest.lifecycle.status, 'complete');
  assert.equal(bundle.manifest.evidence.measurementStatus, 'synthetic-test');
  assert.equal(bundle.records.length, 5);
  assert.equal(bundle.summary.totals.scheduled, 5);
  assert.equal(bundle.summary.aggregates[0].eligible, false);
  assert.deepEqual(bundle.summary.aggregates[0].eligibilityReasons, [
    'synthetic execution',
    'fewer than 5 runs',
    'provider identity incomplete',
  ]);
  assert.equal(fs.statSync(outputDir).mode & 0o777, 0o700);
  for (const name of ['manifest.json', 'cases.jsonl', 'summary.json', 'integrity.json']) {
    assert.equal(fs.statSync(path.join(outputDir, name)).mode & 0o777, 0o600, name);
  }
});

test('malformed provider output round-trips as durable invalid-response evidence', async () => {
  const outputDir = path.join(tempRoot(), 'run-invalid-response');
  const plan = buildRunPlan({
    models: ['local:test-model'],
    tasks: ['code-generation'],
    runs: 1,
    judge: 'gpt-5.4',
    localEndpoint: 'http://localhost:1234/v1',
    bundlePath: outputDir,
    source,
  });
  const originalFetch = global.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  const urls = [];
  process.env.OPENAI_API_KEY = 'test-only';
  global.fetch = async (url) => {
    urls.push(String(url));
    return {
      ok: true,
      json: async () => ({
        id: `request-${urls.length}`,
        model: 'test-model',
        choices: [{ message: { content: { payload: 'not text' } } }],
      }),
    };
  };

  try {
    startBundle({ outputDir, plan, mode: 'live' });
    const records = await runBenchmark({
      models: ['local:test-model'],
      tasks: 'code-generation',
      runs: 1,
      judge: 'gpt-5.4',
      dryRun: false,
      localEndpoint: 'http://localhost:1234/v1',
      requestBudget: plan.totals.providerRequests,
      onResult: (record) => appendCaseRecord(outputDir, record),
    });
    finishBundle({ outputDir });
    const bundle = readBundle(outputDir);

    assert.equal(urls.length, 5);
    assert.ok(urls.every((url) => url.startsWith('http://localhost:1234/')));
    assert.equal(records.length, 5);
    assert.equal(bundle.records.length, 5);
    assert.equal(bundle.manifest.lifecycle.status, 'incomplete');
    assert.ok(bundle.records.every((record) => record.status === 'failed'));
    assert.ok(bundle.records.every(
      (record) => record.target_requests[0].outcome === 'invalid_response',
    ));
    assert.ok(bundle.records.every((record) => record.judge_trace === undefined));
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});

test('integrity and summary recomputation catch tampering even after hashes are rewritten', async () => {
  const outputDir = path.join(tempRoot(), 'run-tamper');
  await createSyntheticBundle(outputDir);
  const summaryPath = path.join(outputDir, 'summary.json');
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  summary.aggregates[0].meanScore = 10;
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);

  assert.throws(() => readBundle(outputDir), /Integrity mismatch for summary\.json/);
  rehashBundle(outputDir);
  assert.throws(() => readBundle(outputDir), /summary does not match deterministic recomputation/);
});

test('deterministic scores are recomputed from the frozen case and recorded response', async () => {
  const outputDir = path.join(tempRoot(), 'run-score-tamper');
  await createSyntheticBundle(outputDir);
  const casesPath = path.join(outputDir, 'cases.jsonl');
  const records = fs.readFileSync(casesPath, 'utf8').trimEnd().split('\n').map(JSON.parse);
  records[0].raw_score = records[0].raw_score === 10 ? 0 : 10;
  records[0].justification = 'FORGED DETERMINISTIC SCORE';
  fs.writeFileSync(casesPath, `${records.map((record) => JSON.stringify(record)).join('\n')}\n`);
  rehashBundle(outputDir);

  assert.throws(() => readBundle(outputDir), /Deterministic score mismatch/);
});

test('bundle validation rejects files outside the integrity and redaction surface', async () => {
  const outputDir = path.join(tempRoot(), 'run-extra-file');
  await createSyntheticBundle(outputDir);
  fs.writeFileSync(path.join(outputDir, 'untracked-secret.txt'), 'should never be served');
  assert.throws(() => readBundle(outputDir), /unexpected or missing files/);
});

test('live aggregate eligibility requires enough runs and provider-reported identity', async () => {
  const root = tempRoot();
  const outputDir = path.join(root, 'run-identity-gate');
  const plan = createPlan(outputDir);
  const records = await runBenchmark({
    models: ['sonnet'],
    tasks: 'instruction-following',
    runs: 1,
    judge: 'opus',
    dryRun: true,
    localEndpoint: 'http://localhost:1234/v1',
  });
  for (const record of records) {
    for (const request of record.target_requests) request.synthetic = false;
  }
  const summary = deriveSummary(plan, records, { executionMode: 'live', reproducibilityStatus: 'complete' });
  assert.equal(summary.aggregates[0].eligible, false);
  assert.deepEqual(summary.aggregates[0].eligibilityReasons, [
    'fewer than 5 runs',
    'provider identity incomplete',
  ]);
});

test('duplicate or unplanned case records cannot validate', async () => {
  const outputDir = path.join(tempRoot(), 'run-duplicate');
  await createSyntheticBundle(outputDir);
  const casesPath = path.join(outputDir, 'cases.jsonl');
  const lines = fs.readFileSync(casesPath, 'utf8').trimEnd().split('\n');
  lines[1] = lines[0];
  fs.writeFileSync(casesPath, `${lines.join('\n')}\n`);
  rehashBundle(outputDir);

  assert.throws(() => readBundle(outputDir), /Duplicate plan ordinal/);
});

test('partial coverage is explicit and cannot be required as complete', async () => {
  const root = tempRoot();
  const outputDir = path.join(root, 'run-partial');
  const plan = createPlan(outputDir);
  const records = await runBenchmark({
    models: ['sonnet'],
    tasks: 'instruction-following',
    runs: 1,
    judge: 'opus',
    dryRun: true,
    localEndpoint: 'http://localhost:1234/v1',
  });
  startBundle({ outputDir, plan, mode: 'dry-run' });
  appendCaseRecord(outputDir, records[0]);
  finishBundle({ outputDir });

  const partial = readBundle(outputDir);
  assert.equal(partial.manifest.lifecycle.status, 'incomplete');
  assert.equal(partial.summary.totals.records, 1);
  assert.equal(partial.summary.totals.failed, 4);
  assert.throws(() => readBundle(outputDir, { requireComplete: true }), /Bundle is not complete/);
});

test('bundle and plan outputs refuse overwrite, symlinks, and plan mutation', async () => {
  const root = tempRoot();
  const outputDir = path.join(root, 'run-safe');
  const plan = createPlan(outputDir);
  const planPath = path.join(root, 'plan.json');
  writePlanFile(planPath, plan);
  assert.equal(readPlanFile(planPath).planDigest, plan.planDigest);
  assert.throws(() => writePlanFile(planPath, plan), /EEXIST|exist/i);

  const tampered = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  tampered.configuration.runs = 99;
  fs.writeFileSync(planPath, `${JSON.stringify(tampered, null, 2)}\n`);
  assert.throws(() => readPlanFile(planPath), /plan digest mismatch/i);

  startBundle({ outputDir, plan, mode: 'dry-run' });
  assert.throws(() => startBundle({ outputDir, plan, mode: 'dry-run' }), /already exists/);

  const real = path.join(root, 'real');
  fs.mkdirSync(real);
  const linked = path.join(root, 'linked');
  fs.symlinkSync(real, linked);
  const linkedOutput = path.join(linked, 'run-linked');
  const linkedPlan = createPlan(linkedOutput);
  assert.throws(
    () => startBundle({ outputDir: linkedOutput, plan: linkedPlan, mode: 'dry-run' }),
    /Symlink paths are not allowed/,
  );

  assert.throws(
    () => startBundle({ outputDir: path.join(root, 'run-other'), plan, mode: 'dry-run' }),
    /must match the path bound/,
  );
});
