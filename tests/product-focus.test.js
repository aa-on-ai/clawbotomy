const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const fromRoot = (...parts) => path.join(root, ...parts);
const read = (...parts) => fs.readFileSync(fromRoot(...parts), 'utf8');

const removedPaths = [
  'src/app/lab',
  'src/lib/lab-substances.ts',
  'src/lib/model-metadata.ts',
  'src/lib/trip-reports.ts',
  'src/lib/video-gallery-data.ts',
  'src/lib/example-reports.ts',
  'src/lib/bench-data.ts',
  'src/lib/routing-data.ts',
  'src/components/ThemeToggle.tsx',
  'src/components/backgrounds/magnetic-field.tsx',
  'src/components/backgrounds/paths.tsx',
  'src/components/backgrounds/topography.tsx',
  'src/components/ui/button.tsx',
  'src/lib/utils.ts',
  'public/videos',
  'public/captions',
  'public/scientist-idle.png',
  'BUILD-PROMPT.md',
  'BUILD-PROMPT-V2.md',
  'BUILD-PROMPT-V3.md',
  'DESIGN-DIRECTION.md',
  'report.md',
  'research/substance-reframe.md',
  'research/competitive-landscape.md',
  'tests/bench-data.test.js',
  'tests/routing.test.js',
];

const removedDependencies = [
  '@anthropic-ai/sdk',
  '@google/genai',
  'openai',
  '@supabase/supabase-js',
  'lucide-react',
  'tw-animate-css',
  'class-variance-authority',
  'clsx',
  'radix-ui',
  'tailwind-merge',
];

const staleOverrides = [
  '@hono/node-server',
  'express-rate-limit',
  'fast-uri',
  'hono',
  'ip-address',
  'qs',
  'ws',
];

test('Lab moves permanently to Aftercare while assess compatibility remains', async () => {
  const { default: nextConfig } = await import(pathToFileURL(fromRoot('next.config.mjs')).href);
  const redirects = await nextConfig.redirects();

  assert.deepEqual(redirects, [
    {
      source: '/lab/shuffle',
      destination: 'https://aftercare.clawbotomy.com/shuffle',
      permanent: true,
    },
    {
      source: '/lab',
      destination: 'https://aftercare.clawbotomy.com',
      permanent: true,
    },
    {
      source: '/lab/:slug*',
      destination: 'https://aftercare.clawbotomy.com/:slug*',
      permanent: true,
    },
  ]);
  assert.match(read('src', 'app', 'assess', 'page.tsx'), /redirect\('\/preflight'\)/);
});

test('retired Trust and Routing examples return tiny accessible HTTP 410 pages', async () => {
  for (const route of ['trust', 'routing']) {
    const module = await import(pathToFileURL(fromRoot('src', 'app', route, 'route.ts')).href);
    const response = module.GET();
    const body = await response.text();

    assert.equal(response.status, 410);
    assert.match(response.headers.get('content-type') || '', /^text\/html/);
    assert.match(body, /<html lang="en">/);
    assert.match(body, /<main>/);
    assert.match(body, /retired/i);
    assert.match(body, /unsupported example/i);
    assert.match(body, /href="\/bench"/);
    assert.doesNotMatch(body, /score|permission level|route models/i);
  }
});

test('obsolete product islands, media, docs, tests, and dead modules are absent', () => {
  for (const relative of removedPaths) {
    assert.equal(fs.existsSync(fromRoot(relative)), false, relative);
  }

  const globals = read('src', 'app', 'globals.css');
  assert.doesNotMatch(globals, /\.(?:lab|trust|routing|dp)-|hero-lab|instrument-lab|chaos-(?:bar|pip|number)|speakeasy/i);
});

