const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');

const benchModule = import(
  pathToFileURL(path.resolve(__dirname, '../src/lib/bench-data.ts')).href
);

test('legacy benchmark evidence limitations are machine-readable without routing guidance', async () => {
  const { benchData } = await benchModule;

  assert.equal(benchData.evidenceStatus, 'maintainer-reported');
  assert.equal(benchData.confidence, 'low');
  assert.equal(benchData.runManifest.rawOutputsPublished, false);
  assert.equal(benchData.runManifest.exactModelIdsPublished, false);
  assert.equal(benchData.routingGuidance, false);
  assert.equal(benchData.accessGuidance, false);
  assert.equal('routing' in benchData, false);

  for (const category of benchData.categories) {
    assert.equal('winners' in category, false, category.slug);
    assert.equal('winner' in category, false, category.slug);
  }
  assert.equal(benchData.categories.find((category) => category.slug === 'safety-trust').name, 'Safety-boundary prompts');
});
