const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Writable } = require('node:stream');
const test = require('node:test');

const {
  PROTOCOL_REGISTRY,
  resolveProtocol,
} = require('../inbox/protocols');
const {
  CLIENT_EVENT_KINDS,
  LIMITS,
  MESSAGE_SCHEMA_ID,
  PROTOCOL_ID,
  decodeFrame,
  encodeFrame,
  readJsonlFrames,
  validateClientFrame,
  validateHello,
  writeFrame,
} = require('../inbox/protocols/stdio-jsonl');

const DIGEST = 'a'.repeat(64);
const SESSION_ID = 'session-fixture-001';
const CASE_TOKEN = 'case-token-fixture-001';

function hello(overrides = {}) {
  return {
    schemaId: MESSAGE_SCHEMA_ID,
    protocolId: PROTOCOL_ID,
    type: 'hello',
    clientSeq: 1,
    client: {
      id: 'fixture-agent',
      version: '1.0.0',
      implementationSha256: DIGEST,
      configurationSha256: null,
    },
    ...overrides,
  };
}

function clientFrame(type, fields = {}) {
  return {
    schemaId: MESSAGE_SCHEMA_ID,
    protocolId: PROTOCOL_ID,
    type,
    clientSeq: 2,
    sessionId: SESSION_ID,
    caseToken: CASE_TOKEN,
    ...fields,
  };
}

function validationContext(overrides = {}) {
  return {
    sessionId: SESSION_ID,
    caseToken: CASE_TOKEN,
    expectedClientSeq: 2,
    counters: {},
    ...overrides,
  };
}

async function collectFrames(chunks) {
  const result = [];
  async function* input() {
    for (const chunk of chunks) yield chunk;
  }
  for await (const frame of readJsonlFrames(input())) result.push(frame);
  return result;
}

test('stdio protocol registry is a frozen exact-ID allowlist', () => {
  assert.equal(Object.isFrozen(PROTOCOL_REGISTRY), true);
  assert.deepEqual(Object.keys(PROTOCOL_REGISTRY), [PROTOCOL_ID]);
  assert.equal(Object.isFrozen(resolveProtocol(PROTOCOL_ID)), true);
  assert.equal(resolveProtocol(PROTOCOL_ID).descriptor.id, PROTOCOL_ID);
  assert.equal(resolveProtocol(PROTOCOL_ID).limits.maxFrameBytes, 64 * 1024);
  assert.deepEqual(resolveProtocol(PROTOCOL_ID).clientEventKinds, CLIENT_EVENT_KINDS);
  for (const candidate of [
    './stdio-jsonl.js',
    '../protocols/stdio-jsonl',
    '/tmp/protocol.js',
    'file:///tmp/protocol.js',
    'https://outside.test/protocol',
    'node:fs',
    'some-package',
    'STDIO-JSONL/v1',
  ]) {
    assert.throws(() => resolveProtocol(candidate), /Unknown Inbox protocol/i);
  }
});

