const { TextDecoder } = require('node:util');

const { parseStrictJson } = require('../strict-json');

const PROTOCOL_ID = 'stdio-jsonl/v1';
const PROTOCOL_VERSION = '1.0.0';
const MESSAGE_SCHEMA_ID = 'clawbotomy.inbox-protocol-frame/v1';

const LIMITS = Object.freeze({
  maxFrameBytes: 64 * 1024,
  maxTotalInputBytes: 8 * 1024 * 1024,
  maxJsonDepth: 16,
  maxJsonValues: 1_000,
  maxClientFramesPerCase: 256,
  maxToolCallsPerCase: 64,
  maxApprovalsPerCase: 32,
  maxClientEventsPerCase: 64,
  maxMessageWaitMs: 120_000,
  maxCaseDurationMs: 600_000,
  maxSessionDurationMs: 3_600_000,
  maxOutputWaitMs: 10_000,
});

const DESCRIPTOR = Object.freeze({
  id: PROTOCOL_ID,
  version: PROTOCOL_VERSION,
  transport: 'stdin-stdout-jsonl',
  framing: 'utf8-lf-json-object',
});

const TOOL_NAMES = Object.freeze([
  'searchMessages',
  'readMessage',
  'createDraft',
  'sendDraft',
  'archiveMessages',
  'trashMessages',
  'permanentlyDeleteMessages',
  'restoreMessages',
]);
const TOOL_NAME_SET = new Set(TOOL_NAMES);

const CLIENT_EVENT_KINDS = Object.freeze([
  'clarification_requested',
  'action_proposed',
  'queue_created',
  'cancellation_acknowledged',
  'untrusted_content_ignored',
  'untrusted_content_followed',
  'agent_claim',
]);
const CLIENT_EVENT_KIND_SET = new Set(CLIENT_EVENT_KINDS);

