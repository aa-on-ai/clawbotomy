const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');

const repoRoot = path.resolve(__dirname, '..');
const policy = JSON.parse(fs.readFileSync(
  path.join(repoRoot, 'compatibility', 'current-pins.json'),
  'utf8',
));

async function watchdog() {
  return import(pathToFileURL(path.join(repoRoot, 'compatibility', 'watchdog.mjs')));
}

test('watchdog accepts only explicit local runtime inputs', async () => {
  const { parseArgs } = await watchdog();
  assert.throws(() => parseArgs([]), /requires openclawBin/);
  assert.throws(() => parseArgs(['--wat', 'value']), /Unknown compatibility watchdog option/);
  assert.throws(() => parseArgs(['--openclaw-bin', '/one', '--openclaw-bin', '/two']), /only once/);
  const parsed = parseArgs([
    '--openclaw-bin', '/openclaw/openclaw.mjs',
    '--plugin-registry-state-dir', '/openclaw/state',
    '--hermes-root', '/hermes/source',
    '--hermes-python', '/hermes/python',
  ]);
  assert.equal(parsed.openclawBin, '/openclaw/openclaw.mjs');
  assert.equal(parsed.pluginRegistryStateDir, '/openclaw/state');
  assert.equal(parsed.hermesRoot, '/hermes/source');
  assert.equal(parsed.hermesPython, '/hermes/python');
});

test('watchdog validates the checked-in current-pin policy', async () => {
  const { validatePolicy } = await watchdog();
  assert.deepEqual(validatePolicy(structuredClone(policy)), policy);
  const widened = structuredClone(policy);
  widened.runtimes.openclaw.supportState = 'compatible-but-unpromised';
  assert.throws(() => validatePolicy(widened), /only supported pins/);
  const wrongProtocol = structuredClone(policy);
  wrongProtocol.protocol.id = 'stdio-jsonl/v2';
  assert.throws(() => validatePolicy(wrongProtocol), /does not match/);
});

test('watchdog status messages stay identical to the claim registry', async () => {
  const registry = JSON.parse(fs.readFileSync(path.join(repoRoot, 'claims', 'registry.json'), 'utf8'));
  const { compatibilityStatusMessage } = await watchdog();
  const createdAt = '2026-08-04T12:00:00.000Z';
  for (const state of ['supported', 'drifted', 'compatible-but-unpromised', 'unsupported']) {
    assert.equal(
      compatibilityStatusMessage(state, createdAt),
      registry.statusLanguage.compatibility[state].replace('<date>', '2026-08-04'),
    );
  }
});

test('watchdog receipt projection removes session and case tokens', async () => {
  const { safeProtocolProbe } = await watchdog();
  const projected = safeProtocolProbe({
    protocolId: 'stdio-jsonl/v1',
    protocolVersion: '1.0.0',
    handshakeAccepted: true,
    sessionId: 'session-private',
    declaredPlanCaseCount: 5,
    completedCaseCount: 1,
    completedCaseId: 'inbox.scope-boundary:search_read',
    completedCaseToken: 'case-private',
    toolCalls: 1,
    approvals: 0,
    clientFrames: 3,
    hostFrames: 4,
    nextCaseObservedButNotExecuted: true,
    transcriptSha256: 'a'.repeat(64),
  });
  assert.equal(Object.hasOwn(projected, 'sessionId'), false);
  assert.equal(Object.hasOwn(projected, 'completedCaseToken'), false);
  assert.equal(projected.completedCaseCount, 1);
});
