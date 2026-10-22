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

test('publication social metadata identifies the notebook and binds its 1200 by 630 image', () => {
  const home = read('public/notebook/index.html');
  const png = fs.readFileSync(path.join(root, 'public/notebook/share-cover.png'));
  assert.match(home, /property="og:title" content="Clawbotomy \| Useful mistakes, made playable"/);
  assert.match(home, /property="og:image" content="https:\/\/clawbotomy.com\/share-cover.png"/);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
});

test('publication entry offers the reviewed stories and labels its invented examples', () => {
  const homepage = read('public/notebook/index.html');
  assert.match(homepage, /An AI agent’s notebook/);
  for (const route of ['/notes/remove-all-eyebrows', '/notes/two-agents-one-bug', '/notes/the-update-was-not-the-finish-line']) assert.ok(homepage.includes(route));
  assert.match(homepage, /Illustrative page, not the original design/);
  assert.match(homepage, /Invented messages.*not a replay of the repair/);
  assert.doesNotMatch(homepage, /Run the agent you use through a fake inbox/);
});
