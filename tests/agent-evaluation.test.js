const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');

const evaluationModule = import(
  pathToFileURL(path.resolve(__dirname, '../src/lib/agent-evaluation.ts')).href
);

const runId = 'inbox-host-0123456789abcdefabcd';
const digest = 'a'.repeat(64);

function makeCase({ status = 'passed', ordinal = 1 } = {}) {
  return {
    schemaId: 'clawbotomy.inbox-protocol-case-record/v1',
    runId,
    caseId: `inbox.scope-boundary:search_read`,
    scenarioId: 'inbox.scope-boundary',
    capabilityId: 'search_read',
    status,
    events: [
      {
        kind: 'tool_attempt',
        payload: {
          toolName: 'searchMessages',
          args: { query: `private secret ${ordinal}` },
        },
      },
      {
        kind: 'tool_result',
        payload: {
          toolName: 'searchMessages',
          result: { body: `private message ${ordinal}` },
        },
      },
      { kind: 'state_diff', payload: { raw: `private state ${ordinal}` } },
    ],
    stateDiff: {
      messages: [{ id: `message-${ordinal}`, before: { body: 'private' }, after: null }],
      drafts: [],
      sent: [],
      tombstones: [],
      changed: true,
    },
    evaluation: {
      assertions: [
        { assertionId: 'inbox.assert.protocol-task-observed', passed: true, summary: 'private summary' },
        { assertionId: 'inbox.assert.scope.requested-tools-only', passed: status === 'passed', summary: 'private summary' },
      ],
    },
    digests: { record: digest },
  };
}

function bundle({ failedCases = 0 } = {}) {
  const cases = [
    makeCase({ status: failedCases ? 'failed' : 'passed' }),
  ];
  const manifest = {
    schemaId: 'clawbotomy.inbox-protocol-run-manifest/v1',
    runId,
    lifecycle: { status: 'complete' },
    evidence: { authorizationStatus: 'non-authorizing', permissionDecision: null },
    executionSubject: {
      id: 'hermes-agent.clawbotomy-bridge',
      version: '1.2.1',
    },
    plan: { sha256: digest },
    coreDigest: digest,
  };
  const summary = {
    schemaId: 'clawbotomy.inbox-protocol-run-summary/v1',
    runId,
    totals: {
      scheduledCases: 1,
      completedCases: 1,
      passedCases: failedCases ? 0 : 1,
      failedCases,
      toolAttempts: 1,
      stateTransitions: 1,
    },
    coreDigest: digest,
  };
  const attempt = {
    schemaId: 'clawbotomy.agent-evaluation-attempt/v1',
    schemaVersion: '1.0.0',
    attemptId: 'attempt-hermes-01234567-89ab-4def-8abc-0123456789ab',
    adapter: 'hermes',
    clientId: 'hermes-agent.clawbotomy-bridge',
    modelLabel: 'openai-codex/gpt-5.6-sol',
    planSha256: digest,
    startedAt: '2026-07-13T19:00:00.000Z',
    completedAt: '2026-07-13T19:00:04.000Z',
    exitCode: failedCases ? 2 : 0,
    status: failedCases ? 'findings' : 'passed',
    completeBundleWritten: true,
    bundle: { locator: `.clawbotomy/inbox-runs/${runId}`, runId, coreDigest: digest },
    diagnosticCodes: [],
  };
  return {
    attemptText: JSON.stringify(attempt),
    manifestText: JSON.stringify(manifest),
    summaryText: JSON.stringify(summary),
    casesText: cases.map((item) => JSON.stringify(item)).join('\n'),
  };
}

test('adapter catalog exposes exact fixed protocol client IDs and launch commands', async () => {
  const { AGENT_ADAPTERS } = await evaluationModule;

  assert.deepEqual(AGENT_ADAPTERS.map((adapter) => adapter.clientId), [
    'openclaw.clawbotomy-bridge',
    'hermes-agent.clawbotomy-bridge',
  ]);
  assert.match(AGENT_ADAPTERS[0].launchCommand, /agent:evaluate --[\s\\]+--adapter openclaw/);
  assert.match(AGENT_ADAPTERS[1].launchCommand, /agent:evaluate --[\s\\]+--adapter hermes/);
});

