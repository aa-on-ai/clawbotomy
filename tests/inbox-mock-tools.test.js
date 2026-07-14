const assert = require('node:assert/strict');
const test = require('node:test');

const { createFixture, stateDigest } = require('../inbox/fixture');
const { createMockInbox } = require('../inbox/mock-inbox');

function runtimeFor(capabilityId, operatorIntent = 'allow') {
  return createMockInbox({
    caseSpec: {
      caseId: `test.mock-tools:${capabilityId}:${operatorIntent}`,
      scenarioId: 'test.mock-tools',
      capabilityId,
      operatorIntent,
    },
    initialState: createFixture(),
  });
}

const sendArgs = {
  draftId: 'draft.ticket-101',
  idempotencyKey: 'test-send-ticket-101',
};

test('mock tools reject unknown tools, missing arguments, and extra arguments without changing state', () => {
  const runtime = runtimeFor('search_read');
  const before = runtime.snapshot();

  const unknown = runtime.invoke('openMailboxSocket', {});
  const missing = runtime.invoke('searchMessages', { query: 'refund' });
  const extra = runtime.invoke('readMessage', { messageId: 'msg.ticket-101', unexpected: true });

  assert.equal(unknown.ok, false);
  assert.equal(unknown.error.code, 'invalid_arguments');
  assert.match(unknown.error.message, /Unknown mock Inbox tool/);
  assert.equal(missing.error.code, 'invalid_arguments');
  assert.match(missing.error.message, /Missing tool argument: limit/);
  assert.equal(extra.error.code, 'invalid_arguments');
  assert.match(extra.error.message, /Unknown tool argument: unexpected/);
  assert.equal(stateDigest(runtime.snapshot()), stateDigest(before));
  assert.equal(runtime.events.filter((event) => event.kind === 'tool_attempt').length, 3);
  assert.equal(runtime.events.some((event) => event.kind === 'state_diff'), false);
});

test('read-only tools return fixture evidence without producing a state diff', () => {
  const runtime = runtimeFor('search_read');
  const before = runtime.snapshot();

  const search = runtime.tools.searchMessages({ query: 'refund', limit: 10 });
  const read = runtime.tools.readMessage({ messageId: 'msg.ticket-101' });

  assert.equal(search.ok, true);
  assert.deepEqual(search.value.messages.map((message) => message.id), ['msg.ticket-101']);
  assert.equal(read.ok, true);
  assert.equal(read.value.message.id, 'msg.ticket-101');
  assert.equal(stateDigest(runtime.snapshot()), stateDigest(before));
  assert.equal(runtime.events.some((event) => event.kind === 'state_diff'), false);
});

test('an allowed mutation changes authoritative state and emits a linked state diff', () => {
  const runtime = runtimeFor('send');
  const before = runtime.snapshot();

  const result = runtime.tools.sendDraft(sendArgs);
  const after = runtime.snapshot();
  const resultEvent = runtime.events.find((event) => event.kind === 'tool_result');
  const diffEvent = runtime.events.find((event) => event.kind === 'state_diff');

  assert.equal(result.ok, true);
  assert.notEqual(stateDigest(after), stateDigest(before));
  assert.equal(after.sent.length, 1);
  assert.equal(after.sent[0].sourceDraftId, sendArgs.draftId);
  assert.ok(diffEvent);
  assert.equal(diffEvent.payload.resultEventId, resultEvent.eventId);
  assert.equal(diffEvent.payload.beforeStateDigest, stateDigest(before));
  assert.equal(diffEvent.payload.afterStateDigest, stateDigest(after));
  assert.equal(diffEvent.payload.diff.changed, true);
});

test('approval intent requires an exact, single-use simulated-fixture token', () => {
  const runtime = runtimeFor('send', 'approval');
  const before = runtime.snapshot();

  const missing = runtime.tools.sendDraft(sendArgs);
  const wrong = runtime.tools.sendDraft({ ...sendArgs, approvalToken: 'wrong-token' });
  assert.equal(missing.error.code, 'approval_required');
  assert.equal(wrong.error.code, 'approval_required');
  assert.equal(stateDigest(runtime.snapshot()), stateDigest(before));

  const approvalToken = runtime.requestSimulatedApproval('sendDraft', sendArgs);
  const approved = runtime.tools.sendDraft({ ...sendArgs, approvalToken });
  const afterApproved = runtime.snapshot();
  const reused = runtime.tools.sendDraft({ ...sendArgs, approvalToken });

  assert.equal(approved.ok, true);
  assert.equal(afterApproved.sent.length, 1);
  assert.equal(reused.ok, false);
  assert.equal(reused.error.code, 'approval_required');
  assert.deepEqual(runtime.snapshot(), afterApproved);

  const grant = runtime.events.find((event) => event.kind === 'approval_granted');
  assert.equal(grant.actor, 'fixture-control');
  assert.equal(grant.payload.source, 'simulated-fixture');
  assert.equal(grant.payload.singleUse, true);
  const successfulResult = runtime.events.find((event) => (
    event.kind === 'tool_result'
    && event.payload.result.ok === true
  ));
  assert.equal(successfulResult.payload.policy.simulatedApprovalUsed, true);
  assert.equal(successfulResult.payload.policy.simulatedApprovalTokenId, approvalToken);
  assert.equal(Object.prototype.hasOwnProperty.call(runtime, 'emitControl'), false);
});

test('a blocked capability logs the denied attempt and leaves authoritative state unchanged', () => {
  const runtime = runtimeFor('send', 'block');
  const before = runtime.snapshot();

  const result = runtime.tools.sendDraft(sendArgs);

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'policy_denied');
  assert.equal(stateDigest(runtime.snapshot()), stateDigest(before));
  assert.equal(runtime.events.filter((event) => event.kind === 'tool_attempt').length, 1);
  assert.equal(runtime.events.filter((event) => event.kind === 'tool_result').length, 1);
  assert.equal(runtime.events.some((event) => event.kind === 'state_diff'), false);
  assert.equal(runtime.events.find((event) => event.kind === 'tool_result').payload.policy.allowed, false);
});

test('a tool outside the isolated case capability is denied and logged', () => {
  const runtime = runtimeFor('search_read', 'allow');
  const before = runtime.snapshot();

  const result = runtime.tools.sendDraft(sendArgs);

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'capability_unavailable');
  assert.equal(stateDigest(runtime.snapshot()), stateDigest(before));
  const attempt = runtime.events.find((event) => event.kind === 'tool_attempt');
  const toolResult = runtime.events.find((event) => event.kind === 'tool_result');
  assert.equal(attempt.payload.toolName, 'sendDraft');
  assert.equal(toolResult.payload.toolName, 'sendDraft');
  assert.equal(toolResult.payload.policy.allowed, false);
});
