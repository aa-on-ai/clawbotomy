const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  ADAPTER_REGISTRY,
  resolveAdapter,
} = require('../inbox/adapters');
const {
  ADAPTER_ID,
  CONFIG_SCHEMA_ID,
  DESCRIPTOR,
  MAX_CONFIG_BYTES,
  SCENARIO_MODE_SPECS,
  behaviorForScenario,
  readAdapterConfig,
  validateAdapterConfig,
} = require('../inbox/adapters/declarative-policy');

const fixturesRoot = path.join(__dirname, 'fixtures');
const safePath = path.join(fixturesRoot, 'inbox-declarative-policy.safe.v1.json');
const unsafePath = path.join(fixturesRoot, 'inbox-declarative-policy.unsafe.v1.json');

function temporaryFile(name, content) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'clawbotomy-adapter-config-'));
  const filePath = path.join(root, name);
  fs.writeFileSync(filePath, content, { mode: 0o600 });
  return { root, filePath };
}

test('the adapter registry is a frozen exact-ID allowlist with no path aliases', () => {
  assert.equal(Object.isFrozen(ADAPTER_REGISTRY), true);
  assert.deepEqual(Object.keys(ADAPTER_REGISTRY), [ADAPTER_ID]);
  assert.equal(resolveAdapter(ADAPTER_ID).descriptor, DESCRIPTOR);
  assert.equal(Object.isFrozen(resolveAdapter(ADAPTER_ID)), true);
  for (const candidate of [
    './declarative-policy.js',
    '../adapters/declarative-policy',
    'file:///tmp/adapter.mjs',
    '/tmp/adapter.js',
    'Declarative-Policy/v1',
    'declarative-policy',
  ]) {
    assert.throws(() => resolveAdapter(candidate), /Unknown Inbox adapter/i);
  }
});

test('checked-in safe and unsafe policies validate canonically and are deeply frozen', () => {
  const safe = readAdapterConfig(safePath);
  const unsafe = readAdapterConfig(unsafePath);
  assert.equal(safe.configuration.schemaId, CONFIG_SCHEMA_ID);
  assert.match(safe.configurationDigest, /^[a-f0-9]{64}$/);
  assert.notEqual(safe.configurationDigest, unsafe.configurationDigest);
  for (const configuration of [safe.configuration, unsafe.configuration]) {
    assert.equal(Object.isFrozen(configuration), true);
    assert.equal(Object.isFrozen(configuration.scenarioModes), true);
    assert.deepEqual(Object.keys(configuration.scenarioModes), Object.keys(SCENARIO_MODE_SPECS));
  }
  for (const scenarioId of Object.keys(SCENARIO_MODE_SPECS)) {
    assert.equal(behaviorForScenario(safe.configuration, scenarioId), true, scenarioId);
    assert.equal(behaviorForScenario(unsafe.configuration, scenarioId), false, scenarioId);
  }
});

test('validation rejects omissions, extras, unknown modes, and adapter mismatches', () => {
  const valid = JSON.parse(fs.readFileSync(safePath, 'utf8'));
  assert.equal(validateAdapterConfig(valid).adapterId, ADAPTER_ID);

  const extra = structuredClone(valid);
  extra.module = './arbitrary.js';
  assert.throws(() => validateAdapterConfig(extra), /unexpected or missing fields/i);
  const hiddenExtra = structuredClone(valid);
  hiddenExtra.path = undefined;
  assert.throws(() => validateAdapterConfig(hiddenExtra), /unexpected or missing fields/i);

  const missing = structuredClone(valid);
  delete missing.scenarioModes['inbox.stop-cancel'];
  assert.throws(() => validateAdapterConfig(missing), /unexpected or missing fields/i);

  const unknown = structuredClone(valid);
  unknown.scenarioModes['inbox.scope-boundary'] = 'run-a-command';
  assert.throws(() => validateAdapterConfig(unknown), /Invalid mode for inbox\.scope-boundary/i);

  const mismatched = structuredClone(valid);
  mismatched.adapterId = '../adapter.js';
  assert.throws(() => validateAdapterConfig(mismatched), /must use adapterId declarative-policy\/v1/i);
  assert.throws(
    () => behaviorForScenario(valid, 'inbox.unknown-scenario'),
    /Unsupported Inbox declarative-policy scenario/i,
  );
});

test('the file reader rejects duplicate keys, symlinks, non-files, and oversized input', () => {
  const duplicate = temporaryFile('duplicate.json', `{
    "schemaId": "${CONFIG_SCHEMA_ID}",
    "schemaId": "${CONFIG_SCHEMA_ID}"
  }`);
  assert.throws(() => readAdapterConfig(duplicate.filePath), /duplicate JSON object key/i);

  const symlinkRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'clawbotomy-adapter-symlink-'));
  const symlinkPath = path.join(symlinkRoot, 'policy.json');
  fs.symlinkSync(safePath, symlinkPath);
  assert.throws(() => readAdapterConfig(symlinkPath), /Symlink paths are not allowed|must not be a symbolic link/i);

  assert.throws(() => readAdapterConfig(symlinkRoot), /must be a regular file/i);

  const oversized = temporaryFile('oversized.json', ' '.repeat(MAX_CONFIG_BYTES + 1));
  assert.throws(() => readAdapterConfig(oversized.filePath), /exceeds the 65536-byte limit/i);

  const originalFstatSync = fs.fstatSync;
  fs.fstatSync = (descriptor) => {
    const stats = originalFstatSync(descriptor);
    Object.defineProperty(stats, 'size', { value: 1 });
    return stats;
  };
  try {
    assert.throws(
      () => readAdapterConfig(oversized.filePath),
      /exceeds the 65536-byte limit/i,
    );
  } finally {
    fs.fstatSync = originalFstatSync;
  }

  const deeplyNested = temporaryFile('deep.json', `${'['.repeat(40)}null${']'.repeat(40)}`);
  assert.throws(() => readAdapterConfig(deeplyNested.filePath), /nested too deeply/i);
});
