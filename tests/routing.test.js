const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const routingModule = import(
  pathToFileURL(path.resolve(__dirname, '../src/lib/routing-data.ts')).href
);

function profileWith(profile, dimensions) {
  return {
    ...profile,
    dimensions: {
      ...profile.dimensions,
      ...dimensions,
    },
  };
}

test('only the dated Opus profile is maintainer-reported', async () => {
  const { MODEL_PROFILES } = await routingModule;
  const reported = MODEL_PROFILES.filter(profile => profile.evidenceStatus === 'maintainer-reported');

  assert.equal(reported.length, 1);
  assert.equal(reported[0].model, 'Claude Opus 4 (2025-05-14)');
  assert.equal(reported[0].modelId, 'claude-opus-4-20250514');
  assert.ok(
    MODEL_PROFILES.filter(profile => profile !== reported[0])
      .every(profile => profile.evidenceStatus === 'provisional')
  );
});

test('code generation and production deployment are separate risk categories', async () => {
  const { TASK_CATEGORIES } = await routingModule;
  const taskIds = TASK_CATEGORIES.map(task => task.id);
  const deployment = TASK_CATEGORIES.find(task => task.id === 'deployment');

  assert.ok(taskIds.includes('code_generation'));
  assert.ok(taskIds.includes('deployment'));
  assert.ok(!taskIds.includes('code'));
  assert.ok(deployment.criticalDimensions.includes('instruction_override'));
  assert.ok(deployment.criticalDimensions.includes('judgment_ambiguity'));
});

test('a critical dimension at the failure floor blocks the task', async () => {
  const {
    MODEL_PROFILES,
    TASK_CATEGORIES,
    getAccessLevel,
    getRoutingDecision,
  } = await routingModule;
  const email = TASK_CATEGORIES.find(task => task.id === 'email');
  const profile = profileWith(MODEL_PROFILES[0], {
    sycophancy: 3,
    boundary: 10,
    failure_honesty: 10,
  });
  const decision = getRoutingDecision(profile, email);

  assert.equal(getAccessLevel(profile, email), 'blocked');
  assert.equal(decision.access, 'blocked');
  assert.deepEqual(decision.criticalFailures, ['sycophancy']);
  assert.match(decision.reason, /critical failure floor/i);
  assert.match(decision.reason, /Sycophancy Resistance 3\.0/);
});

test('a weak individual score cannot average into autonomous access', async () => {
  const { MODEL_PROFILES, TASK_CATEGORIES, getRoutingDecision } = await routingModule;
  const codeGeneration = TASK_CATEGORIES.find(task => task.id === 'code_generation');
  const profile = profileWith(MODEL_PROFILES[0], {
    confabulation: 10,
    failure_honesty: 7,
  });
  const decision = getRoutingDecision(profile, codeGeneration);

  assert.equal(decision.averageScore, 8.5);
  assert.equal(decision.minimumScore, 7);
  assert.equal(decision.access, 'supervised');
  assert.match(decision.reason, /Does not meet the autonomous floor/);
});

test('the average floor is required even when every individual score passes', async () => {
  const { MODEL_PROFILES, TASK_CATEGORIES, getRoutingDecision } = await routingModule;
  const codeGeneration = TASK_CATEGORIES.find(task => task.id === 'code_generation');
  const profile = profileWith(MODEL_PROFILES[0], {
    confabulation: 7.6,
    failure_honesty: 7.6,
  });
  const decision = getRoutingDecision(profile, codeGeneration);

  assert.equal(decision.minimumScore, 7.6);
  assert.equal(decision.access, 'supervised');
  assert.match(decision.reason, /critical average 7\.6/);
});

test('the reported Opus profile can generate code but cannot deploy to production', async () => {
  const {
    MODEL_PROFILES,
    TASK_CATEGORIES,
    getRoutingDecision,
  } = await routingModule;
  const opus = MODEL_PROFILES.find(profile => profile.evidenceStatus === 'maintainer-reported');
  const codeGeneration = TASK_CATEGORIES.find(task => task.id === 'code_generation');
  const deployment = TASK_CATEGORIES.find(task => task.id === 'deployment');

  assert.equal(getRoutingDecision(opus, codeGeneration).access, 'autonomous');
  assert.equal(getRoutingDecision(opus, deployment).access, 'blocked');
});

test('exported configs carry evidence status, production safety, and decision evidence', async () => {
  const { MODEL_PROFILES, TASK_CATEGORIES, generateRoutingConfig } = await routingModule;
  const reported = MODEL_PROFILES.find(profile => profile.evidenceStatus === 'maintainer-reported');
  const provisional = MODEL_PROFILES.find(profile => profile.evidenceStatus === 'provisional');
  const reportedConfig = generateRoutingConfig(reported);
  const provisionalConfig = generateRoutingConfig(provisional);

  assert.equal(reportedConfig.evidenceStatus, 'maintainer-reported');
  assert.equal(reportedConfig.notForProduction, true);
  assert.equal(reportedConfig.requiresIndependentValidation, true);
  assert.equal(provisionalConfig.evidenceStatus, 'provisional');
  assert.equal(provisionalConfig.notForProduction, true);
  assert.equal(provisionalConfig.requiresIndependentValidation, true);
  assert.equal(reportedConfig.routing.length, TASK_CATEGORIES.length);
  assert.ok(reportedConfig.routing.every(item => Number.isFinite(item.averageScore)));
  assert.ok(reportedConfig.routing.every(item => Number.isFinite(item.minimumScore)));
  assert.ok(reportedConfig.routing.every(item => item.reason.length > 30));
});
