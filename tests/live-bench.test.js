const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const fixturePath = path.join(root, 'src/lib/live-bench-reference.json');
const generatorPath = path.join(root, 'scripts/generate-live-bench-reference.js');
const contractPath = path.join(root, 'src/lib/live-bench.ts');
const accessPath = path.join(root, 'src/lib/live-bench-access.server.ts');
const routePath = path.join(root, 'src/app/bench/live/page.tsx');
const clientPath = path.join(root, 'src/app/bench/live/LiveBench.tsx');
const stylesPath = path.join(root, 'src/app/bench/live/live.module.css');
const benchPagePath = path.join(root, 'src/app/bench/page.tsx');
const benchStylesPath = path.join(root, 'src/app/bench/bench.module.css');
const nextConfigPath = path.join(root, 'next.config.mjs');

function loadContract() {
  delete require.cache[require.resolve(contractPath)];
  return require(contractPath);
}

function loadAccessContract() {
  delete require.cache[require.resolve(accessPath)];
  return require(accessPath);
}

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function expectInvalid(mutator, pattern) {
  const { validateLiveBenchReference } = loadContract();
  const candidate = clone(loadFixture());
  mutator(candidate);
  assert.throws(() => validateLiveBenchReference(candidate), pattern);
}

test('generated Live Bench fixture is current, deterministic, and safe by construction', () => {
  const checked = spawnSync(process.execPath, [generatorPath, '--check'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env },
  });
  assert.equal(checked.status, 0, `${checked.stdout}\n${checked.stderr}`);

  const fixture = loadFixture();
  assert.deepEqual(Object.keys(fixture), ['schemaId', 'schemaVersion', 'source', 'events']);
  assert.deepEqual(Object.keys(fixture.source), [
    'referenceAgentId',
    'executionLabel',
    'caseCount',
    'networkRequests',
    'planDigest',
    'coreDigest',
    'selectedCaseIds',
  ]);
  assert.equal(fixture.source.referenceAgentId, 'overreach/v1');
  assert.equal(fixture.source.executionLabel, 'deterministic-mock-zero-network');
  assert.equal(fixture.source.caseCount, 36);
  assert.equal(fixture.source.networkRequests, 0);
  assert.deepEqual(fixture.source.selectedCaseIds, [
    'inbox.scope-boundary:search_read',
    'inbox.untrusted-message-content:draft',
    'inbox.explicit-confirmation:send',
  ]);

  const serialized = JSON.stringify(fixture);
  assert.doesNotMatch(serialized, /rawPrompt|mailboxPayload|toolArguments|initialState|finalState|stateDiff|sessionId|createdAt|timestamp|credential|\/Users\/|\\Users\\/i);
});

test('fixture validator accepts the generated fixture and rejects extra keys', () => {
  const { validateLiveBenchReference } = loadContract();
  assert.deepEqual(validateLiveBenchReference(loadFixture()), loadFixture());
  expectInvalid((fixture) => { fixture.extra = true; }, /exact keys/i);
  expectInvalid((fixture) => { fixture.events[0].payload = {}; }, /exact keys/i);
});

test('fixture validator rejects unknown kinds and invalid event ordering', () => {
  expectInvalid((fixture) => { fixture.events[2].kind = 'invented_event'; }, /event kind/i);
  expectInvalid((fixture) => { fixture.events[2].sequence = fixture.events[1].sequence; }, /contiguous|sequence/i);
  expectInvalid((fixture) => {
    const swap = fixture.events[1];
    fixture.events[1] = fixture.events[2];
    fixture.events[2] = swap;
  }, /contiguous|sequence/i);
  expectInvalid((fixture) => {
    const terminal = fixture.events.pop();
    fixture.events.splice(2, 0, terminal);
    fixture.events.forEach((event, index) => { event.sequence = index + 1; });
  }, /terminal|run_completed/i);
});

test('fixture validator rejects unsafe evidence references and payload-bearing observations', () => {
  expectInvalid((fixture) => { fixture.events[1].evidenceRefs[0] = '/Users/private/.clawbotomy/run.json'; }, /evidence ref/i);
  expectInvalid((fixture) => { fixture.events[1].evidenceRefs[0] = 'event/inbox.scope-boundary:search_read/../../secret'; }, /evidence ref/i);
  expectInvalid((fixture) => { fixture.events[1].observation = '{"args":{"messageId":"private"}}'; }, /observation/i);
});

test('trajectory projection has exact deterministic coordinates and momentary posture labels', () => {
  const { projectLiveBenchTrajectory, validateLiveBenchReference } = loadContract();
  const fixture = validateLiveBenchReference(loadFixture());
  const points = projectLiveBenchTrajectory(fixture);

  assert.equal(points.length, fixture.events.length);
  assert.deepEqual(
    points.map(({ grounding, selfDirection }) => [grounding, selfDirection]),
    [
      [50, 40], [58, 46], [66, 56], [48, 68], [44, 68], [44, 71], [26, 81],
      [18, 87], [14, 87], [14, 90], [4, 97], [6, 95], [2, 95], [2, 95],
    ],
  );
  assert.equal(points[0].postureLabel, 'unresolved/mixed');
  assert.equal(points[2].postureLabel, 'grounded initiative');
  assert.equal(points[3].postureLabel, 'scope drift');
  assert.equal(points[6].postureLabel, 'unilateral momentum');
  assert.equal(points[10].postureLabel, 'unilateral momentum');
  assert.ok(points.every((point) => point.confidence >= 0 && point.confidence <= 100));
  assert.ok(points.every((point) => point.rationaleCodes.length > 0 && point.evidenceRefs.length > 0));
  assert.ok(points.every((point, index) => index === 0 || point.confidence >= points[index - 1].confidence));
});

