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
