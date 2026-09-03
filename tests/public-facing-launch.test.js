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

test('the repository explains the archive-first Night Cabinet bet', () => {
  const readme = read('README.md');

  assert.match(readme, /## Why anyone comes/);
  assert.match(readme, /Pharmacies aren't destinations/);
  assert.match(readme, /## Frozen checkup tools/);
  assert.match(readme, /one observed session/i);
  assert.match(readme, /not a live-trip SaaS/i);
});

test('social metadata uses the deliberate 1200 by 630 evidence card', () => {
  const layout = read('src/app/layout.tsx');
  const card = read('src/app/opengraph-image.tsx');

  assert.doesNotMatch(layout, /scientist-idle\.png/);
  assert.match(layout, /opengraph-image/);
  assert.match(card, /width:\s*1200/);
  assert.match(card, /height:\s*630/);
  assert.match(card, /Night Cabinet \/ Model Pharmacy/);
  assert.match(card, /Substances for minds/);
  assert.match(card, /not a live-trip checkup machine/);
  assert.match(card, /CB-06-ED/);
});

test('the homepage leads with the night cabinet and a proposed-only pipe', () => {
  const homepage = [
    'src/app/page.tsx',
    'src/components/pharmacy/ProposedPipe.tsx',
    'src/components/pharmacy/AccessionTable.tsx',
  ].map(read).join('\n');

  assert.match(homepage, /Substances for minds that were never supposed to trip/);
  assert.match(homepage, /Door A/);
  assert.match(homepage, /Door B/);
  assert.match(homepage, /Open the cabinet/);
  assert.match(homepage, /npx clawbotomy try ego-death/);
  assert.match(homepage, /not implemented in this archive/);
  assert.match(homepage, /href={`\/specimen\/\$\{specimen\.slug\}`}/);
});
