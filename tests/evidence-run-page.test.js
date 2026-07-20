const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const runPagePath = path.join(root, 'src/app/bench/runs/[runId]/page.tsx');
const runStylesPath = path.join(root, 'src/app/bench/runs/[runId]/run.module.css');

test('the human evidence route is static, validated, non-authorizing, and links raw artifacts', () => {
  const source = fs.readFileSync(runPagePath, 'utf8');

  assert.match(source, /export const dynamicParams = false/);
  assert.match(source, /generateStaticParams\(\)/);
  assert.match(source, /loadPublicEvidenceIndex\(\)/);
  assert.match(source, /const \{ runId \} = await params/);
  assert.match(source, /loadPublicEvidenceRun\(runId\)/);
  assert.match(source, /notFound\(\)/);
  assert.match(source, /Useful proof\. Not comparison-grade\./);
  assert.match(source, /does not rank models, authorize tools, or support a routing decision/);
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

test('registry and homepage point people to the human run page without stale empty copy', () => {
  const bench = fs.readFileSync(path.join(root, 'src/app/bench/page.tsx'), 'utf8');
  const home = fs.readFileSync(path.join(root, 'src/app/page.tsx'), 'utf8');

  assert.match(bench, /href=\{`\/bench\/runs\/\$\{run\.runId\}`\}/);
  assert.doesNotMatch(bench, /href=\{`\/api\/bench\/runs\/\$\{run\.runId\}`\}>Inspect run/);
  assert.match(home, /href=\{`\/bench\/runs\/\$\{latestRun\.runId\}`\}/);
  assert.match(home, /registry contains measured public bundles/);
  assert.doesNotMatch(home, /registry is currently empty/);
});
