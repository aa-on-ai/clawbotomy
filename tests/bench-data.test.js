const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');

const benchModule = import(
  pathToFileURL(path.resolve(__dirname, '../src/lib/bench-data.ts')).href
);

test('published benchmark ties and evidence limitations are machine-readable', async () => {
  const { benchData } = await benchModule;

  assert.equal(benchData.evidenceStatus, 'maintainer-reported');
  assert.equal(benchData.confidence, 'low');
  assert.equal(benchData.runManifest.rawOutputsPublished, false);
  assert.equal(benchData.runManifest.exactModelIdsPublished, false);

  for (const category of benchData.categories) {
    const maximum = Math.max(...Object.values(category.scores));
    const expectedWinners = Object.entries(category.scores)
      .filter(([, score]) => score === maximum)
      .map(([model]) => model);
    assert.deepEqual(category.winners, expectedWinners, category.slug);
    assert.equal('winner' in category, false, category.slug);
  }
});
