const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('checkups package the shipped workflow without unsupported remedy claims', () => {
  const page = read('src/app/checkups/page.tsx');

  assert.match(page, /Run it yourself/);
  assert.match(page, /Agent Behavior Checkup/);
  assert.match(page, /Controlled intervention retest/);
  assert.match(page, /Failed infrastructure is not scored as behavior/);
  assert.match(page, /not a certification, production guarantee, or automatic permission decision/);
  assert.match(page, /href="\/evaluate"/);
  assert.match(page, /href="\/preflight"/);
  assert.match(page, /https:\/\/github\.com\/aa-on-ai\/clawbotomy/);
  assert.match(page, /https:\/\/x\.com\/aa_on_ai/);
  assert.doesNotMatch(page, /Phase 9|Completion Evidence Gate|validated intervention/i);
});

test('checkups are discoverable from the human and machine-facing surfaces', () => {
  const home = read('src/app/page.tsx');
  const header = read('src/components/site/SiteHeader.tsx');
  const footer = read('src/components/site/SiteFooter.tsx');
  const sitemap = read('src/app/sitemap.ts');
  const llms = read('public/llms.txt');

  assert.match(home, /href="\/checkups"/);
  assert.match(home, /Run a private behavior checkup/);
  assert.match(header, /href: '\/checkups', label: 'Checkups'/);
  assert.match(header, /href: '\/bench', label: 'Evidence'/);
  assert.match(header, /href: '\/about', label: 'Method'/);
  assert.match(header, /href="\/evaluate"/);
  assert.match(header, /Run a checkup/);
  assert.doesNotMatch(header, /label: '(Evaluate|Trust|Routing|Lab|Docs)'/);
  assert.match(footer, /href="\/checkups">Checkups/);
  assert.match(sitemap, /'\/checkups'/);
  assert.match(llms, /clawbotomy\.com\/checkups/);
});

test('checkup layout has explicit desktop, tablet, mobile, and reduced-motion contracts', () => {
  const styles = read('src/app/checkups/checkups.module.css');

  assert.match(styles, /@media \(max-width: 960px\)/);
  assert.match(styles, /@media \(max-width: 680px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /grid-template-columns: 1fr;/);
  assert.match(styles, /overflow: clip/);
});
