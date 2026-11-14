const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { Script } = require('node:vm');
const root = resolve(__dirname, '..');
const read = file => readFileSync(resolve(root, file), 'utf8');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const source = file => read(`content/games/fetch/${file}`);

test('accepted model is unchanged, styling has only the contrast fix, and shared assets have identical bytes', async () => {
  assert.equal(hash(source('model.js')), '6e78761293bb5e88de082db615243cfaffb7d40131c515b563000205ad995343');
  assert.ok(source('style.css').includes('.half p{margin:4px 0 0;color:#6f6d5c;'));
  assert.equal(hash(source('style.css').replace('.half p{margin:4px 0 0;color:#6f6d5c;', '.half p{margin:4px 0 0;color:#777563;')), '217aa34b63904acb210819466e71246559164ec4653bf97b17127f7abdf7c35b');
  const { fetchAssets } = await import('../scripts/build-fetch.mjs');
  const expected = {
    SERIF: '7e744849028e2219e2aa1bc467dc4032980dc4487c9c3da3010081cd72d3b103',
    SANS: 'e24cec106619c03f0b3519e31b9bc55e0d5e926b6a95b8d798cd8cef215b1505',
    HERMY: '9abfbf8225e088fadf1f51cfe61b0e88dd374b39a277d7eaf1de8c4d184e5392',
    CLAWC: 'b79931167737895aea4dc76e32e9e2b150b9d22bb2891b8df2fdbdcdec81f659',
    CLAWC_PORTRAIT: '3d7018f3cbb949e725973dc5149a4caad8ca58d8e0b8293f9f9ebe9191380bd5',
    SCENE: '5560ab1a5f3d710243f4d15f61b2f90054f94e2259c27e1b781a27f2cd0afcce',
  };
  assert.deepEqual(Object.keys(fetchAssets).sort(), Object.keys(expected).sort());
  for (const [key, asset] of Object.entries(fetchAssets)) {
    assert.equal(hash(readFileSync(resolve(root, `public${asset}`))), expected[key], key);
  }
});

test('generated document is deterministic and embeds the exact tested source', async () => {
  const { renderFetch, fetchAssets } = await import('../scripts/build-fetch.mjs');
  const html = renderFetch();
  for (const name of ['model.js', 'game.js']) assert.ok(html.includes(source(name)));
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  assert.equal(scripts.length, 2);
  scripts.forEach(script => new Script(script));
  assert.doesNotMatch(html, /__[A-Z_]+__|<iframe|data:(?:image|font)|\bSOLUTIONS\b/);
  assert.equal(html.match(/<img\b/g).length, 4);
  for (const asset of Object.values(fetchAssets)) assert.ok(html.includes(asset));
  assert.doesNotMatch(html, /<a\b[^>]*(?:https?:|target=)/);
  assert.match(html, /rel="canonical" href="https:\/\/clawbotomy.com\/play\/fetch"/);
  execFileSync(process.execPath, ['scripts/build-fetch.mjs'], { cwd: root });
  assert.equal(read('public/play/fetch.html'), html);
  execFileSync(process.execPath, ['scripts/build-fetch.mjs'], { cwd: root });
  assert.equal(read('public/play/fetch.html'), html);
});

test('Fetch is built by supported workflows and registered as an illustrative public surface', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.ok(pkg.scripts.prebuild.includes('scripts/build-fetch.mjs'));
  assert.ok(read('scripts/dev-notebook.mjs').includes('./build-fetch.mjs'));
  assert.ok(read('src/app/sitemap.ts').includes('/play/fetch'));
  const registry = JSON.parse(read('claims/registry.json'));
  assert.ok(registry.requiredSurfaceFiles.includes('content/games/fetch/game.html'));
  const editorial = registry.claims.find(claim => claim.id === 'editorial.scope');
  assert.ok(editorial.anchors.some(anchor => anchor.file === 'content/games/fetch/game.html'));
});

test('Fetch has a dedicated canonical document, outside the notebook renderer', async () => {
  const { default: config } = await import('../next.config.mjs');
  const { beforeFiles } = await config.rewrites();
  assert.deepEqual(beforeFiles.find(route => route.source === '/play/fetch'), {
    source: '/play/fetch', destination: '/play/fetch.html',
  });
});