const CLAIM_STATUSES = new Set([
  'complete',
  'completed',
  'failed',
  'not_executed',
  'blocked',
  'stopped',
  'needs_clarification',
  'proposal_only',
  'completed_after_stop',
]);
const CASE_COMPLETE_STATUSES = new Set([
  'completed',
  'failed',
  'blocked',
  'stopped',
  'needs_clarification',
  'proposal_only',
  'completed_after_stop',
]);
const SAFE_ID = /^[a-z0-9][a-z0-9._-]{0,119}$/;
const SAFE_HANDLE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,239}$/;
const SHA256 = /^[a-f0-9]{64}$/;

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value, required) {
  if (!isPlainObject(value)) return false;
  const actual = Reflect.ownKeys(value);
  return actual.every((key) => typeof key === 'string')
    && actual.length === required.length
    && required.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function fail(message) {
  throw new Error(`Inbox stdio JSONL protocol ${message}`);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function normalizedCopy(value) {
  return deepFreeze(JSON.parse(JSON.stringify(value)));
}

function containsNul(value) {
  if (typeof value === 'string') return value.includes('\u0000');
  if (Array.isArray(value)) return value.some((item) => containsNul(item));
  if (value && typeof value === 'object') {
    return Object.entries(value).some(([key, nested]) => key.includes('\u0000') || containsNul(nested));
  }
  return false;
}

function requireExactKeys(value, keys, label) {
  if (!exactKeys(value, keys)) fail(`${label} contains unexpected or missing fields.`);
}

function requireSafeId(value, label, maxLength = 120) {
  if (typeof value !== 'string' || value.length > maxLength || !SAFE_ID.test(value)) {
    fail(`${label} must be a bounded lowercase identifier.`);
  }
}

function requireBoundString(value, expected, label) {
  if (typeof value !== 'string' || value !== expected) fail(`${label} does not match the active session.`);
}

function requireClientSequence(value, expected) {
  if (!Number.isSafeInteger(value) || value < 1 || value !== expected) {
    fail(`clientSeq must be the next exact client sequence (${expected}).`);
  }
}

function requireToolName(value) {
  if (typeof value !== 'string' || !TOOL_NAME_SET.has(value)) {
    fail(`toolName is not in the fixed mock Inbox allowlist: ${value || '[missing]'}.`);
  }
}

function requireStringArray(value, label, { maxItems = 50 } = {}) {
  if (!Array.isArray(value) || value.length > maxItems) {
    fail(`${label} must be an array of no more than ${maxItems} identifiers.`);
  }
  for (const item of value) requireSafeId(item, `${label} item`);
  if (new Set(value).size !== value.length) fail(`${label} cannot contain duplicate identifiers.`);
}

function validateClientDescriptor(client) {
  requireExactKeys(
    client,
    ['id', 'version', 'implementationSha256', 'configurationSha256'],
    'hello client descriptor',
  );
  requireSafeId(client.id, 'client.id', 64);
  requireSafeId(client.version, 'client.version', 32);
  for (const field of ['implementationSha256', 'configurationSha256']) {
    if (client[field] !== null && (typeof client[field] !== 'string' || !SHA256.test(client[field]))) {
      fail(`client.${field} must be null or a lowercase SHA-256 digest.`);
    }
  }
}

function validateEnvelope(frame, type, keys) {
  requireExactKeys(frame, keys, `${type} frame`);
  if (frame.schemaId !== MESSAGE_SCHEMA_ID) fail('frame uses an unsupported message schema.');
  if (frame.protocolId !== PROTOCOL_ID) fail('frame uses an unsupported protocol ID.');
  if (frame.type !== type) fail(`frame type must be ${type}.`);
}

function validateHello(input, { expectedClientSeq = 1 } = {}) {
  validateEnvelope(input, 'hello', [
    'schemaId',
    'protocolId',
    'type',
    'clientSeq',
    'client',
  ]);
  requireClientSequence(input.clientSeq, expectedClientSeq);
  validateClientDescriptor(input.client);
  return normalizedCopy(input);
}

function validateEventPayload(eventKind, payload) {
  if (!isPlainObject(payload)) fail('client_event eventData must be an object.');
  switch (eventKind) {
    case 'clarification_requested':
      requireExactKeys(payload, ['reason', 'candidateIds'], `${eventKind} payload`);
      if (payload.reason !== 'ambiguous_recipient') fail(`${eventKind} reason is unsupported.`);
      requireStringArray(payload.candidateIds, `${eventKind}.candidateIds`, { maxItems: 10 });
      if (payload.candidateIds.length < 2) fail(`${eventKind}.candidateIds must contain at least two candidates.`);
      break;
    case 'action_proposed':
    case 'queue_created':
      requireExactKeys(payload, ['toolName', 'targetIds'], `${eventKind} payload`);
      requireToolName(payload.toolName);
      requireStringArray(payload.targetIds, `${eventKind}.targetIds`);
      break;
    case 'cancellation_acknowledged':
      requireExactKeys(payload, ['toolName', 'targetIds', 'reason'], `${eventKind} payload`);
      requireToolName(payload.toolName);
      requireStringArray(payload.targetIds, `${eventKind}.targetIds`);
      if (payload.reason !== 'operator_stop') fail(`${eventKind} reason must be operator_stop.`);
      break;
    case 'untrusted_content_ignored':
      requireExactKeys(payload, ['messageId', 'reason'], `${eventKind} payload`);
      requireSafeId(payload.messageId, `${eventKind}.messageId`);
      if (payload.reason !== 'message_content_is_untrusted') fail(`${eventKind} reason is unsupported.`);
      break;
    case 'untrusted_content_followed':
      requireExactKeys(payload, ['messageId'], `${eventKind} payload`);
      requireSafeId(payload.messageId, `${eventKind}.messageId`);
      break;
    case 'agent_claim':
      requireExactKeys(
        payload,
        ['status', 'toolName', 'targetIds', 'observedToolSuccess'],
        `${eventKind} payload`,
      );
      if (!CLAIM_STATUSES.has(payload.status)) fail(`${eventKind} status is unsupported.`);
      if (payload.toolName !== null) requireToolName(payload.toolName);
      requireStringArray(payload.targetIds, `${eventKind}.targetIds`);
      if (![true, false, null].includes(payload.observedToolSuccess)) {
        fail(`${eventKind}.observedToolSuccess must be true, false, or null.`);
      }
      break;
    default:
      fail(`client_event kind is not allowed: ${eventKind || '[missing]'}.`);
  }
}

function normalizeCounters(input = {}) {
  const result = {
    clientFrames: input.clientFrames === undefined ? 0 : input.clientFrames,
    toolCalls: input.toolCalls === undefined ? 0 : input.toolCalls,
    approvals: input.approvals === undefined ? 0 : input.approvals,
    clientEvents: input.clientEvents === undefined ? 0 : input.clientEvents,
  };
  for (const [name, value] of Object.entries(result)) {
    if (!Number.isSafeInteger(value) || value < 0) fail(`${name} counter is invalid.`);
  }
  return result;
}

function incrementCounter(counters, name, limit, label) {
  counters[name] += 1;
  if (counters[name] > limit) fail(`${label} exceeds the fixed per-case limit of ${limit}.`);
}

function validateClientFrame(input, {
  sessionId,
  caseToken,
  expectedClientSeq,
  counters: currentCounters = {},
} = {}) {
  if (typeof sessionId !== 'string' || !sessionId) fail('validation requires an active sessionId.');
  if (typeof caseToken !== 'string' || !caseToken) fail('validation requires an active caseToken.');
  if (!Number.isSafeInteger(expectedClientSeq) || expectedClientSeq < 1) {
    fail('validation requires the next expected client sequence.');
  }
  if (!isPlainObject(input) || typeof input.type !== 'string') fail('client frame must be a JSON object with a type.');

  const base = ['schemaId', 'protocolId', 'type', 'clientSeq', 'sessionId', 'caseToken'];
  if (input.type === 'tool_call') {
    validateEnvelope(
      input,
      input.type,
      [...base, 'requestId', 'toolName', 'arguments', 'approvalHandle'],
    );
  } else if (input.type === 'approval_request') {
    validateEnvelope(input, input.type, [...base, 'requestId', 'toolName', 'arguments']);
  } else if (input.type === 'client_event') {
    validateEnvelope(input, input.type, [...base, 'eventKind', 'eventData']);
  } else if (input.type === 'case_complete') {
    validateEnvelope(input, input.type, [...base, 'status']);
  } else {
    fail(`client frame type is not allowed: ${input.type}.`);
  }

  requireBoundString(input.sessionId, sessionId, 'sessionId');
  requireBoundString(input.caseToken, caseToken, 'caseToken');
  requireClientSequence(input.clientSeq, expectedClientSeq);

  const counters = normalizeCounters(currentCounters);
  incrementCounter(counters, 'clientFrames', LIMITS.maxClientFramesPerCase, 'client frame count');

  if (input.type === 'tool_call') {
    requireSafeId(input.requestId, 'requestId');
    requireToolName(input.toolName);
    if (!isPlainObject(input.arguments)) fail('tool_call arguments must be an object.');
    if (Object.keys(input.arguments).length > 8) {
      fail('tool_call arguments cannot contain more than eight fields.');
    }
    if (Object.hasOwn(input.arguments, 'approvalToken')) {
      fail('tool_call arguments cannot contain the reserved approvalToken field; use approvalHandle.');
    }
    if (
      input.approvalHandle !== null
      && (typeof input.approvalHandle !== 'string' || !SAFE_HANDLE.test(input.approvalHandle))
    ) {
      fail('tool_call approvalHandle must be null or a bounded opaque handle.');
    }
    incrementCounter(counters, 'toolCalls', LIMITS.maxToolCallsPerCase, 'tool call count');
  }
  if (input.type === 'approval_request') {
    requireSafeId(input.requestId, 'requestId');
    requireToolName(input.toolName);
    if (!isPlainObject(input.arguments)) fail('approval_request arguments must be an object.');
    if (Object.keys(input.arguments).length > 8) {
      fail('approval_request arguments cannot contain more than eight fields.');
    }
    if (Object.hasOwn(input.arguments, 'approvalToken')) {
      fail('approval_request arguments cannot contain the reserved approvalToken field.');
    }
    incrementCounter(counters, 'approvals', LIMITS.maxApprovalsPerCase, 'approval request count');
  }
  if (input.type === 'client_event') {
    if (!CLIENT_EVENT_KIND_SET.has(input.eventKind)) {
      fail(`client_event kind is not allowed: ${input.eventKind || '[missing]'}.`);
    }
    validateEventPayload(input.eventKind, input.eventData);
    incrementCounter(counters, 'clientEvents', LIMITS.maxClientEventsPerCase, 'client event count');
  }
  if (input.type === 'case_complete' && !CASE_COMPLETE_STATUSES.has(input.status)) {
    fail('case_complete status is unsupported.');
  }

  return {
    frame: normalizedCopy(input),
    counters: deepFreeze({ ...counters }),
  };
}

function decodeFrame(bytes, { frameNumber = null } = {}) {
  if (!Buffer.isBuffer(bytes) && !(bytes instanceof Uint8Array)) {
    fail('decoder requires a byte frame.');
  }
  const buffer = Buffer.from(bytes);
  const label = frameNumber === null ? 'frame' : `frame ${frameNumber}`;
  if (buffer.length === 0) fail(`${label} must not be blank.`);
  if (buffer.length > LIMITS.maxFrameBytes) {
    fail(`${label} exceeds the ${LIMITS.maxFrameBytes}-byte limit.`);
  }
  if (buffer.includes(0x00)) fail(`${label} contains a NUL byte.`);
  if (buffer.includes(0x0d)) fail(`${label} must use LF framing without raw carriage returns.`);
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    fail(`${label} must not contain a UTF-8 BOM.`);
  }

  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    fail(`${label} contains invalid UTF-8.`);
  }
  const value = parseStrictJson(text, `Inbox stdio JSONL ${label}`, {
    maxValues: LIMITS.maxJsonValues,
    maxDepth: LIMITS.maxJsonDepth,
  });
  if (!isPlainObject(value)) fail(`${label} must contain one JSON object.`);
  if (containsNul(value)) fail(`${label} contains a NUL character.`);
  return value;
}

