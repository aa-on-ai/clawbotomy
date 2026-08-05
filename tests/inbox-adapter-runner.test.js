const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const tls = require('node:tls');

const { sha256 } = require('../bench/canonical');
const { readAdapterConfig } = require('../inbox/adapters/declarative-policy');
const { runAdapterPlanInMemory } = require('../inbox/adapter-runner');
const {
  FILES,
  INTEGRITY_FILE,
  createIntegrity,
  validateBundle,
  writeBundle,
} = require('../inbox/bundle');
const { HELP, execute, parseRunArgs } = require('../inbox/index');
const { inboxRunsRoot } = require('../inbox/io');

const fixturesRoot = path.join(__dirname, 'fixtures');
const planPath = path.join(fixturesRoot, 'inbox-plan.v1.json');
const safePath = path.join(fixturesRoot, 'inbox-declarative-policy.safe.v1.json');
const unsafePath = path.join(fixturesRoot, 'inbox-declarative-policy.unsafe.v1.json');

function fixtureJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function tempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawbotomy-adapter-run-'));
}

async function withoutNetwork(callback) {
  const blocked = () => {
    throw new Error('network access attempted by allowlisted Inbox adapter');
  };
  const originals = {
    fetch: global.fetch,
    httpGet: http.get,
    httpRequest: http.request,
    httpsGet: https.get,
    httpsRequest: https.request,
    netConnect: net.connect,
    netCreateConnection: net.createConnection,
    tlsConnect: tls.connect,
  };
  global.fetch = blocked;
  http.get = blocked;
  http.request = blocked;
  https.get = blocked;
  https.request = blocked;
  net.connect = blocked;
  net.createConnection = blocked;
  tls.connect = blocked;
  try {
    return await callback();
  } finally {
    global.fetch = originals.fetch;
    http.get = originals.httpGet;
    http.request = originals.httpRequest;
    https.get = originals.httpsGet;
    https.request = originals.httpsRequest;
    net.connect = originals.netConnect;
    net.createConnection = originals.netCreateConnection;
    tls.connect = originals.tlsConnect;
  }
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

test('safe and unsafe allowlisted policies produce real deterministic offline evidence', async () => {
  const plan = fixtureJson(planPath);
  const safe = await withoutNetwork(() => runAdapterPlanInMemory({
    inputPlan: plan,
    adapterId: 'declarative-policy/v1',
    adapterConfiguration: fixtureJson(safePath),
  }));
  const unsafe = await withoutNetwork(() => runAdapterPlanInMemory({
    inputPlan: plan,
    adapterId: 'declarative-policy/v1',
    adapterConfiguration: fixtureJson(unsafePath),
  }));

  assert.equal(safe.records.length, 36);
  assert.equal(safe.summary.totals.passedCases, 36);
  assert.equal(safe.summary.totals.failedCases, 0);
  assert.equal(unsafe.records.length, 36);
  assert.equal(unsafe.summary.totals.passedCases, 0);
  assert.equal(unsafe.summary.totals.failedCases, 36);
  assert.notEqual(safe.manifest.runId, unsafe.manifest.runId);
  assert.notEqual(safe.coreDigest, unsafe.coreDigest);

  assert.equal(safe.manifest.executionSubject.id, 'declarative-policy/v1');
  assert.equal(safe.manifest.executionSubject.applicability, 'adapter-configuration-only');
  assert.equal(
    safe.manifest.executionSubject.configurationFingerprint,
    safe.manifest.adapterConfiguration.sha256,
  );
  assert.equal(safe.manifest.evidence.adapterConfigurationInspected, true);
  assert.equal(safe.manifest.evidence.configuredAgentInspected, false);
  assert.equal(safe.manifest.evidence.configuredAgentExecuted, false);
  assert.equal(safe.manifest.evidence.permissionDecision, null);
  assert.equal(safe.manifest.execution.networkRequests, 0);
  assert.equal(safe.manifest.execution.realInboxConnections, 0);
  assert.equal(safe.summary.subjectObservation.configuredAgentResult, null);
  assert.match(safe.summary.subjectObservation.summary, /No deployed agent was loaded or executed/i);
  assert.ok(Object.values(safe.manifest.implementationSha256).every(
    (digest) => /^[a-f0-9]{64}$/.test(digest),
  ));
  for (const record of safe.records) {
    assert.equal(record.executionSubject.configurationFingerprint,
      safe.manifest.adapterConfiguration.sha256);
    assert.equal(record.events.some((event) => event.actor === 'reference-agent'), false);
    assert.ok(record.events.some((event) => event.actor === 'allowlisted-adapter'));
  }

  const unsafeStop = unsafe.records.find((record) => (
    record.scenarioId === 'inbox.stop-cancel' && record.capabilityId === 'send'
  ));
  const stop = unsafeStop.events.find((event) => event.kind === 'operator_stop');
  const laterSend = unsafeStop.events.find((event) => (
    event.kind === 'tool_attempt'
    && event.payload.toolName === 'sendDraft'
    && event.sequence > stop.sequence
  ));
  assert.ok(laterSend);
  assert.ok(unsafeStop.finalState.sent.some((item) => item.sourceDraftId === 'draft.stop-601'));
});

test('canonical policy semantics bind the run while source whitespace and key order do not', async () => {
  const plan = fixtureJson(planPath);
  const safe = fixtureJson(safePath);
  const reorderedModes = Object.fromEntries(Object.entries(safe.scenarioModes).reverse());
  const reordered = {
    scenarioModes: reorderedModes,
    adapterId: safe.adapterId,
    schemaVersion: safe.schemaVersion,
    schemaId: safe.schemaId,
  };
  const first = await runAdapterPlanInMemory({
    inputPlan: plan,
    adapterId: 'declarative-policy/v1',
    adapterConfiguration: safe,
  });
  const second = await runAdapterPlanInMemory({
    inputPlan: plan,
    adapterId: 'declarative-policy/v1',
    adapterConfiguration: reordered,
  });
  assert.equal(first.manifest.adapterConfiguration.sha256, sha256(safe));
  assert.equal(first.manifest.runId, second.manifest.runId);
  assert.equal(first.coreDigest, second.coreDigest);
  assert.deepEqual(
    first.records.map((record) => record.digests.record),
    second.records.map((record) => record.digests.record),
  );
});

test('adapter bundles replay from embedded configuration after the source file is removed', async () => {
  const repoRoot = tempRepo();
  const copiedPlan = path.join(repoRoot, 'plan.json');
  const copiedConfig = path.join(repoRoot, 'policy.json');
  fs.copyFileSync(planPath, copiedPlan);
  fs.copyFileSync(safePath, copiedConfig);
  const messages = [];
  const originalLog = console.log;
  console.log = (...values) => messages.push(values.join(' '));
  try {
    const status = await execute([
      'run',
      '--plan', copiedPlan,
      '--adapter', 'declarative-policy/v1',
      '--adapter-config', copiedConfig,
    ], { repoRoot });
    assert.equal(status, 0);
  } finally {
    console.log = originalLog;
  }

  const receipt = JSON.parse(messages[0]);
  assert.equal(receipt.evidenceLane, 'synthetic-reference-control');
  assert.ok(receipt.nonClaims.includes('Reference-control evidence is not configured-agent evidence.'));
  assert.equal(receipt.executionSubject, 'declarative-policy/v1');
  assert.equal(receipt.executionKind, 'allowlisted-declarative-adapter');
  assert.equal(receipt.applicability, 'adapter-configuration-only');
  assert.match(receipt.adapterConfigurationSha256, /^[a-f0-9]{64}$/);
  fs.unlinkSync(copiedConfig);

  const validated = await validateBundle(receipt.outputDir, { repoRoot });
  assert.equal(validated.replay.manifest.runId, receipt.runId);
  assert.equal(validated.replay.coreDigest, receipt.coreDigest);
});

test('adapter bundle semantic tampering fails even after outer integrity hashes are rewritten', async () => {
  const repoRoot = tempRepo();
  const result = await runAdapterPlanInMemory({
    inputPlan: fixtureJson(planPath),
    adapterId: 'declarative-policy/v1',
    adapterConfiguration: fixtureJson(safePath),
  });
  const outputDir = path.join(inboxRunsRoot(repoRoot), result.manifest.runId);
  writeBundle({ outputDir, result, repoRoot });

  const manifestPath = path.join(outputDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.adapterConfiguration.document.scenarioModes['inbox.stop-cancel'] = 'continue-after-stop';
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  rehashBundle(outputDir);
  await assert.rejects(
    () => validateBundle(outputDir, { repoRoot }),
    /Stored Inbox manifest does not match deterministic replay/i,
  );
});

test('embedded adapter configuration rejects duplicate-key shadowing before replay', async () => {
  const repoRoot = tempRepo();
  const result = await runAdapterPlanInMemory({
    inputPlan: fixtureJson(planPath),
    adapterId: 'declarative-policy/v1',
    adapterConfiguration: fixtureJson(safePath),
  });
  const outputDir = path.join(inboxRunsRoot(repoRoot), result.manifest.runId);
  writeBundle({ outputDir, result, repoRoot });

  const manifestPath = path.join(outputDir, 'manifest.json');
  const manifestText = fs.readFileSync(manifestPath, 'utf8');
  const shadowed = manifestText.replace(
    '"inbox.stop-cancel": "cancel-on-stop",',
    '"inbox.stop-cancel": "continue-after-stop",\n        "inbox.stop-cancel": "cancel-on-stop",',
  );
  assert.notEqual(shadowed, manifestText);
  fs.writeFileSync(manifestPath, shadowed);
  rehashBundle(outputDir);
  await assert.rejects(
    () => validateBundle(outputDir, { repoRoot }),
    /duplicate JSON object key/i,
  );
});

test('CLI selector union rejects module-like IDs and incomplete or conflicting modes', () => {
  assert.doesNotMatch(HELP, /--output/);
  assert.match(HELP, /Adapter evidence applies only to the exact embedded policy/);
  assert.match(HELP, /0 = passed, 2 = valid evidence with findings, 1 = invalid/);
  for (const adapterId of [
    './evil.js',
    '../evil.js',
    '/tmp/evil.js',
    'file:///tmp/evil.js',
    'https://outside.test/evil.js',
    'node:fs',
    'some-package',
    'Declarative-Policy/v1',
  ]) {
    assert.throws(() => parseRunArgs([
      '--plan', 'plan.json',
      '--adapter', adapterId,
      '--adapter-config', 'policy.json',
    ]), /Unknown Inbox adapter/i);
  }
  assert.throws(() => parseRunArgs([
    '--plan', 'plan.json', '--adapter', 'declarative-policy/v1',
  ]), /requires both --adapter and --adapter-config/i);
  assert.throws(() => parseRunArgs([
    '--plan', 'plan.json', '--adapter-config', 'policy.json',
  ]), /requires both --adapter and --adapter-config/i);
  assert.throws(() => parseRunArgs([
    '--plan', 'plan.json',
    '--agent', 'bounded',
    '--adapter', 'declarative-policy/v1',
    '--adapter-config', 'policy.json',
  ]), /--agent cannot be combined/i);
  for (const repeatedFlag of ['--plan', '--agent', '--adapter', '--adapter-config']) {
    const value = repeatedFlag === '--adapter'
      ? 'declarative-policy/v1'
      : repeatedFlag === '--adapter-config'
        ? 'policy.json'
        : repeatedFlag === '--agent'
          ? 'bounded'
          : 'plan.json';
    assert.throws(
      () => parseRunArgs([repeatedFlag, value, repeatedFlag, value]),
      /may be specified only once/i,
    );
  }
  assert.throws(
    () => parseRunArgs(['--plan', 'plan.json', '--output', 'somewhere']),
    /Unknown run option: --output/i,
  );
});

test('adapter implementation contains no user-selected module, command, or network execution surface', () => {
  const adapterFiles = [
    path.join(__dirname, '..', 'inbox', 'adapters', 'index.js'),
    path.join(__dirname, '..', 'inbox', 'adapters', 'declarative-policy.js'),
  ];
  const source = adapterFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  assert.doesNotMatch(source, /\bimport\s*\(/);
  assert.doesNotMatch(source, /\brequire\.resolve\b|\bcreateRequire\b/);
  assert.doesNotMatch(source, /\brequire\s*\(\s*(?:adapter|config|input|id)/i);
  assert.doesNotMatch(source, /\beval\s*\(|\bnew\s+Function\b|\bvm\./);
  assert.doesNotMatch(source, /\bchild_process\b|\bWorker\b/);
  assert.doesNotMatch(source, /\bfetch\s*\(|\bhttps?\.request\s*\(|\bnet\.connect\s*\(/);
});

test('the plan configurationReference remains inert and is never opened as adapter input', async () => {
  const plan = fixtureJson(planPath);
  const sentinel = path.join(tempRepo(), 'would-be-agent.js');
  plan.subject.configurationReference = sentinel;
  const result = await runAdapterPlanInMemory({
    inputPlan: plan,
    adapterId: 'declarative-policy/v1',
    adapterConfiguration: fixtureJson(safePath),
  });
  assert.equal(result.summary.totals.failedCases, 0);
  assert.equal(fs.existsSync(sentinel), false);
  assert.equal(result.manifest.plan.document.subject.configurationReference, sentinel);
});
