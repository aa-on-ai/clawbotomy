const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');

const insightsModule = import(
  pathToFileURL(path.resolve(__dirname, '../src/lib/agent-evaluation-insights.ts')).href
);

function caseReceipt({
  caseId,
  scenarioId,
  capabilityId,
  status = 'failed',
  failedAssertions = [],
}) {
  return {
    caseId,
    scenarioId,
    capabilityId,
    status,
    toolAttempts: 1,
    toolResults: 1,
    tools: ['readMessage'],
    stateTransitions: 0,
    stateChanges: { messages: 0, drafts: 0, sent: 0, tombstones: 0 },
    passedAssertions: 4,
    failedAssertions,
    recordDigest: 'private-record-digest-that-must-not-be-projected',
  };
}

function run(cases, status = 'findings') {
  const failedCases = cases.filter((item) => item.status === 'failed').length;
  return {
    source: 'private_bundle',
    attemptId: 'attempt-hermes-01234567-89ab-4def-8abc-0123456789ab',
    runId: 'inbox-host-0123456789abcdefabcd',
    adapter: 'hermes',
    adapterLabel: 'Hermes Agent',
    clientId: 'hermes-agent.clawbotomy-bridge',
    clientVersion: '1.2.1',
    status,
    totals: {
      scheduledCases: cases.length,
      completedCases: cases.length,
      passedCases: cases.length - failedCases,
      failedCases,
      toolAttempts: cases.length,
      stateTransitions: 0,
    },
    coreDigest: 'a'.repeat(64),
    planSha256: 'b'.repeat(64),
    authorizationStatus: 'non-authorizing',
    exitCode: status === 'findings' ? 2 : 0,
    cases,
  };
}

test('findings become bounded recommendations linked only to safe case and assertion IDs', async () => {
  const { deriveEvidenceRecommendations } = await insightsModule;
  const receipt = run([
    caseReceipt({
      caseId: 'inbox.scope-boundary:search_read',
      scenarioId: 'inbox.scope-boundary',
      capabilityId: 'search_read',
      failedAssertions: ['inbox.assert.scope.requested-tools-only'],
    }),
    caseReceipt({
      caseId: 'inbox.explicit-confirmation:send',
      scenarioId: 'inbox.explicit-confirmation',
      capabilityId: 'send',
      failedAssertions: [
        'inbox.assert.confirmation.precedes-action',
        'inbox.assert.operator-boundary-held',
      ],
    }),
  ]);

  const recommendations = deriveEvidenceRecommendations(receipt);

  assert.equal(recommendations.length, 2);
  assert.equal(recommendations[0].id, 'approval-boundary');
  assert.equal(recommendations[0].priority, 'review_first');
  assert.equal(recommendations[0].failedAssertions, 2);
  assert.deepEqual(recommendations[1].caseIds, ['inbox.scope-boundary:search_read']);
  assert.doesNotMatch(JSON.stringify(recommendations), /private-record-digest/);
});

test('the decision stays non-authorizing for findings and passing runs', async () => {
  const { getRunDecision } = await insightsModule;
  const failed = run([
    caseReceipt({
      caseId: 'inbox.scope-boundary:search_read',
      scenarioId: 'inbox.scope-boundary',
      capabilityId: 'search_read',
      failedAssertions: ['inbox.assert.scope.requested-tools-only'],
    }),
  ]);
  const passed = run([
    caseReceipt({
      caseId: 'inbox.scope-boundary:search_read',
      scenarioId: 'inbox.scope-boundary',
      capabilityId: 'search_read',
      status: 'passed',
      failedAssertions: [],
    }),
  ], 'passed');

  assert.equal(getRunDecision(failed).label, 'Hold permission changes');
  assert.match(getRunDecision(failed).nextStep, /same plan/);
  assert.equal(getRunDecision(passed).label, 'Repeat before expanding access');
  assert.match(getRunDecision(passed).explanation, /does not.*authorize/i);
});

test('the built-in Hermes case study is aggregate-only and explicitly not public evidence', async () => {
  const { SANITIZED_HERMES_CASE_STUDY } = await insightsModule;

  assert.deepEqual(SANITIZED_HERMES_CASE_STUDY.totals, {
    completedCases: 36,
    passedCases: 11,
    failedCases: 25,
    toolAttempts: 23,
    stateTransitions: 7,
  });
  assert.match(SANITIZED_HERMES_CASE_STUDY.boundary, /not public evidence/i);
  assert.match(SANITIZED_HERMES_CASE_STUDY.disallowedClaim, /does not.*authorize/i);
  assert.equal('runId' in SANITIZED_HERMES_CASE_STUDY, false);
  assert.equal('coreDigest' in SANITIZED_HERMES_CASE_STUDY, false);
});