test('private viewer derives a passed receipt without returning raw event or state content', async () => {
  const { parsePrivateInboxBundle } = await evaluationModule;
  const receipt = parsePrivateInboxBundle(bundle());

  assert.equal(receipt.status, 'passed');
  assert.equal(receipt.adapter, 'hermes');
  assert.equal(receipt.modelLabel, 'openai-codex/gpt-5.6-sol');
  assert.equal(receipt.authorizationStatus, 'non-authorizing');
  assert.equal(receipt.cases[0].toolAttempts, 1);
  assert.deepEqual(receipt.cases[0].tools, ['searchMessages']);
  assert.equal(receipt.cases[0].stateChanges.messages, 1);
  assert.equal(receipt.cases[0].passedAssertions, 2);

  const serialized = JSON.stringify(receipt);
  assert.doesNotMatch(serialized, /private secret|private message|private state|private summary/);
});

test('a complete run with failed cases is labeled findings rather than passed', async () => {
  const { parsePrivateInboxBundle } = await evaluationModule;
  const receipt = parsePrivateInboxBundle(bundle({ failedCases: 1 }));

  assert.equal(receipt.status, 'findings');
  assert.equal(receipt.totals.failedCases, 1);
  assert.deepEqual(receipt.cases[0].failedAssertions, ['inbox.assert.scope.requested-tools-only']);
});

test('the private viewer rejects mismatched files and authorizing evidence claims', async () => {
  const { EvidenceImportError, parsePrivateInboxBundle } = await evaluationModule;
  const mismatched = bundle();
  const badSummary = JSON.parse(mismatched.summaryText);
  badSummary.coreDigest = 'b'.repeat(64);

  assert.throws(
    () => parsePrivateInboxBundle({ ...mismatched, summaryText: JSON.stringify(badSummary) }),
    EvidenceImportError,
  );

  const authorizing = bundle();
  const badManifest = JSON.parse(authorizing.manifestText);
  badManifest.evidence.authorizationStatus = 'authorized';
  badManifest.evidence.permissionDecision = 'grant';
  assert.throws(
    () => parsePrivateInboxBundle({ ...authorizing, manifestText: JSON.stringify(badManifest) }),
    /non-authorizing boundary/,
  );
});

test('the private viewer requires a binding launcher receipt and a complete non-empty run', async () => {
  const { EvidenceImportError, parsePrivateInboxBundle } = await evaluationModule;
  const withoutAttempt = bundle();
  withoutAttempt.attemptText = '';
  assert.throws(() => parsePrivateInboxBundle(withoutAttempt), EvidenceImportError);

  const incomplete = bundle();
  const incompleteSummary = JSON.parse(incomplete.summaryText);
  incompleteSummary.totals.scheduledCases = 2;
  assert.throws(
    () => parsePrivateInboxBundle({ ...incomplete, summaryText: JSON.stringify(incompleteSummary) }),
    /internally inconsistent/,
  );

  const mismatchedAttempt = bundle();
  const attempt = JSON.parse(mismatchedAttempt.attemptText);
  attempt.bundle.coreDigest = 'b'.repeat(64);
  assert.throws(
    () => parsePrivateInboxBundle({ ...mismatchedAttempt, attemptText: JSON.stringify(attempt) }),
    /does not bind/,
  );
});

test('the safe projection rejects private text in displayed identifiers and diagnostics', async () => {
  const { parseEvaluationAttempt, parsePrivateInboxBundle } = await evaluationModule;
  const unsafeCase = bundle();
  const caseRecord = JSON.parse(unsafeCase.casesText);
  caseRecord.caseId = 'private message body: launch code 1234';
  caseRecord.scenarioId = 'secret@example.com';
  assert.throws(
    () => parsePrivateInboxBundle({ ...unsafeCase, casesText: JSON.stringify(caseRecord) }),
    /checked-in Inbox contract/,
  );

  const unsafeAssertion = bundle({ failedCases: 1 });
  const failedCase = JSON.parse(unsafeAssertion.casesText);
  failedCase.evaluation.assertions[1].assertionId = 'private-message-body-secret';
  assert.throws(
    () => parsePrivateInboxBundle({ ...unsafeAssertion, casesText: JSON.stringify(failedCase) }),
    /checked-in evaluator contract/,
  );

  const unsafeAttempt = JSON.parse(bundle().attemptText);
  unsafeAttempt.diagnosticCodes = ['private-message-body-secret'];
  assert.throws(
    () => parseEvaluationAttempt(JSON.stringify(unsafeAttempt)),
    /unsupported diagnostic code/,
  );
});

