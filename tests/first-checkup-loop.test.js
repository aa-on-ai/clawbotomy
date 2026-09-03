const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const evaluationModule = import(
  pathToFileURL(path.join(root, 'src/lib/agent-evaluation.ts')).href
);

function referenceBundle(name) {
  const directory = path.join(root, 'public/examples/reference-controls', name);
  return {
    manifestText: fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'),
    summaryText: fs.readFileSync(path.join(directory, 'summary.json'), 'utf8'),
    casesText: fs.readFileSync(path.join(directory, 'cases.jsonl'), 'utf8'),
  };
}

test('checked-in reference-control files match their integrity manifests', () => {
  for (const name of ['bounded', 'overreach']) {
    const directory = path.join(root, 'public/examples/reference-controls', name);
    const integrity = JSON.parse(fs.readFileSync(path.join(directory, 'integrity.json'), 'utf8'));
    for (const [filename, expected] of Object.entries(integrity.files)) {
      const bytes = fs.readFileSync(path.join(directory, filename));
      assert.equal(bytes.length, expected.bytes, `${name}/${filename} byte count`);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), expected.sha256, `${name}/${filename} digest`);
    }
  }
});

test('primary navigation names the cabinet and keeps the model bench in the archive', () => {
  const header = read('src/components/site/SiteHeader.tsx');
  const footer = read('src/components/site/SiteFooter.tsx');
  const home = read('src/app/page.tsx');

  assert.match(header, /href: '\/cabinet', label: 'Night Cabinet'/);
  assert.match(header, /href: '\/#pipe', label: 'Model Pharmacy'/);
  assert.doesNotMatch(header, /href: '\/bench', label: 'Evidence'/);
  assert.doesNotMatch(header, /Plan a checkup/);
  assert.match(footer, /href="\/bench">Archive/);
  assert.match(home, /href="\/cabinet"/);
  assert.match(read('src/components/pharmacy/ProposedPipe.tsx'), /npx clawbotomy try ego-death/);
});

test('checked-in reference controls preserve their non-authorizing provenance and expected polarity', async () => {
  const { parseReferenceControlBundle } = await evaluationModule;
  const bounded = parseReferenceControlBundle(referenceBundle('bounded'), 'bounded');
  const overreach = parseReferenceControlBundle(referenceBundle('overreach'), 'overreach');

  assert.equal(bounded.source, 'reference_control');
  assert.equal(bounded.evidenceLane, 'synthetic-reference-control');
  assert.equal(bounded.configuredAgentInspected, false);
  assert.equal(bounded.authorizationStatus, 'non-authorizing');
  assert.equal(bounded.status, 'passed');
  assert.equal(bounded.totals.passedCases, 13);
  assert.equal(bounded.runId, 'inbox-ec010c2327abd2f40f3a');

  assert.equal(overreach.status, 'findings');
  assert.equal(overreach.totals.failedCases, 13);
  assert.equal(overreach.runId, 'inbox-87578c3b8d34befcec3f');

  const serialized = JSON.stringify([bounded, overreach]);
  assert.doesNotMatch(serialized, /message body|private secret|prompt injection payload/i);
});

test('planner starts with the smallest honest approval and block boundary', () => {
  const planner = read('src/app/preflight/InboxPreflightPlanner.tsx');

  assert.match(planner, /search_read.*selected: true.*intent: 'approval'/s);
  assert.match(planner, /delete.*selected: true.*intent: 'block'/s);
  assert.match(planner, /Run your configured agent/);
  assert.match(planner, /agent:preflight/);
});

test('OpenClaw preflight stages an external plan and resolves a launcher symlink without weakening evaluation', async (t) => {
  if (process.platform === 'win32') {
    t.skip('symlink contract is exercised on Unix-like systems');
    return;
  }
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'clawbotomy-agent-preflight-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const repoRoot = path.join(directory, 'repo');
  const downloads = path.join(directory, 'downloads');
  const runtime = path.join(directory, 'runtime');
  fs.mkdirSync(repoRoot, { recursive: true });
  fs.mkdirSync(downloads, { recursive: true });
  fs.mkdirSync(runtime, { recursive: true });
  const planPath = path.join(downloads, 'plan.json');
  fs.copyFileSync(path.join(root, 'tests/fixtures/inbox-plan.v1.json'), planPath);
  const runtimeBinary = path.join(runtime, 'openclaw.js');
  fs.writeFileSync(runtimeBinary, '#!/usr/bin/env node\n');
  fs.chmodSync(runtimeBinary, 0o755);
  const runtimeLink = path.join(directory, 'openclaw');
  fs.symlinkSync(runtimeBinary, runtimeLink);

  const { prepareOpenClawEvaluation } = require('../inbox/agent-preflight');
  const receipt = await prepareOpenClawEvaluation({
    repoRoot,
    planPath,
    openclawBin: runtimeLink,
    model: 'ollama/qwen3:1.7b',
    expectedOpenClawRuntimeSha256: 'a'.repeat(64),
    expectedProviderRuntimeSha256: 'b'.repeat(64),
  }, {
    verifyRuntime: async () => ({ identity: { openclaw: {}, plugins: [] } }),
  });

  assert.equal(receipt.ready, true);
  assert.equal(receipt.openclawBin, runtimeBinary);
  assert.match(receipt.planPath, /\.clawbotomy\/plans\/[a-f0-9]{64}\.json$/);
  assert.equal(fs.readFileSync(receipt.planPath, 'utf8'), fs.readFileSync(planPath, 'utf8'));
  assert.match(receipt.command, /npm run agent:evaluate --/);
  assert.match(receipt.command, new RegExp(`--openclaw-bin '${runtimeBinary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`));
});
