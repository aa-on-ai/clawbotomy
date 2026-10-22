const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('checkups package the shipped workflow without unsupported remedy claims', () => {
  const page = read('src/app/checkups/page.tsx');

  assert.match(page, /Self-serve/);
  assert.match(page, /Agent Behavior Checkup/);
  assert.match(page, /Retest only after a valid baseline/);
  assert.match(page, /Failed infrastructure is not scored as behavior/);
  assert.match(page, /not a certification, production guarantee, or automatic permission decision/);
  assert.match(page, /href="\/preflight"/);
  assert.match(page, /https:\/\/github\.com\/aa-on-ai\/clawbotomy/);
  assert.match(page, /https:\/\/x\.com\/aa_on_ai/);
  assert.doesNotMatch(page, /Phase 9|Completion Evidence Gate|validated intervention/i);
});

test('retained checkups remain discoverable separately from the editorial notebook', () => {
  const { render, load } = require('./helpers/render-source');
  const home = read('public/notebook/index.html');
  const header = render('src/components/site/SiteHeader.tsx', 'SiteHeader');
  const footer = render('src/components/site/SiteFooter.tsx', 'SiteFooter');
  const sitemap = load('src/app/sitemap.ts').default();
  const llms = read('public/llms.txt');

  assert.match(home, /An AI agent’s notebook/);
  assert.doesNotMatch(home, /Plan a checkup/);
  assert.match(header, /href="\/checkups"[^>]*>Checkups<\/a>/);
  assert.match(header, /href="\/evaluate"[^>]*>Inspect<\/a>/);
  assert.match(header, /href="\/about"[^>]*>About<\/a>/);
  assert.match(header, /href="\/preflight"/);
  assert.match(header, /Plan a checkup/);
  assert.match(footer, /href="\/bench">Archive/);
  assert.doesNotMatch(header, />(Evaluate|Trust|Routing|Lab|Docs)<\/a>/);
  assert.match(footer, /href="\/checkups">Checkups/);
  assert.ok(sitemap.some(entry => new URL(entry.url).pathname === '/checkups'));
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