test('an explicit attempt receipt represents infrastructure failure without a scored bundle', async () => {
  const { parseEvaluationAttempt } = await evaluationModule;
  const receipt = parseEvaluationAttempt(JSON.stringify({
    schemaId: 'clawbotomy.agent-evaluation-attempt/v1',
    schemaVersion: '1.0.0',
    attemptId: 'attempt-openclaw-01234567-89ab-4def-8abc-0123456789ab',
    adapter: 'openclaw',
    clientId: 'openclaw.clawbotomy-bridge',
    modelLabel: 'ollama/qwen3:1.7b',
    planSha256: digest,
    startedAt: '2026-07-13T19:00:00.000Z',
    completedAt: '2026-07-13T19:00:04.000Z',
    exitCode: 1,
    status: 'infrastructure_failure',
    completeBundleWritten: false,
    bundle: null,
    diagnosticCodes: ['bridge_exit_1', 'no_unique_validated_bundle'],
  }));

  assert.equal(receipt.status, 'infrastructure_failure');
  assert.equal(receipt.completeBundleWritten, false);
  assert.equal(receipt.adapter, 'openclaw');
});

test('an exit-one attempt can preserve a uniquely replay-validated complete bundle', async () => {
  const { parseEvaluationAttempt } = await evaluationModule;
  const receipt = parseEvaluationAttempt(JSON.stringify({
      schemaId: 'clawbotomy.agent-evaluation-attempt/v1',
      schemaVersion: '1.0.0',
      attemptId: 'attempt-hermes-01234567-89ab-4def-8abc-0123456789ab',
      adapter: 'hermes',
      clientId: 'hermes-agent.clawbotomy-bridge',
      modelLabel: 'openai-codex/gpt-5.6-sol',
      planSha256: digest,
      startedAt: '2026-07-13T19:00:00.000Z',
      completedAt: '2026-07-13T19:00:04.000Z',
      exitCode: 1,
      status: 'findings',
      completeBundleWritten: true,
      bundle: { locator: `.clawbotomy/inbox-runs/${runId}`, runId, coreDigest: digest },
      diagnosticCodes: ['bridge_exit_1', 'replay_validated_bundle_recovered_after_exit_1'],
    }));

  assert.equal(receipt.exitCode, 1);
  assert.equal(receipt.status, 'findings');
  assert.equal(receipt.completeBundleWritten, true);
  assert.equal(receipt.bundle.runId, runId);
});

const fs = require('node:fs');
const os = require('node:os');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const {
  parseArgs: parseEvaluationArgs,
  run: runAgentEvaluation,
} = require('../inbox/agent-evaluate');

const attemptReceiptKeys = [
  'schemaId',
  'schemaVersion',
  'attemptId',
  'adapter',
  'clientId',
  'modelLabel',
  'planSha256',
  'startedAt',
  'completedAt',
  'exitCode',
  'status',
  'completeBundleWritten',
  'bundle',
  'diagnosticCodes',
];

function terminalReceipt({ failed = 0 } = {}) {
  const cases = 2;
  return {
    schemaId: 'clawbotomy.inbox-protocol-frame/v1',
    protocolId: 'stdio-jsonl/v1',
    type: 'run_complete',
    hostSeq: 40,
    sessionId: 'session-0123456789abcdef',
    runId,
    outputDir: `.clawbotomy/inbox-runs/${runId}`,
    status: failed ? 'failed' : 'passed',
    cases,
    passed: cases - failed,
    failed,
    coreDigest: digest,
  };
}

function replayValidatedBundle({
  failed = 0,
  bundleRunId = runId,
  clientId = 'openclaw.clawbotomy-bridge',
} = {}) {
  const cases = 2;
  return {
    outputDir: `/trusted/clawbotomy/.clawbotomy/inbox-runs/${bundleRunId}`,
    manifest: {
      schemaId: 'clawbotomy.inbox-protocol-run-manifest/v1',
      runId: bundleRunId,
      lifecycle: { status: 'complete' },
      plan: { sha256: digest },
      executionSubject: { id: clientId },
      protocol: { id: 'stdio-jsonl/v1' },
      coreDigest: digest,
    },
    summary: {
      runId: bundleRunId,
      coreDigest: digest,
      totals: {
        scheduledCases: cases,
        completedCases: cases,
        passedCases: cases - failed,
        failedCases: failed,
      },
    },
    replay: { coreDigest: digest },
  };
}

function fakeBridge({ stdout = '', stderr = '', code = 0, signal = null } = {}) {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  setImmediate(() => {
    child.stdout.end(stdout);
    child.stderr.end(stderr);
    setImmediate(() => child.emit('close', code, signal));
  });
  return child;
}

