const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  MESSAGE_SCHEMA_ID,
  PROTOCOL_ID,
  PROTOCOL_VERSION,
  TOOL_NAMES,
} = require('../inbox/protocols/stdio-jsonl');

const repoRoot = path.resolve(__dirname, '..');
const policy = JSON.parse(fs.readFileSync(
  path.join(repoRoot, 'compatibility', 'current-pins.json'),
  'utf8',
));

test('the support inventory names one exact OpenClaw pin and one exact Hermes pin', () => {
  assert.equal(policy.schemaId, 'clawbotomy.compatibility-support-policy/v1');
  assert.equal(policy.schemaVersion, '1.0.0');
  assert.deepEqual(Object.keys(policy.runtimes).sort(), ['hermes', 'openclaw']);
  assert.equal(policy.runtimes.openclaw.supportState, 'supported');
  assert.equal(policy.runtimes.openclaw.version, '2026.7.1-beta.5');
  assert.match(policy.runtimes.openclaw.binarySha256, /^[a-f0-9]{64}$/);
  assert.match(policy.runtimes.openclaw.runtimeSha256, /^[a-f0-9]{64}$/);
  assert.match(policy.runtimes.openclaw.provider.runtimeSha256, /^[a-f0-9]{64}$/);
  assert.match(policy.runtimes.openclaw.harness.runtimeSha256, /^[a-f0-9]{64}$/);
  assert.equal(policy.runtimes.hermes.supportState, 'supported');
  assert.equal(policy.runtimes.hermes.version, '0.18.2');
  assert.equal(policy.runtimes.hermes.pythonVersion, '3.11');
  assert.equal(policy.runtimes.hermes.gitCommit, '111544d544d6cf6efed9875e116f2daeb76a1211');
  assert.match(policy.runtimes.hermes.sourceTreeSha256, /^[a-f0-9]{64}$/);
});

test('the support inventory is bound to the checked-in protocol and exact eight tools', () => {
  assert.equal(policy.protocol.id, PROTOCOL_ID);
  assert.equal(policy.protocol.version, PROTOCOL_VERSION);
  assert.equal(policy.protocol.messageSchemaId, MESSAGE_SCHEMA_ID);
  assert.deepEqual(policy.protocol.toolNames, TOOL_NAMES);
  assert.equal(policy.protocol.toolNames.length, 8);
  assert.equal(new Set(policy.protocol.toolNames).size, 8);
});

test('runtime pins agree with the executable bridge constants', () => {
  const hermesBridge = fs.readFileSync(
    path.join(repoRoot, 'integrations', 'hermes-agent', 'bridge.py'),
    'utf8',
  );
  assert.match(hermesBridge, new RegExp(`EXPECTED_HERMES_VERSION = ["']${policy.runtimes.hermes.version.replaceAll('.', '\\.')}["']`));
  assert.match(hermesBridge, new RegExp(`EXPECTED_HERMES_GIT_COMMIT = ["']${policy.runtimes.hermes.gitCommit}["']`));
  const openclawReadme = fs.readFileSync(
    path.join(repoRoot, 'integrations', 'openclaw', 'README.md'),
    'utf8',
  );
  assert.match(openclawReadme, new RegExp(policy.runtimes.openclaw.version.replaceAll('.', '\\.')));
});

test('policy defines all four states without scheduling or widening support', () => {
  const document = fs.readFileSync(
    path.join(repoRoot, 'docs', 'compatibility-policy.md'),
    'utf8',
  );
  for (const state of ['supported', 'drifted', 'compatible-but-unpromised', 'unsupported']) {
    assert.match(document, new RegExp(`\\*\\*${state}\\*\\*`));
  }
  assert.match(document, /There is no scheduler, recurring job, provider call, or multi-version matrix/i);
  assert.match(document, /latest successful receipt/i);
  assert.match(document, /90 additional days/i);
  assert.match(document, /does not open issues, send alerts, change runtime configuration, install a version, or mutate a release/i);
  const workflow = fs.readFileSync(path.join(repoRoot, '.github', 'workflows', 'ci.yml'), 'utf8');
  assert.doesNotMatch(workflow, /compat:watchdog|compatibility-watchdog/);
});
