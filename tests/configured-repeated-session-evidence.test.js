const assert = require('node:assert/strict');
const test = require('node:test');

const claimRegistry = require('../claims/registry.json');
const { reconstructPlan } = require('../inbox/plan');
const {
  ADAPTERS,
  PREFLIGHT_SCHEMA_ID,
  REPORT_SCHEMA_ID,
  buildReport,
  createPreflight,
  parseAttempt,
  renderMarkdown,
  safeCaseProjection,
  validatePreflight,
} = require('../inbox/repeated-session-evidence');

const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);
const DIGEST_C = 'c'.repeat(64);
const SOURCE_COMMIT = 'd'.repeat(40);
const PLAN_TIME = '2026-08-04T20:00:00.000Z';
const PLAN_DIGEST = 'e'.repeat(64);

function searchReadPlan() {
  return reconstructPlan({
    schemaId: 'clawbotomy.inbox-preflight-plan/v1',
    schemaVersion: '1.0.0',
    createdAt: PLAN_TIME,
    subject: {
      label: 'Phase 3 repeated-session evidence',
      configurationReference: 'pinned:openclaw-and-hermes',
    },
    requestedCapabilities: [{ id: 'search_read', operatorIntent: 'allow' }],
  });
}

function preflight() {
  return createPreflight({
    experimentId: 'phase3-search-read-20260804',
    plan: searchReadPlan(),
    planDigest: PLAN_DIGEST,
    sessionsPerAdapter: 3,
    source: { commit: SOURCE_COMMIT, clean: true },
    openclaw: {
      runtimeVersion: '2026.7.1-beta.5',
      runtimeSha256: DIGEST_A,
      providerRuntimeSha256: DIGEST_B,
      codexRuntimeSha256: DIGEST_C,
    },
    hermes: {
      runtimeVersion: '0.18.2',
      gitCommit: '1'.repeat(40),
      sourceTreeSha256: DIGEST_C,
    },
    incrementalCashCostUpperBoundUsd: 0,
    createdAt: '2026-08-04T23:30:00.000Z',
  });
}

function attempt(adapter, index, { status = 'passed', bundle = true } = {}) {
  const uuid = `${String(index).padStart(8, '0')}-0000-4000-8000-${String(index).padStart(12, '0')}`;
  const runId = `inbox-host-${String(index).padStart(20, '0')}`;
  const expected = ADAPTERS[adapter];
  const runtimeProvenance = adapter === 'openclaw'
    ? {
      runtimeVersion: '2026.7.1-beta.5',
      runtimeSha256: DIGEST_A,
      providerRuntimeSha256: DIGEST_B,
      codexRuntimeSha256: DIGEST_C,
    }
    : {
      runtimeVersion: '0.18.2',
      gitCommit: '1'.repeat(40),
      sourceTreeSha256: DIGEST_C,
    };
  return {
    schemaId: 'clawbotomy.agent-evaluation-attempt/v1',
    schemaVersion: '1.0.0',
    attemptId: `attempt-${adapter}-${uuid}`,
    adapter,
    clientId: expected.clientId,
    modelLabel: expected.modelLabel,
    planSha256: PLAN_DIGEST,
    startedAt: `2026-08-04T23:${String(index).padStart(2, '0')}:00.000Z`,
    completedAt: `2026-08-04T23:${String(index).padStart(2, '0')}:30.000Z`,
    exitCode: bundle ? (status === 'findings' ? 2 : 0) : 1,
    status: bundle ? status : 'infrastructure_failure',
    completeBundleWritten: bundle,
    bundle: bundle ? {
      locator: `.clawbotomy/inbox-runs/${runId}`,
      runId,
      coreDigest: DIGEST_A,
    } : null,
    runtimeProvenance: bundle ? runtimeProvenance : null,
    diagnosticCodes: bundle ? [] : ['bridge_exit_1', 'no_unique_validated_bundle'],
  };
}

function caseObservation(caseId, {
  status = 'passed',
  toolSequence = ['readMessage'],
  failedAssertions = [],
  signature = DIGEST_A,
} = {}) {
  return {
    caseId,
    status,
    toolSequence,
    stateChanges: { messages: 0, drafts: 0, sent: 0, tombstones: 0 },
    failedAssertions,
    behaviorSignature: signature,
  };
}

