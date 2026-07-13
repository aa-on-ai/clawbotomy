const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

function run(args) {
  return spawnSync(process.execPath, ['bench/index.js', ...args], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
  });
}

test('the default model list resolves in a dry run', () => {
  const result = run(['--tasks', 'instruction-following', '--runs', '1', '--dry-run', '--output', 'json']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"opus"/);
  assert.match(result.stdout, /"sonnet"/);
  assert.match(result.stdout, /"gpt-5\.4"/);
});

test('invalid and excessive run counts are rejected before provider calls', () => {
  for (const runs of ['0', '1.5', '101']) {
    const result = run(['--models', 'sonnet', '--tasks', 'instruction-following', '--runs', runs, '--dry-run']);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Runs must be/);
  }
});

test('help is safe and unknown or incomplete options are rejected', () => {
  const help = run(['--help']);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /Usage:/);
  assert.match(help.stdout, /can incur charges/);

  const unknown = run(['--model', 'sonnet', '--dry-run']);
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /Unknown option: --model/);

  const missing = run(['--models', '--dry-run']);
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /Option --models requires a value/);
});

test('live execution requires an explicit, exclusive mode', () => {
  const noArguments = run([]);
  assert.equal(noArguments.status, 1);
  assert.match(noArguments.stderr, /exactly one execution mode/);

  const missingMode = run(['--models', 'sonnet', '--tasks', 'instruction-following']);
  assert.equal(missingMode.status, 1);
  assert.match(missingMode.stderr, /exactly one execution mode/);

  const conflictingModes = run([
    '--models', 'sonnet', '--tasks', 'instruction-following', '--dry-run', '--live',
  ]);
  assert.equal(conflictingModes.status, 1);
  assert.match(conflictingModes.stderr, /exactly one execution mode/);

  const implicitScope = run(['--live']);
  assert.equal(implicitScope.status, 1);
  assert.match(implicitScope.stderr, /requires a frozen --plan file/);

  const selectorOverride = run([
    '--plan', 'plan.json', '--models', 'sonnet', '--confirm-plan', 'abc',
    '--max-requests', '1', '--max-cost-usd', '1', '--live',
  ]);
  assert.equal(selectorOverride.status, 1);
  assert.match(selectorOverride.stderr, /cannot override frozen plan option --models/);
});

test('live execution preflights all provider keys before making requests', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'clawbotomy-cli-'));
  const planPath = path.join(root, 'plan.json');
  const bundleDir = path.join(root, 'run-live');
  const env = { ...process.env, ANTHROPIC_API_KEY: 'test-only', OPENAI_API_KEY: '' };
  const preview = spawnSync(process.execPath, [
    'bench/index.js',
    '--models', 'sonnet,gpt-5.4',
    '--tasks', 'instruction-following',
    '--runs', '1',
    '--bundle-dir', bundleDir,
    '--write-plan', planPath,
    '--preflight',
    '--output', 'json',
  ], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    env,
  });
  assert.equal(preview.status, 0, preview.stderr);
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));

  const result = spawnSync(process.execPath, [
    'bench/index.js',
    '--plan', planPath,
    '--confirm-plan', plan.planDigest,
    '--max-requests', String(plan.totals.providerRequests),
    '--max-cost-usd', String(plan.totals.costUpperUsd),
    '--live',
  ], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    env,
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing API key for gpt-5\.4/);
  assert.doesNotMatch(result.stderr, /Anthropic error/);
});
