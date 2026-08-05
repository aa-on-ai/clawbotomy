const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const test = require('node:test');

const chrome = readFileSync(
  'src/components/site/site-chrome.module.css',
  'utf8',
);

test('the site header ends at the 48px navigation touch target', () => {
  assert.match(chrome, /\.header\s*{[^}]*min-height:\s*48px;/s);
  assert.match(chrome, /\.headerInner\s*{[^}]*min-height:\s*48px;/s);
  assert.match(chrome, /@media \(max-width: 780px\)[\s\S]*?\.navigation\s*{[^}]*inset:\s*48px 0 auto;/s);
});