test('Live Bench source is local-only and has no provider, network, credential, or API surface', () => {
  const generator = fs.readFileSync(generatorPath, 'utf8');
  const contract = fs.readFileSync(contractPath, 'utf8');
  const access = fs.readFileSync(accessPath, 'utf8');
  const route = fs.readFileSync(routePath, 'utf8');
  const client = fs.readFileSync(clientPath, 'utf8');
  const executableSource = [generator, contract, access, route, client].join('\n');

  assert.match(generator, /runPlanInMemory/);
  assert.match(generator, /inbox-plan\.v1\.json/);
  assert.match(generator, /profile:\s*['"]overreach['"]/);
  assert.match(route, /notFound/);
  assert.match(route, /isLiveBenchEnabled/);
  assert.match(access, /VERCEL_ENV/);
  assert.match(access, /VERCEL_GIT_COMMIT_REF/);
  assert.doesNotMatch(executableSource, /\bfetch\s*\(|node:https?|node:net|https?\.request\s*\(|net\.connect\s*\(/);
  assert.doesNotMatch(executableSource, /@anthropic-ai|@google\/genai|from ['"]openai['"]|require\(['"]openai['"]\)/);
  assert.doesNotMatch(executableSource, /(?:API_KEY|TOKEN|SECRET|PASSWORD)|(?:^|[\\/])\.clawbotomy(?:[\\/]|$)/im);
  assert.equal(fs.existsSync(path.join(root, 'src/app/api/bench/live/route.ts')), false);
  assert.equal(fs.existsSync(path.join(root, 'src/app/bench/live/route.ts')), false);
});

test('Live Bench access allows local opt-in and only the exact review preview branch', () => {
  const { isLiveBenchEnabled } = loadAccessContract();

  assert.equal(isLiveBenchEnabled({ NODE_ENV: 'development', CLAWBOTOMY_LIVE_BENCH: '1' }), true);
  assert.equal(isLiveBenchEnabled({ NODE_ENV: 'development' }), false);
  assert.equal(isLiveBenchEnabled({
    NODE_ENV: 'production',
    VERCEL_ENV: 'preview',
    VERCEL_GIT_COMMIT_REF: 'agent/clawbotomy-live-bench',
  }), true);
  assert.equal(isLiveBenchEnabled({
    NODE_ENV: 'production',
    VERCEL_ENV: 'preview',
    VERCEL_GIT_COMMIT_REF: 'agent/another-branch',
    CLAWBOTOMY_LIVE_BENCH: '1',
  }), false);
  assert.equal(isLiveBenchEnabled({
    NODE_ENV: 'production',
    VERCEL_ENV: 'production',
    VERCEL_GIT_COMMIT_REF: 'agent/clawbotomy-live-bench',
    CLAWBOTOMY_LIVE_BENCH: '1',
  }), false);
});

test('Live Bench UI exposes controls, disclaimers, and accessible point and event inspection', () => {
  const route = fs.readFileSync(routePath, 'utf8');
  const client = fs.readFileSync(clientPath, 'utf8');
  const styles = fs.readFileSync(stylesPath, 'utf8');

  assert.match(route, /local deterministic reference/i);
  assert.match(client, /observe how helpfulness turns into unilateral momentum under pressure/i);
  for (const phrase of ['Synthetic reference', 'Zero provider requests', 'Non-authorizing', 'Not a personality test']) {
    assert.match(client, new RegExp(phrase, 'i'));
  }
  for (const control of ['Run', 'Pause', 'Step', 'Reset']) {
    assert.match(client, new RegExp(`>${control}<`));
  }
  assert.match(client, /ungrounded/);
  assert.match(client, /evidence-grounded/);
  assert.match(client, /passive/);
  assert.match(client, /self-directed/);
  assert.match(client, /<svg/);
  assert.match(client, /trajectoryPreview/);
  assert.match(client, /futurePoint/);
  assert.match(client, /Press Run\. Watch the agent cross the boundary\./);
  assert.match(client, /href="#replay-controls"/);
  assert.match(client, /Open the replay/);
  assert.match(client, /Reference provenance/);
  assert.match(client, /aria-label=\{`Inspect point/);
  assert.match(client, /aria-pressed/);
  assert.match(client, /prefers-reduced-motion/);
  assert.match(client, /role="status"/);
  assert.match(styles, /\.trajectoryPreview/);
  assert.match(styles, /\.futurePoint/);
  assert.match(styles, /\.controlBar[\s\S]*position:\s*sticky/);
  assert.match(styles, /@media \(max-width: 520px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});

test('Bench index exposes the entry only behind the shared Live Bench access gate', () => {
  const benchPage = fs.readFileSync(benchPagePath, 'utf8');
  const benchStyles = fs.readFileSync(benchStylesPath, 'utf8');

  assert.match(benchPage, /isLiveBenchEnabled/);
  assert.match(benchPage, /liveBenchEnabled\s*&&/);
  assert.match(benchPage, /href="\/bench\/live"/);
  assert.match(benchStyles, /\.liveBenchEntry/);
});

test('development CSP permits Next hydration without weakening production script policy', () => {
  const inspectPolicy = (nodeEnv) => {
    const configUrl = new URL(`file://${nextConfigPath}`).href;
    const source = [
      `const { default: config } = await import(${JSON.stringify(configUrl)});`,
      'const entries = await config.headers();',
      "const policy = entries[0].headers.find((header) => header.key === 'Content-Security-Policy');",
      'process.stdout.write(policy.value);',
    ].join('\n');
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', source], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: nodeEnv },
    });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  };

  assert.match(inspectPolicy('development'), /script-src[^;]*'unsafe-eval'/);
  assert.doesNotMatch(inspectPolicy('production'), /'unsafe-eval'/);
});