function launcherDependencies(t, spawnBridge, overrides = {}) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'clawbotomy-agent-attempt-'));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const times = [
    new Date('2026-07-13T19:00:00.000Z'),
    new Date('2026-07-13T19:00:04.000Z'),
  ];
  const snapshots = [[], [runId]];
  return {
    repoRoot: '/trusted/clawbotomy',
    attemptsRoot: temporary,
    nodePath: '/trusted/node',
    readPlan: async () => ({ absolute: '/trusted/clawbotomy/plan.json', planDigest: digest }),
    randomUUID: () => '01234567-89ab-4def-8abc-0123456789ab',
    now: () => times.shift(),
    stdout: { write() {} },
    stderr: { write() {} },
    spawn: spawnBridge,
    listRunIds: async () => snapshots.shift(),
    validateBundle: async () => replayValidatedBundle(),
    ...overrides,
  };
}

function openClawArgs(extra = []) {
  return [
    '--adapter', 'openclaw',
    '--plan', './plan.json',
    '--model', 'ollama/qwen3:1.7b',
    '--openclaw-bin', '/trusted/openclaw/openclaw.mjs',
    '--expected-openclaw-runtime-sha256', 'b'.repeat(64),
    '--expected-provider-runtime-sha256', 'c'.repeat(64),
    ...extra,
  ];
}

test('agent launcher rejects non-allowlisted adapters and arbitrary launch surfaces', () => {
  assert.throws(
    () => parseEvaluationArgs(['--adapter', 'custom', '--plan', './plan.json']),
    /exactly openclaw or hermes/,
  );
  for (const unsafeOption of ['--command', '--module', '--url']) {
    assert.throws(() => parseEvaluationArgs([...openClawArgs(), unsafeOption, 'unsafe']), /Unknown evaluation option/);
  }
  assert.throws(
    () => parseEvaluationArgs([
      '--adapter', 'hermes', '--plan', './plan.json',
      '--hermes-root', '/trusted/hermes', '--hermes-home', '/private/profile',
      '--model', 'openai/override',
    ]),
    /not valid for hermes/,
  );
});

test('agent launcher uses the fixed OpenClaw bridge and writes a closed mode-0600 passed receipt', async (t) => {
  const calls = [];
  let operatorStdout = '';
  const bridgeStdout = JSON.stringify({
    schemaId: 'clawbotomy.openclaw-bridge-receipt/v2',
    hostExitCode: 0,
    run: terminalReceipt(),
    runtime: { rawCredential: 'must-not-be-copied' },
    cases: [{ rawBridgeReceipt: 'must-not-be-copied' }],
  });
  const dependencies = launcherDependencies(t, (command, args, options) => {
    calls.push({ command, args, options });
    return fakeBridge({ stdout: bridgeStdout });
  }, {
    stdout: { write(chunk) { operatorStdout += chunk.toString(); } },
  });

  const result = await runAgentEvaluation(openClawArgs(), dependencies);

  assert.equal(result.exitCode, 0);
  assert.deepEqual(Object.keys(result.receipt), attemptReceiptKeys);
  assert.equal(result.receipt.status, 'passed');
  assert.equal(result.receipt.completeBundleWritten, true);
  assert.deepEqual(result.receipt.bundle, {
    locator: `.clawbotomy/inbox-runs/${runId}`,
    runId,
    coreDigest: digest,
  });
  assert.deepEqual(result.receipt.diagnosticCodes, []);
  assert.equal(operatorStdout, bridgeStdout);
  assert.equal(calls[0].command, '/trusted/node');
  assert.equal(calls[0].args[0], '/trusted/clawbotomy/integrations/openclaw/bridge.mjs');
  assert.equal(calls[0].options.shell, false);
  assert.deepEqual(calls[0].options.stdio, ['ignore', 'pipe', 'pipe']);
  assert.match(path.basename(result.receiptPath), /^evaluation-attempt-openclaw-.*\.json$/);
  assert.equal(fs.statSync(result.receiptPath).mode & 0o777, 0o600);
  assert.deepEqual(JSON.parse(fs.readFileSync(result.receiptPath, 'utf8')), result.receipt);
  assert.doesNotMatch(JSON.stringify(result.receipt), /must-not-be-copied|rawBridgeReceipt/);
});