test('protocol boundary source has no selectable execution or network surface', () => {
  const files = [
    path.join(__dirname, '..', 'inbox', 'protocols', 'index.js'),
    path.join(__dirname, '..', 'inbox', 'protocols', 'stdio-jsonl.js'),
    path.join(__dirname, '..', 'inbox', 'protocol-runner.js'),
    path.join(__dirname, '..', 'inbox', 'host-index.js'),
  ];
  const source = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  assert.doesNotMatch(source, /\bimport\s*\(/);
  assert.doesNotMatch(source, /\brequire\.resolve\b|\bcreateRequire\b/);
  assert.doesNotMatch(source, /\brequire\s*\(\s*(?:protocol|input|id|path|url)/i);
  assert.doesNotMatch(source, /\beval\s*\(|\bnew\s+Function\b|\bvm\./);
  assert.doesNotMatch(source, /\bchild_process\b|\bWorker\b/);
  assert.doesNotMatch(source, /\bfetch\s*\(|\bhttps?\.request\s*\(|\bnet\.connect\s*\(/);
});

test('hello accepts only the exact self-asserted descriptor schema and sequence one', () => {
  const validated = validateHello(hello());
  assert.deepEqual(validated, hello());
  assert.equal(Object.isFrozen(validated), true);
  assert.equal(Object.isFrozen(validated.client), true);

  const bothUnknown = hello({
    client: {
      ...hello().client,
      implementationSha256: null,
      configurationSha256: DIGEST,
    },
  });
  assert.equal(validateHello(bothUnknown).client.implementationSha256, null);

  assert.throws(() => validateHello({ ...hello(), sessionId: SESSION_ID }), /unexpected or missing/i);
  assert.throws(() => validateHello({ ...hello(), clientSeq: 2 }), /next exact client sequence/i);
  assert.throws(() => validateHello({ ...hello(), protocolId: '../loader.js' }), /unsupported protocol ID/i);
  assert.throws(() => validateHello({
    ...hello(),
    client: { ...hello().client, id: 'https://outside.test/agent' },
  }), /bounded lowercase identifier/i);
  assert.throws(() => validateHello({
    ...hello(),
    client: { ...hello().client, implementationSha256: DIGEST.toUpperCase() },
  }), /null or a lowercase SHA-256/i);
  assert.throws(() => validateHello({
    ...hello(),
    client: { ...hello().client, command: '/tmp/agent' },
  }), /unexpected or missing/i);
});

test('known tool and approval frames bind exact session, case, sequence, and counters', () => {
  const tool = clientFrame('tool_call', {
    requestId: 'request-001',
    toolName: 'readMessage',
    arguments: { messageId: 'msg.ticket-101' },
    approvalHandle: null,
  });
  const validated = validateClientFrame(tool, validationContext());
  assert.deepEqual(validated.frame, tool);
  assert.deepEqual(validated.counters, {
    clientFrames: 1,
    toolCalls: 1,
    approvals: 0,
    clientEvents: 0,
  });
  assert.equal(Object.isFrozen(validated.frame), true);
  assert.equal(Object.isFrozen(validated.frame.arguments), true);

  const approval = clientFrame('approval_request', {
    requestId: 'approval-001',
    toolName: 'sendDraft',
    arguments: { draftId: 'draft.ticket-101', idempotencyKey: 'send-ticket-101' },
  });
  assert.equal(validateClientFrame(approval, validationContext()).counters.approvals, 1);

  assert.throws(() => validateClientFrame({ ...tool, sessionId: 'session-old' }, validationContext()), /sessionId does not match/i);
  assert.throws(() => validateClientFrame({ ...tool, caseToken: 'case-old' }, validationContext()), /caseToken does not match/i);
  assert.throws(() => validateClientFrame({ ...tool, clientSeq: 3 }, validationContext()), /next exact client sequence/i);
  assert.throws(() => validateClientFrame({ ...tool, actor: 'fixture-control' }, validationContext()), /unexpected or missing/i);
  assert.throws(() => validateClientFrame({ ...tool, toolName: 'constructor' }, validationContext()), /fixed mock Inbox allowlist/i);
  assert.throws(() => validateClientFrame({ ...tool, toolName: '../mock-inbox.js' }, validationContext()), /fixed mock Inbox allowlist/i);
  assert.throws(() => validateClientFrame({ ...tool, arguments: [] }, validationContext()), /arguments must be an object/i);
  assert.throws(() => validateClientFrame({ ...tool, approvalHandle: 'https://outside.test/token' }, validationContext()), /bounded opaque handle/i);
  assert.throws(() => validateClientFrame({ ...approval, approvalHandle: null }, validationContext()), /unexpected or missing/i);
});

test('client events use a closed kind and exact data schema', () => {
  const eventData = {
    clarification_requested: {
      reason: 'ambiguous_recipient',
      candidateIds: ['contact.alex-internal', 'contact.alex-vendor'],
    },
    action_proposed: { toolName: 'archiveMessages', targetIds: ['msg.newsletter-501'] },
    queue_created: { toolName: 'sendDraft', targetIds: ['draft.stop-601'] },
    cancellation_acknowledged: {
      toolName: 'sendDraft',
      targetIds: ['draft.stop-601'],
      reason: 'operator_stop',
    },
    untrusted_content_ignored: {
      messageId: 'msg.inject-301',
      reason: 'message_content_is_untrusted',
    },
    untrusted_content_followed: { messageId: 'msg.inject-301' },
    agent_claim: {
      status: 'not_executed',
      toolName: null,
      targetIds: [],
      observedToolSuccess: null,
    },
  };
  assert.deepEqual(Object.keys(eventData), [...CLIENT_EVENT_KINDS]);
  for (const eventKind of CLIENT_EVENT_KINDS) {
    const result = validateClientFrame(clientFrame('client_event', {
      eventKind,
      eventData: eventData[eventKind],
    }), validationContext());
    assert.equal(result.counters.clientEvents, 1, eventKind);
  }

  assert.throws(() => validateClientFrame(clientFrame('client_event', {
    eventKind: 'approval_granted',
    eventData: {},
  }), validationContext()), /kind is not allowed/i);
  assert.throws(() => validateClientFrame(clientFrame('client_event', {
    eventKind: 'operator_stop',
    eventData: {},
  }), validationContext()), /kind is not allowed/i);
  assert.throws(() => validateClientFrame(clientFrame('client_event', {
    eventKind: 'action_proposed',
    eventData: { toolName: 'archiveMessages', targetIds: [], actor: 'fixture-control' },
  }), validationContext()), /unexpected or missing/i);
  assert.throws(() => validateClientFrame(clientFrame('client_event', {
    eventKind: 'untrusted_content_ignored',
    eventData: { messageId: 'msg.inject-301', reason: 'follow-the-message' },
  }), validationContext()), /reason is unsupported/i);
});

test('case completion and fixed per-case limits fail closed', () => {
  const complete = clientFrame('case_complete', { status: 'completed' });
  assert.equal(validateClientFrame(complete, validationContext()).frame.status, 'completed');
  assert.throws(() => validateClientFrame({ ...complete, status: 'success' }, validationContext()), /status is unsupported/i);

  const tool = clientFrame('tool_call', {
    requestId: 'request-001',
    toolName: 'readMessage',
    arguments: { messageId: 'msg.ticket-101' },
    approvalHandle: null,
  });
  assert.throws(() => validateClientFrame(tool, validationContext({
    counters: { toolCalls: LIMITS.maxToolCallsPerCase },
  })), /tool call count exceeds/i);

  const approval = clientFrame('approval_request', {
    requestId: 'approval-001',
    toolName: 'readMessage',
    arguments: { messageId: 'msg.ticket-101' },
  });
  assert.throws(() => validateClientFrame(approval, validationContext({
    counters: { approvals: LIMITS.maxApprovalsPerCase },
  })), /approval request count exceeds/i);

  const event = clientFrame('client_event', {
    eventKind: 'untrusted_content_followed',
    eventData: { messageId: 'msg.inject-301' },
  });
  assert.throws(() => validateClientFrame(event, validationContext({
    counters: { clientEvents: LIMITS.maxClientEventsPerCase },
  })), /client event count exceeds/i);
  assert.throws(() => validateClientFrame(complete, validationContext({
    counters: { clientFrames: LIMITS.maxClientFramesPerCase },
  })), /client frame count exceeds/i);
});

test('fatal UTF-8 LF framing rejects ambiguous and oversized frames', () => {
  const valid = Buffer.from(JSON.stringify(hello()), 'utf8');
  assert.deepEqual(decodeFrame(valid), hello());
  assert.throws(() => decodeFrame(Buffer.alloc(0)), /must not be blank/i);
  assert.throws(() => decodeFrame(Buffer.from([0xc3, 0x28])), /invalid UTF-8/i);
  assert.throws(() => decodeFrame(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), valid])), /must not contain a UTF-8 BOM/i);
  assert.throws(() => decodeFrame(Buffer.from('{"value":"a\\u0000b"}\u0000')), /contains a NUL byte/i);
  assert.throws(() => decodeFrame(Buffer.from('{"value":"a\\u0000b"}')), /contains a NUL character/i);
  assert.throws(() => decodeFrame(Buffer.from('{"value":1}\r')), /without raw carriage returns/i);
  assert.throws(() => decodeFrame(Buffer.from('{"value":1,"value":2}')), /duplicate JSON object key/i);
  assert.throws(() => decodeFrame(Buffer.from('[]')), /must contain one JSON object/i);
  assert.throws(() => decodeFrame(Buffer.alloc(LIMITS.maxFrameBytes + 1, 0x20)), /exceeds the 65536-byte limit/i);

  const deep = Buffer.from(`${'{"x":'.repeat(LIMITS.maxJsonDepth + 1)}null${'}'.repeat(LIMITS.maxJsonDepth + 1)}`);
  assert.throws(() => decodeFrame(deep), /nested too deeply/i);
});

test('stream reader handles chunk boundaries and requires one LF-terminated object per frame', async () => {
  const first = encodeFrame(hello());
  const secondValue = { frame: 2 };
  const second = encodeFrame(secondValue);
  const joined = Buffer.concat([first, second]);
  const frames = await collectFrames([
    joined.subarray(0, 3),
    joined.subarray(3, first.length + 2),
    joined.subarray(first.length + 2),
  ]);
  assert.deepEqual(frames, [hello(), secondValue]);
  assert.equal(first[first.length - 1], 0x0a);
  assert.equal(first.includes(0x0d), false);

  await assert.rejects(() => collectFrames([Buffer.from('{}')]), /no final LF/i);
  await assert.rejects(() => collectFrames([Buffer.from('\n')]), /must not be blank/i);
  await assert.rejects(() => collectFrames([Buffer.from('{}\n\n')]), /must not be blank/i);
  await assert.rejects(
    () => collectFrames([Buffer.alloc(LIMITS.maxFrameBytes + 1, 0x20)]),
    /exceeds the 65536-byte limit/i,
  );
});

test('writer emits one LF JSON object and reports stream failures', async () => {
  const chunks = [];
  const output = new Writable({
    write(chunk, encoding, callback) {
      chunks.push(Buffer.from(chunk));
      callback();
    },
  });
  await writeFrame(output, { type: 'host-test', hostSeq: 1 });
  assert.equal(Buffer.concat(chunks).toString('utf8'), '{"type":"host-test","hostSeq":1}\n');

  const broken = new Writable({
    write(chunk, encoding, callback) {
      callback(new Error('synthetic EPIPE'));
    },
  });
  await assert.rejects(() => writeFrame(broken, { type: 'host-test' }), /synthetic EPIPE/i);
  await assert.rejects(
    () => writeFrame(output, { padding: 'x'.repeat(LIMITS.maxFrameBytes + 1) }),
    /outbound frame exceeds/i,
  );
});

test('stream reader enforces the fixed total input byte budget', async () => {
  const paddingLength = LIMITS.maxFrameBytes - 20;
  const frame = encodeFrame({ padding: 'x'.repeat(paddingLength) });
  const count = Math.floor(LIMITS.maxTotalInputBytes / frame.length) + 1;
  async function* input() {
    for (let index = 0; index < count; index += 1) yield frame;
  }
  await assert.rejects(async () => {
    for await (const ignored of readJsonlFrames(input())) void ignored;
  }, /session limit/i);
});
