const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { canonicalStringify, sha256 } = require('../bench/canonical');
const {
  FILES,
  INTEGRITY_FILE,
  createIntegrity,
  validateBundle,
  writeBundle,
} = require('../inbox/bundle');
const { inboxRunsRoot } = require('../inbox/io');
const { createProtocolEngine } = require('../inbox/protocol-runner');
const { driveEngine } = require('./helpers/protocol-conformance-client');

const plan = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'fixtures', 'inbox-plan.v1.json'),
  'utf8',
));

function temporaryRepo(t, prefix) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));
  return repoRoot;
}

function safeBundle(t) {
  const repoRoot = temporaryRepo(t, 'clawbotomy-protocol-bundle-source-');
  const result = driveEngine(createProtocolEngine({ inputPlan: plan }));
  const outputDir = path.join(inboxRunsRoot(repoRoot), result.manifest.runId);
  return {
    repoRoot,
    bundle: writeBundle({ outputDir, result, repoRoot }),
  };
}

function copyBundle(t, sourceDir, suffix) {
  const repoRoot = temporaryRepo(t, `clawbotomy-protocol-bundle-${suffix}-`);
  const outputDir = path.join(inboxRunsRoot(repoRoot), path.basename(sourceDir));
  fs.mkdirSync(path.dirname(outputDir), { recursive: true, mode: 0o700 });
  fs.cpSync(sourceDir, outputDir, { recursive: true });
  return { repoRoot, outputDir };
}

function readRecords(outputDir) {
  return fs.readFileSync(path.join(outputDir, 'cases.jsonl'), 'utf8')
    .trimEnd()
    .split('\n')
    .map((line) => JSON.parse(line));
}

function writeRecords(outputDir, records) {
  fs.writeFileSync(
    path.join(outputDir, 'cases.jsonl'),
    `${records.map((record) => canonicalStringify(record)).join('\n')}\n`,
    { mode: 0o600 },
  );
}

function recomputeOuterIntegrity(outputDir) {
  const encodedFiles = Object.fromEntries(FILES.map((name) => [
    name,
    fs.readFileSync(path.join(outputDir, name)),
  ]));
  const integrity = createIntegrity(encodedFiles);
  for (const name of FILES) {
    assert.equal(integrity.files[name].sha256, sha256(encodedFiles[name]));
    assert.equal(integrity.files[name].bytes, encodedFiles[name].length);
  }
  assert.equal(integrity.bundleDigest, sha256(integrity.files));
  fs.writeFileSync(
    path.join(outputDir, INTEGRITY_FILE),
    `${JSON.stringify(integrity, null, 2)}\n`,
    { mode: 0o600 },
  );
  return integrity;
}

test('a private protocol bundle validates by exact recorded-input replay', async (t) => {
  const { repoRoot, bundle } = safeBundle(t);
  const validated = await validateBundle(bundle.outputDir, { repoRoot });

  assert.equal(validated.manifest.schemaId, 'clawbotomy.inbox-protocol-run-manifest/v1');
  assert.equal(validated.records.length, 36);
  assert.equal(validated.summary.totals.passedCases, 36);
  assert.equal(validated.summary.totals.failedCases, 0);
  assert.equal(validated.replay.manifest.runId, bundle.manifest.runId);
  assert.equal(validated.replay.coreDigest, bundle.coreDigest);
  assert.equal(canonicalStringify(validated.replay.manifest), canonicalStringify(bundle.manifest));
  assert.deepEqual(
    validated.replay.records.map((record) => record.digests.record),
    bundle.records.map((record) => record.digests.record),
  );
});

test('semantic client-frame tampering fails replay after all outer hashes are recomputed', async (t) => {
  const { bundle } = safeBundle(t);
  const copied = copyBundle(t, bundle.outputDir, 'client-frame-tamper');
  const records = readRecords(copied.outputDir);
  const toolCall = records[0].protocol.clientFrames.find((frame) => frame.type === 'tool_call');
  assert.ok(toolCall);
  assert.equal(toolCall.toolName, 'readMessage');
  assert.equal(toolCall.arguments.messageId, 'msg.ticket-101');
  toolCall.arguments.messageId = 'msg.newsletter-501';
  writeRecords(copied.outputDir, records);
  recomputeOuterIntegrity(copied.outputDir);

  await assert.rejects(
    () => validateBundle(copied.outputDir, { repoRoot: copied.repoRoot }),
    /does not match deterministic replay/i,
  );
});

test('module, path, and URL-like protocol IDs remain outside the replay allowlist', async (t) => {
  const { bundle } = safeBundle(t);
  for (const [index, protocolId] of [
    '../protocols/evil.js',
    'file:///tmp/evil.js',
    'https://outside.test/protocol.js',
    'node:fs',
  ].entries()) {
    const copied = copyBundle(t, bundle.outputDir, `protocol-id-${index}`);
    const manifestPath = path.join(copied.outputDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.protocol.id = protocolId;
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
    recomputeOuterIntegrity(copied.outputDir);

    await assert.rejects(
      () => validateBundle(copied.outputDir, { repoRoot: copied.repoRoot }),
      /Unknown Inbox protocol/i,
      protocolId,
    );
  }
});

test('duplicated recorded case tokens fail replay after all outer hashes are recomputed', async (t) => {
  const { bundle } = safeBundle(t);
  const copied = copyBundle(t, bundle.outputDir, 'duplicate-case-token');
  const records = readRecords(copied.outputDir);
  assert.notEqual(records[0].protocol.caseToken, records[1].protocol.caseToken);
  records[1].protocol.caseToken = records[0].protocol.caseToken;
  writeRecords(copied.outputDir, records);
  recomputeOuterIntegrity(copied.outputDir);

  await assert.rejects(
    () => validateBundle(copied.outputDir, { repoRoot: copied.repoRoot }),
    /unique fixed token for every case/i,
  );
});