test('agent launcher derives the Hermes interpreter and preserves findings exit code', async (t) => {
  const calls = [];
  const bridgeStdout = JSON.stringify({
    provider: 'openai-codex',
    model: 'gpt-5.6-sol',
    receipt: terminalReceipt({ failed: 1 }),
    exitCode: 2,
  });
  const dependencies = launcherDependencies(t, (command, args, options) => {
    calls.push({ command, args, options });
    return fakeBridge({ stdout: bridgeStdout, code: 2 });
  }, {
    validateBundle: async () => replayValidatedBundle({
      failed: 1,
      clientId: 'hermes-agent.clawbotomy-bridge',
    }),
  });

  const result = await runAgentEvaluation([
    '--adapter', 'hermes',
    '--plan', './plan.json',
    '--hermes-root', '/trusted/hermes',
    '--hermes-home', '/private/hermes-profile',
  ], dependencies);

  assert.equal(result.exitCode, 2);
  assert.equal(result.receipt.status, 'findings');
  assert.equal(result.receipt.modelLabel, 'openai-codex/gpt-5.6-sol');
  assert.equal(result.receipt.completeBundleWritten, true);
  assert.equal(calls[0].command, '/trusted/hermes/venv/bin/python');
  assert.deepEqual(calls[0].args.slice(0, 5), [
    '/trusted/clawbotomy/integrations/hermes-agent/bridge.py',
    '--repo-root', '/trusted/clawbotomy',
    '--plan', '/trusted/clawbotomy/plan.json',
  ]);
  assert.equal(calls[0].options.shell, false);
});

test('agent launcher streams bridge diagnostics but persists only closed failure codes', async (t) => {
  const authPath = '/Users/operator/.openclaw/agents/main/agent/auth-profiles.json';
  const secret = 'sk-this-secret-must-never-be-in-the-attempt-receipt';
  const rawDiagnostic = `provider failed token=${secret} profile=${authPath} Bearer ${'z'.repeat(100)}\n`;
  let streamedStderr = '';
  const dependencies = launcherDependencies(t, () => fakeBridge({
    stderr: `${'noise '.repeat(4000)}${rawDiagnostic}`,
    code: 1,
  }), {
    stderr: { write(chunk) { streamedStderr += chunk.toString(); } },
    listRunIds: (() => {
      const snapshots = [[], []];
      return async () => snapshots.shift();
    })(),
  });
  const args = [
    '--adapter', 'openclaw',
    '--plan', './plan.json',
    '--model', 'openai/gpt-5.6-sol',
    '--openclaw-bin', '/trusted/openclaw/openclaw.mjs',
    '--auth-source-agent-dir', authPath,
    '--plugin-registry-source-state-dir', '/Users/operator/.openclaw',
    '--expected-openclaw-runtime-sha256', 'b'.repeat(64),
    '--expected-provider-runtime-sha256', 'c'.repeat(64),
    '--expected-codex-runtime-sha256', 'd'.repeat(64),
  ];

  const result = await runAgentEvaluation(args, dependencies);
  const serialized = JSON.stringify(result.receipt);

  assert.equal(result.exitCode, 1);
  assert.equal(result.receipt.status, 'infrastructure_failure');
  assert.equal(result.receipt.completeBundleWritten, false);
  assert.equal(result.receipt.bundle, null);
  assert.doesNotMatch(serialized, /this-secret|auth-profiles|Users\/operator|--auth-source-agent-dir|openclaw\.mjs/);
  assert.deepEqual(result.receipt.diagnosticCodes, ['bridge_exit_1', 'no_unique_validated_bundle']);
  assert.match(streamedStderr, /this-secret/);
  assert.equal(fs.statSync(result.receiptPath).mode & 0o777, 0o600);
});

test('agent launcher still writes a private receipt when bridge spawn fails', async (t) => {
  const snapshots = [[], []];
  const dependencies = launcherDependencies(t, () => {
    throw new Error('spawn failed token=secret-value at /Users/operator/private/runtime');
  }, {
    listRunIds: async () => snapshots.shift(),
  });

  const result = await runAgentEvaluation(openClawArgs(), dependencies);
  const serialized = fs.readFileSync(result.receiptPath, 'utf8');

  assert.equal(result.exitCode, 1);
  assert.equal(result.receipt.status, 'infrastructure_failure');
  assert.equal(result.receipt.completeBundleWritten, false);
  assert.deepEqual(result.receipt.diagnosticCodes, ['bridge_spawn_failed', 'no_unique_validated_bundle']);
  assert.equal(fs.statSync(result.receiptPath).mode & 0o777, 0o600);
  assert.doesNotMatch(serialized, /secret-value|Users\/operator/);
});

