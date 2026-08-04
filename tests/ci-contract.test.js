const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

test('package scripts keep core and OpenClaw verification explicit', () => {
  const packageDocument = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const scripts = packageDocument.scripts;

  assert.equal(scripts.test, 'npm run test:core');
  assert.match(scripts['test:core'], /tests\/\*\.test\.js/);
  assert.match(scripts['test:openclaw'], /integrations\/openclaw\/\*\.test\.mjs/);
  assert.match(scripts['verify:node'], /test:core/);
  assert.match(scripts['verify:node'], /test:openclaw/);
  assert.match(scripts['verify:node'], /npm run lint/);
  assert.match(scripts['verify:node'], /npm run build/);
});

test('CI names every product-critical verification lane', () => {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');

  for (const command of [
    'npm run test:core',
    'npm run test:openclaw',
    'npm run lint',
    'npm run build',
    'integrations/hermes-agent/test_bridge.py',
    'integrations/hermes-agent/test_registration_smoke.py',
  ]) {
    assert.match(workflow, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(workflow, /repository: NousResearch\/hermes-agent/);
  assert.match(workflow, /ref: 111544d544d6cf6efed9875e116f2daeb76a1211/);
  assert.match(workflow, /CLAWBOTOMY_HERMES_TEST_PLACEHOLDER_AUTH: "1"/);
});
