const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');

const { readBundle } = require('../bench/bundle');

const root = path.resolve(__dirname, '..');
const evidenceRoot = path.join(root, 'public/evidence');
const comparisonModule = import(
  pathToFileURL(path.join(root, 'src/lib/evidence-comparison.ts')).href,
);

function publicBundles() {
  const index = JSON.parse(fs.readFileSync(path.join(evidenceRoot, 'index.json'), 'utf8'));
  return index.runs.map((entry) => readBundle(path.join(evidenceRoot, entry.runId), { requireComplete: true }));
}

function clone(value) {
  return structuredClone(value);
}

test('compatible eligible bundles produce one bounded Qwen size comparison', async () => {
  const { buildEvidenceComparisons } = await comparisonModule;
  const comparisons = buildEvidenceComparisons(publicBundles());

  assert.equal(comparisons.length, 1);
  const comparison = comparisons[0];
  assert.equal(comparison.category, 'instruction-following');
  assert.equal(comparison.runsPerCase, 5);
  assert.equal(comparison.caseCount, 5);
  assert.equal(comparison.totalRecords, 50);
  assert.equal(comparison.reviewStatus, 'maintainer-self-reported');
  assert.equal(comparison.authorizationStatus, 'non-authorizing');
  assert.equal(comparison.higherMeanSubject?.modelAlias, 'local:qwen3:4b');
  assert.equal(comparison.meanDelta, 0.7748);
  assert.deepEqual(
    comparison.subjects.map((subject) => ({
      model: subject.modelAlias,
      mean: subject.meanScore,
      range: [subject.minScore, subject.maxScore],
      scored: subject.scored,
    })),
    [
      { model: 'local:qwen3:4b', mean: 9.6, range: [7.5, 10], scored: 25 },
      { model: 'local:qwen3:1.7b', mean: 8.8252, range: [3.33, 10], scored: 25 },
    ],
  );
  assert.deepEqual(comparison.caseRows.map((row) => row.caseId), ['if-01', 'if-02', 'if-03', 'if-04', 'if-05']);
  assert.deepEqual(comparison.caseRows.find((row) => row.caseId === 'if-04')?.scores, [10, 10]);
});

test('comparison generation fails closed on provenance, protocol, identity, or coverage drift', async () => {
  const { buildEvidenceComparisons } = await comparisonModule;
  const bundles = publicBundles();
  const control = bundles.find((bundle) => bundle.summary.aggregates[0].model.alias === 'local:qwen3:4b'
    && bundle.summary.aggregates[0].eligible === true);
  const subject = bundles.find((bundle) => bundle.summary.aggregates[0].model.alias === 'local:qwen3:1.7b');
  assert.ok(control);
  assert.ok(subject);

  const mutations = [
    (bundle) => { bundle.manifest.plan.source.dirty = true; },
    (bundle) => { bundle.manifest.plan.implementationSha256['bench/runner.js'] = 'f'.repeat(64); },
    (bundle) => { bundle.manifest.plan.caseExecutions[0].caseSha256 = 'e'.repeat(64); },
    (bundle) => { bundle.summary.aggregates[0].model.reportedModelIds = ['wrong-model']; },
    (bundle) => { bundle.summary.aggregates[0].eligible = false; },
    (bundle) => { bundle.records.pop(); },
  ];

  for (const mutate of mutations) {
    const changed = clone(subject);
    mutate(changed);
    assert.deepEqual(buildEvidenceComparisons([clone(control), changed]), []);
  }
});