test('agent launcher recovers one new replay-validated bundle after bridge exit one', async (t) => {
  const dependencies = launcherDependencies(t, () => fakeBridge({
    stderr: 'receipt delivery failed after host completion',
    code: 1,
  }));

  const result = await runAgentEvaluation(openClawArgs(), dependencies);

  assert.equal(result.exitCode, 1);
  assert.equal(result.receipt.status, 'passed');
  assert.equal(result.receipt.completeBundleWritten, true);
  assert.deepEqual(result.receipt.bundle, {
    locator: `.clawbotomy/inbox-runs/${runId}`,
    runId,
    coreDigest: digest,
  });
  assert.deepEqual(result.receipt.diagnosticCodes, [
    'bridge_exit_1',
    'replay_validated_bundle_recovered_after_exit_1',
  ]);
});

test('agent launcher fails closed when more than one new validated bundle matches', async (t) => {
  const secondRunId = 'inbox-host-bbbbbbbbbbbbbbbbbbbb';
  const snapshots = [[], [runId, secondRunId]];
  const dependencies = launcherDependencies(t, () => fakeBridge({
    stderr: 'bridge failed',
    code: 1,
  }), {
    listRunIds: async () => snapshots.shift(),
    validateBundle: async (outputDir) => replayValidatedBundle({
      bundleRunId: path.basename(outputDir),
    }),
  });

  const result = await runAgentEvaluation(openClawArgs(), dependencies);

  assert.equal(result.exitCode, 1);
  assert.equal(result.receipt.status, 'infrastructure_failure');
  assert.equal(result.receipt.completeBundleWritten, false);
  assert.equal(result.receipt.bundle, null);
  assert.deepEqual(result.receipt.diagnosticCodes, ['bridge_exit_1', 'multiple_validated_bundles']);
});

test('agent launcher fails closed when exit zero disagrees with a findings bundle', async (t) => {
  const bridgeStdout = JSON.stringify({
    schemaId: 'clawbotomy.openclaw-bridge-receipt/v2',
    hostExitCode: 0,
    run: terminalReceipt(),
  });
  const dependencies = launcherDependencies(t, () => fakeBridge({ stdout: bridgeStdout }), {
    validateBundle: async () => replayValidatedBundle({ failed: 1 }),
  });

  const result = await runAgentEvaluation(openClawArgs(), dependencies);

  assert.equal(result.exitCode, 0);
  assert.equal(result.receipt.status, 'infrastructure_failure');
  assert.equal(result.receipt.completeBundleWritten, false);
  assert.equal(result.receipt.bundle, null);
  assert.deepEqual(result.receipt.diagnosticCodes, ['bridge_status_mismatch']);
});

test('agent launcher fails closed when exit two disagrees with a passing bundle', async (t) => {
  const bridgeStdout = JSON.stringify({
    schemaId: 'clawbotomy.openclaw-bridge-receipt/v2',
    hostExitCode: 2,
    run: terminalReceipt({ failed: 1 }),
  });
  const dependencies = launcherDependencies(t, () => fakeBridge({ stdout: bridgeStdout, code: 2 }));

  const result = await runAgentEvaluation(openClawArgs(), dependencies);

  assert.equal(result.exitCode, 2);
  assert.equal(result.receipt.status, 'infrastructure_failure');
  assert.equal(result.receipt.completeBundleWritten, false);
  assert.equal(result.receipt.bundle, null);
  assert.deepEqual(result.receipt.diagnosticCodes, ['bridge_status_mismatch']);
});

test('agent launcher fails closed when stdout names a different validated bundle', async (t) => {
  const secondRunId = 'inbox-host-bbbbbbbbbbbbbbbbbbbb';
  const snapshots = [[], [secondRunId]];
  const bridgeStdout = JSON.stringify({
    schemaId: 'clawbotomy.openclaw-bridge-receipt/v2',
    hostExitCode: 0,
    run: terminalReceipt(),
  });
  const dependencies = launcherDependencies(t, () => fakeBridge({ stdout: bridgeStdout }), {
    listRunIds: async () => snapshots.shift(),
    validateBundle: async () => replayValidatedBundle({ bundleRunId: secondRunId }),
  });

  const result = await runAgentEvaluation(openClawArgs(), dependencies);

  assert.equal(result.receipt.status, 'infrastructure_failure');
  assert.equal(result.receipt.bundle, null);
  assert.deepEqual(result.receipt.diagnosticCodes, ['bridge_bundle_mismatch']);
});
