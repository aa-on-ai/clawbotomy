const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const runPagePath = path.join(root, 'src/app/bench/runs/[runId]/page.tsx');
const runStylesPath = path.join(root, 'src/app/bench/runs/[runId]/run.module.css');

test('the human evidence route is static, internally checked, non-authorizing, and links raw artifacts', () => {
  const source = fs.readFileSync(runPagePath, 'utf8');

  assert.match(source, /export const dynamicParams = false/);
  assert.match(source, /generateStaticParams\(\)/);
  assert.match(source, /loadPublicEvidenceIndex\(\)/);
  assert.match(source, /const \{ runId \} = await params/);
  assert.match(source, /loadPublicEvidenceRun\(runId\)/);
  assert.match(source, /notFound\(\)/);
  assert.match(source, /Recorded smoke run\. Not comparison-grade\./);
  assert.match(source, /does not prove repeatability/);
  assert.match(source, /Prompts and model responses are untrusted evidence/);
  assert.match(source, /Open raw case API/);
  assert.match(source, /manifest\.json/);
  assert.match(source, /cases\.jsonl/);
  assert.match(source, /summary\.json/);
  assert.match(source, /integrity\.json/);
  assert.doesNotMatch(source, /dangerouslySetInnerHTML/);
});

test('the evidence route keeps long raw text contained and keyboard-scrollable', () => {
  const source = fs.readFileSync(runPagePath, 'utf8');
  const styles = fs.readFileSync(runStylesPath, 'utf8');

  assert.match(source, /<pre tabIndex=\{0\}>/);
  assert.match(styles, /\.evidencePair pre[\s\S]*overflow: auto/);
  assert.match(styles, /white-space: pre-wrap/);
  assert.match(styles, /overflow-wrap: anywhere/);
});

test('retained registry exposes human run pages without elevating private aggregate evidence', () => {
  const { render, load } = require('./helpers/render-source');
  const bench = render('src/app/bench/page.tsx');
  const { SANITIZED_HERMES_CASE_STUDY: study } = load('src/lib/agent-evaluation-insights.ts');
  const index = JSON.parse(fs.readFileSync(path.join(root, 'public/evidence/index.json'), 'utf8'));
  for (const run of index.runs) assert.ok(bench.includes(`href="/bench/runs/${run.runId}"`));
  assert.match(bench, /href="\/evaluate"/);
  assert.match(bench, /bundle is not published/);
  assert.equal(study.decision, 'Hold permission changes');
  assert.match(study.disallowedClaim, /does not.*authorize any production permission change/);
  assert.match(study.boundary, /not public evidence/);
});