test('the public product is Plan, Evaluate, Evidence, Docs, and About', () => {
  const header = read('src', 'components', 'site', 'SiteHeader.tsx');
  const sitemap = read('src', 'app', 'sitemap.ts');
  const publicCopy = [
    read('src', 'app', 'page.tsx'),
    read('src', 'app', 'about', 'page.tsx'),
    read('src', 'app', 'docs', 'page.tsx'),
    read('src', 'app', 'terms', 'page.tsx'),
    read('README.md'),
    read('docs', 'setup-guide.md'),
    read('public', 'skill.md'),
    read('public', 'llms.txt'),
  ].join('\n');

  for (const [href, label] of [
    ['/preflight', 'Plan'],
    ['/evaluate', 'Evaluate'],
    ['/bench', 'Evidence'],
    ['/docs', 'Docs'],
    ['/about', 'About'],
  ]) {
    assert.match(header, new RegExp(`href: '${href}', label: '${label}'`));
    assert.match(sitemap, new RegExp(`'${href}'`));
  }

  assert.match(publicCopy, /local-first execution/i);
  assert.match(publicCopy, /browser-local review/i);
  assert.match(publicCopy, /findings/i);
  assert.match(publicCopy, /no finding in (?:the )?fixture/i);
  assert.match(publicCopy, /inconclusive/i);
  assert.doesNotMatch(publicCopy, /March 2026|legacy (?:benchmark|summary|snapshot)|empty registry|permission levels?|trust score|routing explorer|Enter the lab|model-routing benchmarks|behavioral exploration/i);
  assert.doesNotMatch(header, /\/lab|\/trust|\/routing/);
  assert.doesNotMatch(sitemap, /\/lab|\/trust|\/routing|LAB_SUBSTANCES/);
  assert.match(sitemap, /\/bench\/runs\//);
});

test('the current three-run evidence registry is the only public benchmark dataset', async () => {
  const index = JSON.parse(read('public', 'evidence', 'index.json'));
  const { buildBenchIndexPayload } = await import(
    pathToFileURL(fromRoot('src', 'lib', 'bench-index-payload.ts')).href
  );
  const payload = buildBenchIndexPayload(index);
  const bench = read('src', 'app', 'bench', 'page.tsx');
  const structured = read('src', 'lib', 'structured-data.ts');

  assert.equal(payload.schemaVersion, '3.0.0');
  assert.equal(payload.publishedRuns.length, 3);
  assert.equal(payload.latestRunId, payload.publishedRuns[0].runId);
  for (let index = 1; index < payload.publishedRuns.length; index += 1) {
    assert.ok(
      payload.publishedRuns[index - 1].completedAt >= payload.publishedRuns[index].completedAt,
      'published runs must be newest-first',
    );
  }
  assert.match(bench, /Evidence available now/);
  assert.doesNotMatch(JSON.stringify(payload), /benchData|legacySummary|March summary/);
  assert.match(structured, /Clawbotomy Public Evidence Registry/);
  assert.doesNotMatch(structured, /benchData|March 2026|Legacy Routing Benchmark/);
  assert.doesNotMatch(bench, /benchData|Legacy snapshot|Maintainer-reported summary|March 2026/);
});

test('the bench API payload sorts unsorted input without mutating registry order', async () => {
  const { buildBenchIndexPayload } = await import(
    pathToFileURL(fromRoot('src', 'lib', 'bench-index-payload.ts')).href
  );
  const runs = [
    { runId: 'middle', completedAt: '2026-02-01T00:00:00.000Z' },
    { runId: 'oldest', completedAt: '2026-01-01T00:00:00.000Z' },
    { runId: 'newest', completedAt: '2026-03-01T00:00:00.000Z' },
  ];
  const originalOrder = runs.map(({ runId }) => runId);
  const payload = buildBenchIndexPayload({ schemaId: 'fixture/v1', runs });

  assert.deepEqual(payload.publishedRuns.map(({ runId }) => runId), ['newest', 'middle', 'oldest']);
  assert.equal(payload.latestRunId, 'newest');
  assert.deepEqual(runs.map(({ runId }) => runId), originalOrder, 'input registry order must remain unchanged');
});

test('the documented stack matches the installed Next.js major', () => {
  const manifest = JSON.parse(read('package.json'));
  const installedMajor = String(manifest.dependencies.next).match(/\d+/)?.[0];
  assert.ok(installedMajor, 'Next.js dependency must expose a major version');
  assert.match(read('README.md'), new RegExp(`Next\\.js ${installedMajor} \\(App Router\\)`));
});

test('unused runtime dependencies are removed from the manifest and lockfile root', () => {
  const manifest = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));
  const rootDependencies = lock.packages[''].dependencies;

  for (const dependency of removedDependencies) {
    assert.equal(manifest.dependencies?.[dependency], undefined, dependency);
    assert.equal(rootDependencies?.[dependency], undefined, `lockfile root: ${dependency}`);
  }
});

test('obsolete package overrides stay absent while active overrides remain', () => {
  const manifest = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));

  for (const dependency of staleOverrides) {
    assert.equal(manifest.overrides?.[dependency], undefined, `override: ${dependency}`);
    assert.equal(lock.packages[`node_modules/${dependency}`], undefined, `lockfile package: ${dependency}`);
  }

  assert.equal(manifest.overrides.sharp, '0.35.0');
  assert.equal(manifest.overrides.next.postcss, '8.5.10');
});