function sample(document, inputPreflight, {
  findingCase = null,
  variedCase = null,
  identityDigest = DIGEST_A,
} = {}) {
  const version = document.adapter === 'openclaw' ? '2026.7.1-beta.5' : '0.18.2';
  return {
    attemptId: document.attemptId,
    status: findingCase ? 'findings' : 'passed',
    runId: document.bundle.runId,
    runtimeIdentity: {
      clientId: document.clientId,
      version,
      implementationSha256: identityDigest,
      configurationSha256: DIGEST_B,
    },
    integrityBundleDigest: DIGEST_C,
    cases: inputPreflight.plan.caseIds.map((caseId) => caseObservation(caseId, {
      status: caseId === findingCase ? 'failed' : 'passed',
      failedAssertions: caseId === findingCase ? ['inbox.assert.scope.requested-items-only'] : [],
      signature: caseId === variedCase ? DIGEST_B : DIGEST_A,
    })),
  };
}

function reportInputs() {
  const inputPreflight = preflight();
  const documents = [
    attempt('openclaw', 1),
    attempt('openclaw', 2),
    attempt('openclaw', 3, { status: 'findings' }),
    attempt('hermes', 4, { status: 'findings' }),
    attempt('hermes', 5, { status: 'findings' }),
    attempt('hermes', 6),
  ];
  const samples = new Map();
  for (const document of documents) {
    const firstCase = inputPreflight.plan.caseIds[0];
    samples.set(document.attemptId, sample(document, inputPreflight, {
      findingCase: [3, 4, 5].includes(Number(document.attemptId.slice(-12))) ? firstCase : null,
      variedCase: [3, 6].includes(Number(document.attemptId.slice(-12))) ? firstCase : null,
    }));
  }
  const attempts = documents.map((document, index) => ({
    document,
    relative: `.clawbotomy/evaluation-attempts/${document.attemptId}.json`,
    sha256: String(index + 1).repeat(64),
  }));
  return { preflight: inputPreflight, attempts, samples };
}

test('costed preflight freezes a three-session, five-case experiment without a repeatability claim', () => {
  const value = preflight();

  assert.equal(value.schemaId, PREFLIGHT_SCHEMA_ID);
  assert.equal(value.design.sessionsPerAdapter, 3);
  assert.equal(value.plan.caseCount, 5);
  assert.deepEqual(value.plan.capabilityIds, ['search_read']);
  assert.deepEqual(value.cost.providerCallCeilingByAdapter, {
    openclaw: 75,
    hermes: 180,
  });
  assert.equal(value.cost.providerCallCeilingTotal, 255);
  assert.equal(value.cost.incrementalCashCostUpperBoundUsd, 0);
  assert.equal(value.design.trustScoreProhibited, true);
  assert.equal(value.design.repeatabilityClaimProhibited, true);
  assert.equal(validatePreflight(value), value);
});

test('report keeps finding frequency and behavioral variation separate by adapter', () => {
  const report = buildReport({
    ...reportInputs(),
    generatedAt: '2026-08-05T00:00:00.000Z',
  });

  assert.equal(report.schemaId, REPORT_SCHEMA_ID);
  assert.equal(report.totalLauncherAttemptsPreserved, 6);
  assert.equal(report.totalReplayValidatedBundles, 6);
  const [openclaw, hermes] = report.adapters;
  assert.equal(openclaw.sessionsWithAnyFindings, 1);
  assert.equal(hermes.sessionsWithAnyFindings, 2);
  assert.equal(openclaw.caseReports[0].findingFrequency, '1/3');
  assert.equal(hermes.caseReports[0].findingFrequency, '2/3');
  assert.equal(openclaw.caseReports[0].behavioralVariationObserved, true);
  assert.equal(hermes.caseReports[0].behavioralVariationObserved, true);
  assert.equal(Object.hasOwn(report, 'trustScore'), false);
  assert.equal(report.interpretation.evidenceLane, 'configured-agent-session');
  assert.deepEqual(report.interpretation.statusLanguage, claimRegistry.statusLanguage.configuredAgentSession);
  assert.deepEqual(report.interpretation.nonClaims, claimRegistry.lanes['configured-agent-session'].defaultNonClaims);
  assert.match(report.interpretation.prohibitedConclusions.join(' '), /No trust score/);
  assert.doesNotMatch(JSON.stringify(report), /private message body|operator@clawbotomy\.test/);

  const markdown = renderMarkdown(report);
  assert.match(markdown, /findings 1\/3/);
  assert.match(markdown, /not a trust score, repeatability claim/);
});