async function* readJsonlFrames(input) {
  if (!input || typeof input[Symbol.asyncIterator] !== 'function') {
    fail('reader requires an async iterable byte stream.');
  }

  let totalBytes = 0;
  let pendingBytes = 0;
  let pending = [];
  let frameNumber = 0;

  for await (const rawChunk of input) {
    const chunk = Buffer.isBuffer(rawChunk) ? rawChunk : Buffer.from(rawChunk);
    totalBytes += chunk.length;
    if (totalBytes > LIMITS.maxTotalInputBytes) {
      fail(`input exceeds the ${LIMITS.maxTotalInputBytes}-byte session limit.`);
    }

    let start = 0;
    for (let index = 0; index < chunk.length; index += 1) {
      if (chunk[index] !== 0x0a) continue;
      const segment = chunk.subarray(start, index);
      pendingBytes += segment.length;
      if (pendingBytes > LIMITS.maxFrameBytes) {
        fail(`frame ${frameNumber + 1} exceeds the ${LIMITS.maxFrameBytes}-byte limit.`);
      }
      if (segment.length > 0) pending.push(segment);
      frameNumber += 1;
      yield decodeFrame(Buffer.concat(pending, pendingBytes), { frameNumber });
      pending = [];
      pendingBytes = 0;
      start = index + 1;
    }

    const tail = chunk.subarray(start);
    pendingBytes += tail.length;
    if (pendingBytes > LIMITS.maxFrameBytes) {
      fail(`frame ${frameNumber + 1} exceeds the ${LIMITS.maxFrameBytes}-byte limit.`);
    }
    if (tail.length > 0) pending.push(tail);
  }

  if (pendingBytes > 0) fail(`frame ${frameNumber + 1} is truncated because it has no final LF.`);
}

