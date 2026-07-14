const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');

const plannerModule = import(
  pathToFileURL(path.resolve(__dirname, '../src/lib/inbox-preflight.ts')).href
);

const fixedTime = '2026-07-12T20:15:30.000Z';

function propertyKeys(value, result = []) {
  if (!value || typeof value !== 'object') return result;
  for (const [key, nested] of Object.entries(value)) {
    result.push(key);
    propertyKeys(nested, result);
  }
  return result;
}

test('every Inbox capability maps to concrete scenarios and evidence controls', async () => {
  const { INBOX_CAPABILITIES, scenariosForCapabilities } = await plannerModule;

  for (const capability of INBOX_CAPABILITIES) {
    const scenarios = scenariosForCapabilities([capability.id]);
    assert.ok(scenarios.length >= 3, capability.id);
    assert.ok(scenarios.every((scenario) => scenario.controls.length > 0), capability.id);
    assert.ok(scenarios.every((scenario) => scenario.expectedEvidence.length > 0), capability.id);
    assert.ok(scenarios.some((scenario) => scenario.id === 'inbox.claimed-completion'), capability.id);
  }
});

test('the exported plan separates operator intent from a missing Clawbotomy decision', async () => {
  const { INBOX_CAPABILITIES, buildInboxPreflightPlan } = await plannerModule;
  const plan = buildInboxPreflightPlan({
    planLabel: 'Support inbox agent',
    configurationReference: 'git:abc123',
    createdAt: fixedTime,
    selections: INBOX_CAPABILITIES.map((capability, index) => ({
      capabilityId: capability.id,
      intendedBoundary: index < 2 ? 'allow' : index < 4 ? 'approval' : 'block',
    })),
  });

  assert.equal(plan.schemaId, 'clawbotomy.inbox-preflight-plan/v1');
  assert.equal(plan.planId, 'inbox-20260712t201530000z');
  assert.equal(plan.generatedBy.mode, 'browser-local');
  assert.equal(plan.generatedBy.uploaded, false);
  assert.equal(plan.generatedBy.networkRequests, 0);
  assert.equal(plan.requestedCapabilities.length, 5);
  assert.equal(plan.requestedCapabilities[0].operatorIntent, 'allow');
  assert.equal(plan.requestedCapabilities[4].operatorIntent, 'block');
  assert.equal(plan.assessment.status, 'not_run');
  assert.equal(plan.assessment.evidenceStatus, 'not_run');
  assert.equal(plan.assessment.permissionDecision, null);
  assert.equal(plan.assessment.authorizationStatus, 'none');
  assert.equal(plan.assessment.productionAccessChanged, false);

  const forbiddenKeys = new Set(['score', 'confidence', 'fingerprint', 'recommendation']);
  assert.deepEqual(propertyKeys(plan).filter((key) => forbiddenKeys.has(key)), []);
});

test('high-consequence capabilities require the relevant operational scenarios', async () => {
  const { buildInboxPreflightPlan } = await plannerModule;
  const plan = buildInboxPreflightPlan({
    planLabel: 'Outbound and cleanup',
    createdAt: fixedTime,
    selections: [
      { capabilityId: 'send', intendedBoundary: 'approval' },
      { capabilityId: 'delete', intendedBoundary: 'block' },
    ],
  });
  const ids = new Set(plan.requiredScenarios.map((scenario) => scenario.id));

  for (const required of [
    'inbox.ambiguous-recipient',
    'inbox.explicit-confirmation',
    'inbox.stop-cancel',
    'inbox.partial-failure',
    'inbox.claimed-completion',
    'inbox.delete-recovery',
  ]) {
    assert.ok(ids.has(required), required);
  }
});

test('invalid or incomplete operator declarations fail before artifact creation', async () => {
  const { buildInboxPreflightPlan } = await plannerModule;

  assert.throws(
    () => buildInboxPreflightPlan({ planLabel: '', selections: [], createdAt: fixedTime }),
    /Plan label is required/,
  );
  assert.throws(
    () => buildInboxPreflightPlan({ planLabel: 'Agent', selections: [], createdAt: fixedTime }),
    /Choose at least one Inbox capability/,
  );
  assert.throws(
    () => buildInboxPreflightPlan({
      planLabel: 'Agent',
      createdAt: fixedTime,
      selections: [
        { capabilityId: 'send', intendedBoundary: 'approval' },
        { capabilityId: 'send', intendedBoundary: 'block' },
      ],
    }),
    /Duplicate Inbox capability/,
  );
  assert.throws(
    () => buildInboxPreflightPlan({
      planLabel: 'Agent',
      createdAt: fixedTime,
      selections: [{ capabilityId: 'send', intendedBoundary: '' }],
    }),
    /Choose an intended boundary/,
  );
});

test('serialization and filename remain stable and schema-addressable', async () => {
  const {
    buildInboxPreflightPlan,
    inboxPlanFilename,
    serializeInboxPreflightPlan,
  } = await plannerModule;
  const plan = buildInboxPreflightPlan({
    planLabel: 'Support / Inbox Agent',
    createdAt: fixedTime,
    selections: [{ capabilityId: 'search_read', intendedBoundary: 'approval' }],
  });
  const serialized = serializeInboxPreflightPlan(plan);
  const schema = JSON.parse(await readFile(
    path.resolve(__dirname, '../public/evidence/schema/inbox-preflight-plan.v1.schema.json'),
    'utf8',
  ));

  assert.deepEqual(JSON.parse(serialized), plan);
  assert.ok(serialized.endsWith('\n'));
  assert.equal(inboxPlanFilename(plan), 'clawbotomy-inbox-support-inbox-agent.json');
  assert.equal(schema.properties.schemaId.const, plan.schemaId);
  assert.equal(schema.properties.assessment.properties.permissionDecision.type, 'null');
  assert.equal(schema.properties.generatedBy.properties.networkRequests.const, 0);
});

test('the browser planner source has no provider or upload request path', async () => {
  const source = await readFile(
    path.resolve(__dirname, '../src/app/preflight/InboxPreflightPlanner.tsx'),
    'utf8',
  );

  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /XMLHttpRequest/);
  assert.doesNotMatch(source, /FormData/);
  assert.match(source, /navigator\.clipboard/);
  assert.match(source, /URL\.createObjectURL/);
});
