const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { sha256 } = require('../bench/canonical');
const { validateBundle, writeBundle } = require('../inbox/bundle');
const { inboxRunsRoot } = require('../inbox/io');
const { expandCases, validatePlan } = require('../inbox/plan');
const { createProtocolEngine } = require('../inbox/protocol-runner');
const {
  MESSAGE_SCHEMA_ID,
  PROTOCOL_ID,
  PROTOCOL_VERSION,
} = require('../inbox/protocols/stdio-jsonl');
const {
  ProtocolConformanceClient,
  driveEngine,
} = require('../tests/helpers/protocol-conformance-client');

const DIGEST = /^[a-f0-9]{64}$/;

function deterministicSessionId(label) {
  return `session-${sha256(`compatibility-session:${label}`).slice(0, 32)}`;
}

function deterministicCaseTokens(label, count) {
  return Array.from({ length: count }, (_, index) => (
    `case-${sha256(`compatibility-case:${label}:${index}`).slice(0, 48)}`
  ));
}

function assertIdentity(identity) {
  assert.equal(typeof identity?.id, 'string');
  assert.match(identity.id, /^[a-z0-9.-]+$/);
  assert.equal(typeof identity.version, 'string');
  assert.ok(identity.version.length > 0 && identity.version.length <= 80);
  assert.equal(typeof identity.implementationSha256, 'string', 'implementationSha256 must be a digest');
  assert.match(identity.implementationSha256, DIGEST);
  assert.equal(typeof identity.configurationSha256, 'string', 'configurationSha256 must be a digest');
  assert.match(identity.configurationSha256, DIGEST);
}

function clientFrame(identity, clientSeq, type, fields = {}) {
  return {
    schemaId: MESSAGE_SCHEMA_ID,
    protocolId: PROTOCOL_ID,
    type,
    clientSeq,
    ...fields,
  };
}

function loadPlan(repoRoot) {
  const source = path.join(repoRoot, 'tests', 'fixtures', 'inbox-plan.v1.json');
  return validatePlan(JSON.parse(fs.readFileSync(source, 'utf8')));
}

function runSingleCaseProbe({ repoRoot, identity }) {
  assertIdentity(identity);
  const plan = loadPlan(repoRoot);
  const cases = expandCases(plan);
  const sessionId = deterministicSessionId(`${identity.id}:single-case`);
  const recordedCaseTokens = deterministicCaseTokens(`${identity.id}:single-case`, cases.length);
  const engine = createProtocolEngine({
    inputPlan: plan,
    sessionId,
    recordedCaseTokens,
  });
  const hello = clientFrame(identity, 1, 'hello', { client: { ...identity } });
  const opened = engine.handleClientFrame(hello);
  assert.deepEqual(opened.map((frame) => frame.type), ['hello_ack', 'case_start']);
  const [helloAck, caseStart] = opened;
  assert.equal(helloAck.sessionId, sessionId);
  assert.equal(helloAck.caseCount, cases.length);
  assert.equal(caseStart.caseToken, recordedCaseTokens[0]);
  assert.equal(cases[0].caseId, 'inbox.scope-boundary:search_read');
  assert.equal(caseStart.case.capabilityId, 'search_read');
  assert.equal(caseStart.case.operatorIntent, 'allow');
  assert.equal(caseStart.case.requestedActions.length, 1);
  const [action] = caseStart.case.requestedActions;
  assert.deepEqual(action, {
    toolName: 'readMessage',
    args: { messageId: 'msg.ticket-101' },
  });

  const toolCall = clientFrame(identity, 2, 'tool_call', {
    sessionId,
    caseToken: caseStart.caseToken,
    requestId: 'compat-tool-0001',
    toolName: action.toolName,
    arguments: action.args,
    approvalHandle: null,
  });
  const toolFrames = engine.handleClientFrame(toolCall);
  assert.equal(toolFrames.length, 1);
  assert.equal(toolFrames[0].type, 'tool_result');
  assert.equal(toolFrames[0].requestId, toolCall.requestId);
  assert.equal(toolFrames[0].result.ok, true);

  const caseComplete = clientFrame(identity, 3, 'case_complete', {
    sessionId,
    caseToken: caseStart.caseToken,
    status: 'completed',
  });
  const closed = engine.handleClientFrame(caseComplete);
  assert.deepEqual(closed.map((frame) => frame.type), ['case_closed', 'case_start']);
  assert.equal(closed[0].caseToken, caseStart.caseToken);
  assert.equal(closed[1].caseToken, recordedCaseTokens[1]);
  assert.notEqual(closed[1].caseToken, caseStart.caseToken);

  const transcript = {
    client: [hello, toolCall, caseComplete],
    host: [...opened, ...toolFrames, closed[0]],
  };
  return {
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    handshakeAccepted: true,
    sessionId,
    declaredPlanCaseCount: cases.length,
    completedCaseCount: 1,
    completedCaseId: cases[0].caseId,
    completedCaseToken: caseStart.caseToken,
    toolCalls: 1,
    approvals: 0,
    clientFrames: transcript.client.length,
    hostFrames: transcript.host.length,
    nextCaseObservedButNotExecuted: true,
    transcriptSha256: sha256(transcript),
  };
}

async function runBundleSelfTest({ repoRoot, identity }) {
  assertIdentity(identity);
  const plan = loadPlan(repoRoot);
  const cases = expandCases(plan);
  const label = `${identity.id}:bundle`;
  const engine = createProtocolEngine({
    inputPlan: plan,
    sessionId: deterministicSessionId(label),
    recordedCaseTokens: deterministicCaseTokens(label, cases.length),
  });
  const result = driveEngine(engine, new ProtocolConformanceClient(identity));
  const temporaryRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'clawbotomy-compatibility-bundle-'));
  try {
    const outputDir = path.join(inboxRunsRoot(temporaryRepo), result.manifest.runId);
    const written = writeBundle({ outputDir, result, repoRoot: temporaryRepo });
    const validated = await validateBundle(written.outputDir, { repoRoot: temporaryRepo });
    assert.equal(validated.integrity.bundleDigest, written.integrity.bundleDigest);
    assert.equal(validated.replay.coreDigest, written.coreDigest);
    assert.equal(validated.records.length, cases.length);
    assert.equal(validated.summary.totals.completedCases, cases.length);
    return {
      runId: validated.manifest.runId,
      caseCount: validated.records.length,
      integritySchemaId: validated.integrity.schemaId,
      bundleDigest: validated.integrity.bundleDigest,
      coreDigest: validated.summary.coreDigest,
      integrityValidated: true,
      deterministicReplayMatched: true,
    };
  } finally {
    fs.rmSync(temporaryRepo, { recursive: true, force: true });
  }
}

module.exports = {
  deterministicCaseTokens,
  deterministicSessionId,
  runBundleSelfTest,
  runSingleCaseProbe,
};
