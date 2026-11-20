const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const lucide = require('lucide-react');
const read = p => readFileSync(require('node:path').join(__dirname, '..', p), 'utf8');
const hash = s => createHash('sha256').update(s).digest('hex');

test('shared finish is connected to static, generated, framework and game consumers', () => {
  assert.match(read('public/notebook/index.html'), /href="\/controls.css"/);
  assert.match(read('src/app/layout.tsx'), /import '\.\.\/\.\.\/public\/controls.css'/);
  assert.match(read('content/games/fetch/game.html'), /href="\/controls.css"/);
  const css = read('public/controls.css');
  assert.match(css, /--control-radius: 11px/);
  assert.match(css, /min-height: 48px/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /forced-colors: active/);
  assert.doesNotMatch(css, /transition:\s*all|backdrop-filter|inset 0|animation:/);
  assert.doesNotMatch(css, /(?:^|\})\s*[^{}]*(?:\.tile|\.feltSlip|\.feltStitch)[^{}]*\{/);
});

test('game routine symbols are the installed Lucide geometry', () => {
  const html = read('content/games/fetch/game.html');
  const names = { play: 'Play', undo: 'Undo2', restart: 'RotateCcw', next: 'ArrowRight', link: 'ExternalLink', book: 'BookOpen', check: 'Check', chevron: 'ChevronDown', 'volume-on': 'Volume2', 'volume-off': 'VolumeX' };
  for (const [id, name] of Object.entries(names)) {
    const expected = renderToStaticMarkup(React.createElement(lucide[name])).replace(/^<svg[^>]*>|<\/svg>$/g, '');
    const actual = html.match(new RegExp(`<symbol id="i-${id}"[^>]*>([\\s\\S]*?)<\\/symbol>`))[1];
    assert.equal(actual, expected, id);
  }
  assert.match(read('public/controls-icons-LICENSE.txt'), /Copyright \(c\) 2026 Lucide/);
});

test('Fetch mechanics and typography remain the accepted source bytes', () => {
  assert.equal(hash(read('content/games/fetch/model.js')), '6e78761293bb5e88de082db615243cfaffb7d40131c515b563000205ad995343');
  const game = read('content/games/fetch/game.js');
  assert.match(game, /setAttribute\('href',soundOn\?'#i-volume-on':'#i-volume-off'\)/);
  assert.match(read('public/notebook/typography.css'), /ROND fixed at 50/);
  assert.match(read('src/components/ui/Icon.tsx'), /size=\{18\} strokeWidth=\{1\.75\}/);
});
