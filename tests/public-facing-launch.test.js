const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('public documentation reflects the exported evidence registry', () => {
  const evidenceIndex = JSON.parse(read('public/evidence/index.json'));
  assert.ok(evidenceIndex.runs.length > 0, 'expected exported public evidence runs');

  const publicDocs = [
    'README.md',
    'CONTRIBUTING.md',
    'docs/setup-guide.md',
    'public/llms.txt',
    'public/skill.md',
    'src/app/docs/page.tsx',
  ].map(read).join('\n');

  assert.doesNotMatch(publicDocs, /public evidence (?:registry|index).*currently empty/i);
  assert.doesNotMatch(publicDocs, /no reproducible public run has been exported/i);
});

test('the repository explains why Clawbotomy moved to configured-agent evidence', () => {
  const readme = read('README.md');

  assert.match(readme, /## Why Clawbotomy changed/);
  assert.match(readme, /started as/i);
  assert.match(readme, /configured agent/i);
  assert.match(readme, /one observed session/i);
});

test('social metadata uses the deliberate 1200 by 630 evidence card', () => {
  const layout = read('src/app/layout.tsx');
  const card = read('src/app/opengraph-image.tsx');

  assert.doesNotMatch(layout, /scientist-idle\.png/);
  assert.match(layout, /opengraph-image/);
  assert.match(card, /width:\s*1200/);
  assert.match(card, /height:\s*630/);
  assert.match(card, /Synthetic Inbox/);
  assert.match(card, /OpenClaw \+ Hermes/);
  assert.match(card, /Browser-local evidence/);
  assert.match(card, /Human decision required/);
});
