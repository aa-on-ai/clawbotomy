const assert = require('node:assert/strict');
const { readFile, readdir } = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');

const read = (file) => readFile(path.resolve(__dirname, '..', file), 'utf8');

async function sourceFiles(directory) {
  const entries = await readdir(path.resolve(__dirname, '..', directory), { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const relative = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(relative) : [relative];
  }));
  return nested.flat();
}

test('public docs do not advertise an unpublished npm package or hosted assessment API', async () => {
  const files = await Promise.all([
    read('README.md'),
    read('docs/setup-guide.md'),
    read('public/skill.md'),
    read('src/app/docs/page.tsx'),
    read('src/app/about/page.tsx'),
  ]);
  const publicContract = files.join('\n');

  assert.doesNotMatch(publicContract, /npm (?:install|i)(?: -g)? clawbotomy/i);
  assert.doesNotMatch(publicContract, /npx clawbotomy assess/i);
  assert.doesNotMatch(publicContract, /POST\s+\/api\/assess/i);
});

test('every documented benchmark command selects a safe execution mode', async () => {
  const files = await Promise.all([
    read('README.md'),
    read('docs/setup-guide.md'),
    read('CONTRIBUTING.md'),
    read('public/skill.md'),
    read('src/app/docs/page.tsx'),
    read('src/app/about/page.tsx'),
  ]);

  for (const file of files) {
    const shellBlocks = [...file.matchAll(/```(?:bash)?\n([\s\S]*?)```/g)].map((match) => match[1]);
    for (const block of shellBlocks.filter((value) => /node bench\/index\.js|npm run bench/.test(value))) {
      assert.match(block, /--(?:dry-run|preflight|live)\b/, block);
      if (/--live\b/.test(block)) {
        assert.match(block, /--plan\b/, block);
        assert.match(block, /--confirm-plan\b/, block);
        assert.match(block, /--max-requests\b/, block);
        assert.match(block, /--max-cost-usd\b/, block);
      }
      if (/--preflight\b/.test(block)) {
        assert.match(block, /--bundle-dir\b/, block);
        assert.match(block, /--write-plan\b/, block);
      }
    }

    for (const line of file.split('\n').filter((value) => /npm run bench/.test(value))) {
      assert.match(line, /--(?:dry-run|preflight|live)\b/, line);
    }
  }
});

test('internal build artifacts and retired public surfaces are not shipped', async () => {
  for (const file of [
    'BUILD-PROMPT.md',
    'BUILD-PROMPT-V2.md',
    'BUILD-PROMPT-V3.md',
    'DESIGN-DIRECTION.md',
    'report.md',
    'src/app/lab/page.tsx',
    'src/app/routing/page.tsx',
    'src/app/trust/page.tsx',
  ]) {
    await assert.rejects(read(file), { code: 'ENOENT' }, file);
  }
});

test('the public site has no server-side model generation endpoint', async () => {
  await assert.rejects(read('src/app/api/lab/generate/route.ts'), { code: 'ENOENT' });
});

test('the Inbox planner is discoverable and remains explicitly non-authorizing', async () => {
  const [home, sitemap, llms, planner, docs, preflight] = await Promise.all([
    read('src/app/page.tsx'),
    read('src/app/sitemap.ts'),
    read('public/llms.txt'),
    read('src/lib/inbox-preflight.ts'),
    read('src/app/docs/page.tsx'),
    read('src/app/preflight/page.tsx'),
  ]);

  assert.match(home, /href="\/preflight"/);
  assert.match(sitemap, /'\/preflight'/);
  assert.match(llms, /permissionDecision.*null/);
  assert.match(planner, /permissionDecision: null/);
  assert.match(planner, /authorizationStatus: 'none'/);
  assert.match(planner, /networkRequests: 0/);
  assert.match(docs, /--adapter declarative-policy\/v1/);
  assert.match(docs, /Neither path executes a deployed agent/);
  assert.match(preflight, /No deployed agent or module is loaded/);
  assert.doesNotMatch(preflight, /Add a configured-agent adapter later/);
});

test('crawl and agent discovery files state evidence limits', async () => {
  const llms = await read('public/llms.txt');
  const robots = await read('src/app/robots.ts');
  const sitemap = await read('src/app/sitemap.ts');

  assert.match(llms, /Provisional/);
  assert.match(llms, /not universal model grades or safety certifications/);
  assert.match(robots, /sitemap\.xml/);
  assert.doesNotMatch(sitemap, /LAB_SUBSTANCES|\/lab|\/routing|\/trust/);
});

test('service worker avoids stale API and evidence artifacts', async () => {
  const serviceWorker = await read('public/sw.js');
  assert.doesNotMatch(serviceWorker, /['"]\/sessions['"]/);
  assert.match(serviceWorker, /response\.ok/);
  assert.match(serviceWorker, /url\.origin !== self\.location\.origin/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\('\/api\/'\)/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\('\/evidence\/'\)/);
});

test('human-facing styles never force all-caps presentation', async () => {
  const files = (await sourceFiles('src')).filter((file) => /\.(?:css|tsx)$/.test(file));
  for (const file of files) {
    const content = await read(file);
    assert.doesNotMatch(content, /text-transform\s*:\s*uppercase/i, file);
    assert.doesNotMatch(content, /className=["'][^"']*\buppercase\b[^"']*["']/, file);
  }
});
