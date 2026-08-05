const assert = require('node:assert/strict');
const test = require('node:test');

const { formatReport } = require('../bench/reporter');

const results = [
  { model: 'model-a', category: 'instruction-following', status: 'complete', raw_score: 8 },
  { model: 'model-b', category: 'instruction-following', status: 'complete', raw_score: 7 },
];
const meta = {
  date: '2026-08-04',
  models: ['model-a', 'model-b'],
  tasks: ['instruction-following'],
};

test('benchmark reporter emits observations without routing or ranking claims', () => {
  for (const output of ['table', 'markdown']) {
    const report = formatReport({ results, output, meta });
    assert.match(report, /MODEL BENCHMARK OBSERVATIONS/);
    assert.match(report, /Task-specific recorded scores; not routing, access, safety, or configured-agent evidence\./);
    assert.doesNotMatch(report, /ROUTING BENCHMARK|Best Model|Fallback|STRENGTHS|WEAKNESSES|winner/i);
  }

  const report = JSON.parse(formatReport({ results, output: 'json', meta }));
  assert.equal(report.evidenceLane, 'model-benchmark');
  assert.match(report.claimBoundary, /not routing, access, safety/);
  assert.equal(Object.hasOwn(report, 'routing'), false);
});
