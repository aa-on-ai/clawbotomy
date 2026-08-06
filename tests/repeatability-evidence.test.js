const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { readBundle } = require('../bench/bundle');

const root = path.resolve(__dirname, '..');
const publicRunId = 'run-a035f620a2daab63f2ee';
const publicRunPath = path.join(root, 'public/evidence', publicRunId);

test('the public repeatability bundle has five complete repeats for every case', () => {
  const bundle = readBundle(publicRunPath, { requireComplete: true });
  const aggregate = bundle.summary.aggregates[0];
  const recordsByCase = new Map();

  for (const record of bundle.records) {
    const records = recordsByCase.get(record.case_id) || [];
    records.push(record);
    recordsByCase.set(record.case_id, records);
  }

  assert.equal(bundle.manifest.plan.configuration.runs, 5);
  assert.deepEqual(bundle.summary.totals, {
    scheduled: 25,
    records: 25,
    completed: 25,
    scored: 25,
    failed: 0,
  });
  assert.equal(recordsByCase.size, 5);
  for (const records of recordsByCase.values()) {
    assert.equal(records.length, 5);
    assert.ok(records.every((record) => record.status === 'complete'));
    assert.ok(records.every((record) => record.evaluation_status === 'scored'));
  }

  assert.equal(aggregate.eligible, true);
  assert.deepEqual(aggregate.eligibilityReasons, []);
  assert.equal(aggregate.meanScore, 9.6);
  assert.equal(aggregate.minScore, 7.5);
  assert.equal(aggregate.maxScore, 10);
  assert.deepEqual(aggregate.model.reportedModelIds, ['qwen3:4b']);
  assert.equal(bundle.manifest.evidence.reproducibilityStatus, 'complete');
  assert.equal(bundle.manifest.evidence.reviewStatus, 'maintainer-self-reported');
  assert.equal(bundle.manifest.evidence.authorizationStatus, 'non-authorizing');
});

test('repeated-run interpretation stays descriptive and groups raw repeats by case', () => {
  const source = fs.readFileSync(path.join(root, 'src/app/bench/runs/[runId]/page.tsx'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'src/app/bench/runs/[runId]/run.module.css'), 'utf8');

  assert.match(source, /aggregateEligible \? 'Repeated-run aggregate\. Still not a ranking\.'/);
  assert.match(source, /descriptive coverage, not proof of repeatability/);
  assert.match(source, /Only one model is present, so no cross-model comparison exists/);
  assert.match(source, /Cross-model ranking, safety certification, production access/);
  assert.match(source, /data-evidence-case-group/);
  assert.match(source, /groupEvidenceRecords\(records\)/);
  assert.match(source, /Inspect repeat \$\{repeatIndex \+ 1\} evidence/);
  assert.match(source, /<EvidenceCaseDisclosure/);
  assert.match(source, /Review a case, then open its repeats only when needed/);
  assert.match(styles, /\.repeatList/);
  assert.match(styles, /\.repeatHeader/);
  assert.doesNotMatch(source, /support(?:s|ing)? within-model repeatability/);
});