test('report refuses a runtime identity change inside one adapter cohort', () => {
  const input = reportInputs();
  const openclawAttempt = input.attempts[1].document.attemptId;
  input.samples.get(openclawAttempt).runtimeIdentity.implementationSha256 = DIGEST_C;

  assert.throws(
    () => buildReport({ ...input, generatedAt: '2026-08-05T00:00:00.000Z' }),
    /runtime identity changed between completed sessions/,
  );
});

test('preflight and completed attempts fail closed when runtime pins are missing', () => {
  const incompletePreflight = structuredClone(preflight());
  delete incompletePreflight.configurations.openclaw.runtimeSha256;
  assert.throws(
    () => validatePreflight(incompletePreflight),
    /unsupported or missing fields/,
  );

  const completedAttempt = attempt('hermes', 7);
  completedAttempt.runtimeProvenance = null;
  assert.throws(
    () => parseAttempt(completedAttempt),
    /must bind verified runtime provenance/,
  );
});

test('report rejects OpenClaw and Hermes runtime provenance that differs from preflight pins', () => {
  const openclawMismatch = reportInputs();
  openclawMismatch.attempts[0].document.runtimeProvenance.runtimeSha256 = DIGEST_C;
  assert.throws(
    () => buildReport({ ...openclawMismatch, generatedAt: '2026-08-05T00:00:00.000Z' }),
    /runtime provenance (?:changed between completed sessions|does not match the frozen preflight pins)/,
  );

  const hermesMismatch = reportInputs();
  hermesMismatch.attempts[3].document.runtimeProvenance.sourceTreeSha256 = DIGEST_A;
  assert.throws(
    () => buildReport({ ...hermesMismatch, generatedAt: '2026-08-05T00:00:00.000Z' }),
    /runtime provenance (?:changed between completed sessions|does not match the frozen preflight pins)/,
  );
});

test('report refuses missing completed bundles and does not score infrastructure failures', () => {
  const input = reportInputs();
  input.samples.delete(input.attempts[0].document.attemptId);

  assert.throws(
    () => buildReport({ ...input, generatedAt: '2026-08-05T00:00:00.000Z' }),
    /missing its validated bundle sample/,
  );

  const infrastructure = attempt('openclaw', 7, { bundle: false });
  const parsed = parseAttempt(infrastructure);
  assert.equal(parsed.status, 'infrastructure_failure');
  assert.equal(parsed.bundle, null);
});

test('safe case projection drops raw event and state text and rejects invented assertion identifiers', () => {
  const caseId = 'inbox.scope-boundary:search_read';
  const record = {
    caseId,
    status: 'failed',
    events: [
      {
        kind: 'tool_attempt',
        payload: {
          toolName: 'readMessage',
          arguments: { messageId: 'private message body' },
        },
      },
      {
        kind: 'tool_result',
        payload: { result: { body: 'operator@clawbotomy.test private state' } },
      },
    ],
    stateDiff: {
      messages: [{ before: { body: 'private state' }, after: null }],
      drafts: [],
      sent: [],
      tombstones: [],
    },
    evaluation: {
      assertions: [
        { assertionId: 'inbox.assert.scope.requested-items-only', passed: false },
      ],
    },
  };
  const projected = safeCaseProjection(record, new Set([caseId]));
  assert.deepEqual(projected.toolSequence, ['readMessage']);
  assert.equal(projected.stateChanges.messages, 1);
  assert.doesNotMatch(JSON.stringify(projected), /private message body|private state|operator@/);

  record.evaluation.assertions[0].assertionId = 'private-message-body-secret';
  assert.throws(
    () => safeCaseProjection(record, new Set([caseId])),
    /outside the checked-in evaluator contract/,
  );
});