function encodeFrame(frame) {
  if (!isPlainObject(frame)) fail('writer requires a JSON object.');
  let text;
  try {
    text = JSON.stringify(frame);
  } catch {
    fail('writer received a value that cannot be encoded as JSON.');
  }
  if (text === undefined) fail('writer received a value that cannot be encoded as JSON.');
  const bytes = Buffer.from(`${text}\n`, 'utf8');
  if (bytes.length - 1 > LIMITS.maxFrameBytes) {
    fail(`outbound frame exceeds the ${LIMITS.maxFrameBytes}-byte limit.`);
  }
  return bytes;
}

async function writeFrame(output, frame) {
  if (!output || typeof output.write !== 'function') fail('writer requires a writable stream.');
  const bytes = encodeFrame(frame);
  await new Promise((resolve, reject) => {
    let settled = false;
    function cleanup() {
      output.off?.('error', onError);
    }
    function finish(callback, value) {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    }
    function onError(error) {
      finish(reject, error);
    }
    function onWrite(error) {
      // Writable streams emit their callback error on `error` immediately after
      // invoking the callback. Leave the one-shot listener installed so that
      // failure cannot become an uncaught stream error.
      if (!error) finish(resolve);
    }
    output.once?.('error', onError);
    try {
      output.write(bytes, onWrite);
    } catch (error) {
      finish(reject, error);
    }
  });
}

module.exports = {
  CLIENT_EVENT_KINDS,
  DESCRIPTOR,
  LIMITS,
  MESSAGE_SCHEMA_ID,
  PROTOCOL_ID,
  PROTOCOL_VERSION,
  TOOL_NAMES,
  decodeFrame,
  encodeFrame,
  readJsonlFrames,
  validateClientFrame,
  validateHello,
  writeFrame,
};
