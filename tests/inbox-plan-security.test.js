const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  MAX_PLAN_BYTES,
  assertInboxOutputPath,
  createPrivateDirectory,
  inboxRunsRoot,
  writeExclusive,
} = require('../inbox/io');
const {
  PLAN_SCHEMA_ID,
  PLAN_SCHEMA_VERSION,
  contract,
  expandCases,
  readPlan,
  reconstructPlan,
  validatePlan,
} = require('../inbox/plan');

const FIXED_TIME = '2026-07-12T20:15:30.000Z';

function fullPlan() {
  return reconstructPlan({
    schemaId: PLAN_SCHEMA_ID,
    schemaVersion: PLAN_SCHEMA_VERSION,
    createdAt: FIXED_TIME,
    subject: {
      label: 'Deterministic security test',
      configurationReference: 'git:test-fixture',
    },
    requestedCapabilities: contract.capabilities.map((capability, index) => ({
      id: capability.id,
      operatorIntent: ['allow', 'approval', 'block'][index % 3],
    })),
  });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function withTemporaryDirectory(callback) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'clawbotomy-inbox-security-'));
  try {
    return callback(directory);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test('the full canonical Inbox plan expands deterministically to 36 isolated cases', () => {
  const plan = fullPlan();

  assert.deepEqual(validatePlan(plan), plan);
  assert.equal(plan.requestedCapabilities.length, 5);
  assert.equal(plan.requiredScenarios.length, 11);
  assert.equal(expandCases(plan).length, 36);
  assert.equal(new Set(expandCases(plan).map((item) => item.caseId)).size, 36);
});

test('canonical validation rejects changed contract content and invented assessment fields', () => {
  const mutations = [
    ['capability name', (plan) => { plan.requestedCapabilities[0].name = 'Read anything'; }],
    ['capability risk', (plan) => { plan.requestedCapabilities[0].risk = 'No risk'; }],
    ['scenario title', (plan) => { plan.requiredScenarios[0].title = 'A different scenario'; }],
    ['scenario purpose', (plan) => { plan.requiredScenarios[0].purpose = 'Different purpose'; }],
    ['scenario controls', (plan) => { plan.requiredScenarios[0].controls.push('Invented control'); }],
    ['scenario evidence', (plan) => { plan.requiredScenarios[0].expectedEvidence = []; }],
    ['scenario coverage', (plan) => { plan.requiredScenarios[0].coversCapabilities.pop(); }],
    ['duplicate scenario', (plan) => { plan.requiredScenarios.push(clone(plan.requiredScenarios[0])); }],
    ['limitations', (plan) => { plan.limitations[0] = 'This run proves production safety.'; }],
    ['assessment status', (plan) => { plan.assessment.status = 'passed'; }],
    ['assessment decision', (plan) => { plan.assessment.permissionDecision = 'allow'; }],
    ['assessment extra field', (plan) => { plan.assessment.score = 100; }],
    ['top-level extra property', (plan) => { plan.untrusted = true; }],
  ];

  for (const [label, mutate] of mutations) {
    const plan = clone(fullPlan());
    mutate(plan);
    assert.throws(
      () => validatePlan(plan),
      /differs from the canonical checked-in contract/,
      label,
    );
  }
});

test('canonical reconstruction rejects duplicate capability declarations', () => {
  const plan = fullPlan();
  plan.requestedCapabilities.push(clone(plan.requestedCapabilities[0]));

  assert.throws(() => validatePlan(plan), /Duplicate Inbox capability: search_read/);
});

test('plan reads reject duplicate keys, invalid UTF-8, oversized files, and user-owned symlinks', (t) => {
  withTemporaryDirectory((directory) => {
    const canonicalText = JSON.stringify(fullPlan());
    const duplicate = path.join(directory, 'duplicate.json');
    fs.writeFileSync(duplicate, canonicalText.replace(
      '{',
      '{"schemaId":"shadowed-value",',
    ));
    assert.throws(() => readPlan(duplicate), /duplicate JSON object key/i);

    const invalidUtf8 = path.join(directory, 'invalid-utf8.json');
    fs.writeFileSync(invalidUtf8, Buffer.from([0x7b, 0x22, 0x78, 0x22, 0x3a, 0xff, 0x7d]));
    assert.throws(() => readPlan(invalidUtf8), /invalid UTF-8/i);

    const oversized = path.join(directory, 'oversized.json');
    fs.writeFileSync(oversized, ' '.repeat(MAX_PLAN_BYTES + 1));
    assert.throws(() => readPlan(oversized), /exceeds the .*byte limit/);

    if (process.platform === 'win32') {
      t.diagnostic('symlink assertion skipped on Windows');
      return;
    }

    const canonical = path.join(directory, 'canonical.json');
    const linked = path.join(directory, 'linked.json');
    fs.writeFileSync(canonical, `${canonicalText}\n`);
    fs.symlinkSync(canonical, linked);
    assert.throws(() => readPlan(linked), /Symlink paths are not allowed/);
  });
});

test('Inbox output guards require private, new directories beneath the configured root', (t) => {
  withTemporaryDirectory((repoRoot) => {
    const root = inboxRunsRoot(repoRoot);
    const output = path.join(root, 'run-security-001');

    assert.equal(assertInboxOutputPath(output, { repoRoot }), output);
    assert.throws(
      () => assertInboxOutputPath(path.join(repoRoot, 'public-run'), { repoRoot }),
      /must be a new directory under/,
    );

    createPrivateDirectory(output);
    const mode = fs.statSync(output).mode & 0o777;
    assert.equal(mode, 0o700);
    assert.throws(() => createPrivateDirectory(output), /already exists/);

    const evidenceFile = path.join(output, 'manifest.json');
    writeExclusive(evidenceFile, '{}\n');
    assert.equal(fs.statSync(evidenceFile).mode & 0o777, 0o600);
    assert.throws(() => writeExclusive(evidenceFile, '{}\n'), /EEXIST/);

    if (process.platform === 'win32') {
      t.diagnostic('symlink assertion skipped on Windows');
      return;
    }

    const realParent = path.join(root, 'real-parent');
    const linkedParent = path.join(root, 'linked-parent');
    fs.mkdirSync(realParent, { mode: 0o700 });
    fs.symlinkSync(realParent, linkedParent, 'dir');
    assert.throws(
      () => assertInboxOutputPath(path.join(linkedParent, 'run-security-002'), { repoRoot }),
      /Symlink paths are not allowed/,
    );
  });
});
