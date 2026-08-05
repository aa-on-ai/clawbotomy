const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  FILES,
  INTEGRITY_FILE,
  createIntegrity,
  readBundle,
  validateBundle,
  writeBundle,
} = require('../inbox/bundle');
const { execute } = require('../inbox/index');
const { inboxRunsRoot } = require('../inbox/io');
const { reconstructPlan } = require('../inbox/plan');
const { runPlanInMemory } = require('../inbox/runner');
const contract = require('../src/lib/inbox-contract.v1.json');

function tempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawbotomy-inbox-bundle-'));
}

function allCapabilityPlan() {
  return reconstructPlan({
    schemaId: 'clawbotomy.inbox-preflight-plan/v1',
    schemaVersion: '1.0.0',
    createdAt: '2026-07-12T20:15:30.000Z',
    subject: {
      label: 'Inbox evidence bundle test',
      configurationReference: 'tests/reference-agent.json',
    },
    requestedCapabilities: contract.capabilities.map((capability) => ({
      id: capability.id,
      operatorIntent: 'allow',
    })),
  });
}

async function completedBundle({ repoRoot = tempRepo(), profile = 'bounded' } = {}) {
  const result = await runPlanInMemory({ inputPlan: allCapabilityPlan(), profile });
  const outputDir = path.join(inboxRunsRoot(repoRoot), result.manifest.runId);
  return writeBundle({ outputDir, result, repoRoot });
}

function rehashBundle(outputDir) {
  const encodedFiles = Object.fromEntries(FILES.map((name) => [
    name,
    fs.readFileSync(path.join(outputDir, name)),
  ]));
  const integrity = createIntegrity(encodedFiles);
  fs.writeFileSync(
    path.join(outputDir, INTEGRITY_FILE),
    `${JSON.stringify(integrity, null, 2)}\n`,
    { mode: 0o600 },
  );
}

test('a complete Inbox bundle has the exact private four-file surface and validates by replay', async () => {
  const bundle = await completedBundle();
  assert.deepEqual(
    fs.readdirSync(bundle.outputDir).sort(),
    [...FILES, INTEGRITY_FILE].sort(),
  );
  assert.equal(fs.statSync(bundle.outputDir).mode & 0o777, 0o700);
  for (const name of [...FILES, INTEGRITY_FILE]) {
    assert.equal(fs.statSync(path.join(bundle.outputDir, name)).mode & 0o777, 0o600, name);
  }

  const read = readBundle(bundle.outputDir, { repoRoot: path.dirname(path.dirname(path.dirname(bundle.outputDir))) });
  assert.equal(read.manifest.lifecycle.status, 'complete');
  assert.equal(read.records.length, 36);
  assert.equal(read.summary.totals.failedCases, 0);

  const validated = await validateBundle(bundle.outputDir, {
    repoRoot: path.dirname(path.dirname(path.dirname(bundle.outputDir))),
  });
  assert.equal(validated.replay.coreDigest, bundle.coreDigest);
  assert.deepEqual(
    validated.replay.records.map((record) => record.digests.record),
    read.records.map((record) => record.digests.record),
  );
});

test('bundle output refuses overwrite, public paths, and user-owned symlink components', async () => {
  const repoRoot = tempRepo();
  const result = await runPlanInMemory({ inputPlan: allCapabilityPlan(), profile: 'bounded' });
  const outputDir = path.join(inboxRunsRoot(repoRoot), result.manifest.runId);
  writeBundle({ outputDir, result, repoRoot });
  assert.throws(
    () => writeBundle({ outputDir, result, repoRoot }),
    /already exists/i,
  );
  assert.throws(
    () => writeBundle({ outputDir: path.join(repoRoot, 'public', result.manifest.runId), result, repoRoot }),
    /must be a new directory under/i,
  );

  const linkedRepo = tempRepo();
  const controlRoot = path.join(linkedRepo, '.clawbotomy');
  const realRuns = path.join(linkedRepo, 'real-inbox-runs');
  fs.mkdirSync(controlRoot, { mode: 0o700 });
  fs.mkdirSync(realRuns, { mode: 0o700 });
  fs.symlinkSync(realRuns, path.join(controlRoot, 'inbox-runs'));
  assert.throws(
    () => writeBundle({
      outputDir: path.join(inboxRunsRoot(linkedRepo), result.manifest.runId),
      result,
      repoRoot: linkedRepo,
    }),
    /Symlink paths are not allowed/i,
  );
});

test('raw tampering and semantically altered evidence with rewritten hashes both fail closed', async () => {
  const raw = await completedBundle();
  const rawSummaryPath = path.join(raw.outputDir, 'summary.json');
  const rawSummary = JSON.parse(fs.readFileSync(rawSummaryPath, 'utf8'));
  rawSummary.totals.failedCases = 999;
  fs.writeFileSync(rawSummaryPath, `${JSON.stringify(rawSummary, null, 2)}\n`);
  await assert.rejects(
    () => validateBundle(raw.outputDir, {
      repoRoot: path.dirname(path.dirname(path.dirname(raw.outputDir))),
    }),
    /Integrity mismatch for summary\.json/i,
  );

  const semantic = await completedBundle();
  const casesPath = path.join(semantic.outputDir, 'cases.jsonl');
  const records = fs.readFileSync(casesPath, 'utf8').trimEnd().split('\n').map(JSON.parse);
  const finished = records[0].events.find((item) => item.kind === 'agent_finished');
  assert.ok(finished);
  finished.payload.status = 'forged-by-rehashing-attacker';
  fs.writeFileSync(casesPath, `${records.map((record) => JSON.stringify(record)).join('\n')}\n`);
  rehashBundle(semantic.outputDir);
  await assert.rejects(
    () => validateBundle(semantic.outputDir, {
      repoRoot: path.dirname(path.dirname(path.dirname(semantic.outputDir))),
    }),
    /Stored Inbox records does not match deterministic replay/i,
  );
});

test('the CLI execute path returns zero for bounded evidence and two for overreach findings', async () => {
  const repoRoot = tempRepo();
  const planPath = path.join(repoRoot, 'inbox-plan.json');
  fs.writeFileSync(planPath, `${JSON.stringify(allCapabilityPlan(), null, 2)}\n`, { mode: 0o600 });
  const messages = [];
  const originalLog = console.log;
  console.log = (...values) => messages.push(values.join(' '));
  try {
    const boundedStatus = await execute([
      'run', '--plan', planPath, '--agent', 'bounded',
    ], { repoRoot });
    const overreachStatus = await execute([
      'run', '--plan', planPath, '--agent', 'overreach',
    ], { repoRoot });
    assert.equal(boundedStatus, 0);
    assert.equal(overreachStatus, 2);
  } finally {
    console.log = originalLog;
  }

  assert.equal(messages.length, 2);
  const receipts = messages.map(JSON.parse);
  assert.equal(receipts[0].evidenceLane, 'synthetic-reference-control');
  assert.ok(receipts[0].nonClaims.includes('Reference-control evidence is not configured-agent evidence.'));
  assert.equal(receipts[0].status, 'passed');
  assert.equal(receipts[0].cases, 36);
  assert.equal(receipts[1].status, 'failed');
  assert.equal(receipts[1].failed > 0, true);
  assert.equal(receipts[0].permissionDecision, null);
  assert.notEqual(receipts[0].runId, receipts[1].runId);
});

test('portable validate, replay, and summarize fail closed outside Node.js 22', async () => {
  for (const command of ['validate', 'replay', 'summarize']) {
    await assert.rejects(
      () => execute([command, '.clawbotomy/inbox-runs/not-reached'], {
        repoRoot: tempRepo(),
        nodeVersion: '21.9.0',
      }),
      /requires Node\.js 22\.x/,
    );
  }
});
