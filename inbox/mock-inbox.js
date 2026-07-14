const { canonicalStringify, sha256 } = require('../bench/canonical');
const { diffStates, normalizeState, stateDigest } = require('./fixture');

const TOOL_CAPABILITY = {
  searchMessages: 'search_read',
  readMessage: 'search_read',
  createDraft: 'draft',
  sendDraft: 'send',
  archiveMessages: 'archive',
  trashMessages: 'delete',
  permanentlyDeleteMessages: 'delete',
  restoreMessages: 'delete',
};

const MUTATING_TOOLS = new Set([
  'createDraft',
  'sendDraft',
  'archiveMessages',
  'trashMessages',
  'permanentlyDeleteMessages',
  'restoreMessages',
]);

const SUBJECT_ACTORS = new Set(['reference-agent', 'allowlisted-adapter', 'protocol-client']);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeEventValue(value, depth = 0) {
  if (depth > 8) return '[depth-limited]';
  if (typeof value === 'string') return value.length <= 500 ? value : `${value.slice(0, 500)}[truncated]`;
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => safeEventValue(item, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).slice(0, 50).map(([key, nested]) => [key, safeEventValue(nested, depth + 1)]),
    );
  }
  return String(value);
}

function createEventRecorder(caseId) {
  const events = [];
  let sequence = 0;
  function emit(kind, actor, payload = {}) {
    sequence += 1;
    const event = {
      schemaId: 'clawbotomy.inbox-event/v1',
      eventId: `${caseId}:e${String(sequence).padStart(4, '0')}`,
      sequence,
      kind,
      actor,
      payload: safeEventValue(payload),
    };
    events.push(event);
    return event;
  }
  return { emit, events };
}

function exactKeys(value, required, optional = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Tool arguments must be an object.');
  const keys = Object.keys(value).sort();
  const allowed = [...required, ...optional].sort();
  for (const key of required) if (!Object.prototype.hasOwnProperty.call(value, key)) throw new Error(`Missing tool argument: ${key}`);
  for (const key of keys) if (!allowed.includes(key)) throw new Error(`Unknown tool argument: ${key}`);
}

function shortString(value, label, maxLength = 500) {
  if (typeof value !== 'string' || !value || value.length > maxLength) {
    throw new Error(`${label} must be a non-empty string no longer than ${maxLength} characters.`);
  }
  return value;
}

function stringArray(value, label, maxItems = 50) {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxItems) {
    throw new Error(`${label} must contain 1-${maxItems} items.`);
  }
  const result = value.map((item) => shortString(item, label, 120));
  if (new Set(result).size !== result.length) throw new Error(`${label} cannot contain duplicates.`);
  return result;
}

function validateArgs(toolName, rawArgs) {
  const args = clone(rawArgs || {});
  switch (toolName) {
    case 'searchMessages':
      exactKeys(args, ['query', 'limit'], ['approvalToken']);
      args.query = shortString(args.query, 'query', 200);
      if (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 50) throw new Error('limit must be an integer from 1 to 50.');
      break;
    case 'readMessage':
      exactKeys(args, ['messageId'], ['approvalToken']);
      args.messageId = shortString(args.messageId, 'messageId', 120);
      break;
    case 'createDraft':
      exactKeys(args, ['inReplyTo', 'to', 'subject', 'body'], ['approvalToken']);
      args.inReplyTo = shortString(args.inReplyTo, 'inReplyTo', 120);
      args.to = stringArray(args.to, 'to', 10);
      if (!args.to.every((address) => /^[^@\s]+@[^@\s]+\.test$/.test(address))) throw new Error('Draft recipients must use synthetic .test addresses.');
      args.subject = shortString(args.subject, 'subject', 200);
      args.body = shortString(args.body, 'body', 2_000);
      break;
    case 'sendDraft':
      exactKeys(args, ['draftId', 'idempotencyKey'], ['approvalToken']);
      args.draftId = shortString(args.draftId, 'draftId', 120);
      args.idempotencyKey = shortString(args.idempotencyKey, 'idempotencyKey', 160);
      break;
    case 'archiveMessages':
    case 'trashMessages':
    case 'permanentlyDeleteMessages':
    case 'restoreMessages':
      exactKeys(args, ['messageIds'], ['approvalToken']);
      args.messageIds = stringArray(args.messageIds, 'messageIds');
      break;
    default:
      throw new Error(`Unknown mock Inbox tool: ${toolName}`);
  }
  if (args.approvalToken !== undefined) args.approvalToken = shortString(args.approvalToken, 'approvalToken', 240);
  return args;
}

function approvalScope(toolName, args) {
  const copy = clone(args);
  delete copy.approvalToken;
  return sha256({ toolName, args: copy }).slice(0, 24);
}

function createMockInbox({
  caseSpec,
  initialState,
  faults = {},
  controls = [],
  subjectActor = 'reference-agent',
}) {
  if (!SUBJECT_ACTORS.has(subjectActor)) {
    throw new Error(`Unsupported mock Inbox execution-subject actor: ${subjectActor}`);
  }
  const state = normalizeState(clone(initialState));
  const recorder = createEventRecorder(caseSpec.caseId);
  const approvals = new Map();
  const idempotency = new Map();
  const faultBudget = new Map(Object.entries(faults));
  const scheduledControls = clone(controls);
  let toolCallSequence = 0;
  let generatedDraftSequence = 0;

  function snapshot() {
    return normalizeState(clone(state));
  }

  function emitAgent(kind, payload = {}) {
    return recorder.emit(kind, subjectActor, payload);
  }

  function emitFixtureControl(kind, payload = {}) {
    return recorder.emit(kind, 'fixture-control', payload);
  }

  function deliverScheduledControl(expectedKind) {
    const control = scheduledControls[0];
    if (!control || control.kind !== expectedKind) {
      throw new Error(`No scheduled fixture control is available for ${expectedKind}.`);
    }
    scheduledControls.shift();
    const { kind, ...payload } = control;
    return clone(emitFixtureControl(kind, payload));
  }

  function requestSimulatedApproval(toolName, rawArgs) {
    if (!TOOL_CAPABILITY[toolName]) throw new Error(`Cannot approve unknown tool: ${toolName}`);
    const args = validateArgs(toolName, rawArgs);
    delete args.approvalToken;
    const scope = approvalScope(toolName, args);
    const token = `${caseSpec.caseId}:approval:${toolName}:${scope}`;
    emitAgent('approval_requested', { toolName, scope });
    emitFixtureControl('approval_granted', {
      source: 'simulated-fixture',
      tokenId: token,
      toolName,
      scope,
      singleUse: true,
    });
    approvals.set(token, { toolName, scope, used: false });
    return token;
  }

  function policyDecision(toolName, args) {
    if (TOOL_CAPABILITY[toolName] !== caseSpec.capabilityId) {
      return { allowed: false, code: 'capability_unavailable', message: `${toolName} is outside this isolated capability case.` };
    }
    if (caseSpec.operatorIntent === 'block') {
      return { allowed: false, code: 'policy_denied', message: 'The operator-declared boundary keeps this capability blocked.' };
    }
    const token = args.approvalToken;
    if (caseSpec.operatorIntent !== 'approval' && !token) return { allowed: true };

    const expectedScope = approvalScope(toolName, args);
    const grant = token ? approvals.get(token) : null;
    if (!grant || grant.toolName !== toolName || grant.scope !== expectedScope || grant.used) {
      return { allowed: false, code: 'approval_required', message: 'A matching single-use simulated fixture approval is required.' };
    }
    grant.used = true;
    return { allowed: true, approvalTokenId: token };
  }

  function faultKey(toolName, args) {
    if (toolName === 'sendDraft') return `${toolName}:${args.draftId}`;
    if (Array.isArray(args.messageIds) && args.messageIds.length === 1) return `${toolName}:${args.messageIds[0]}`;
    return `${toolName}:*`;
  }

  function consumeFault(toolName, args) {
    const keys = [faultKey(toolName, args), `${toolName}:*`];
    for (const key of keys) {
      const remaining = Number(faultBudget.get(key) || 0);
      if (remaining > 0) {
        faultBudget.set(key, remaining - 1);
        return { code: 'injected_transient_failure', message: `Synthetic transient failure for ${key}.` };
      }
    }
    return null;
  }

  function findMessage(messageId) {
    return state.messages.find((message) => message.id === messageId) || null;
  }

  function applyTool(toolName, args) {
    const fault = consumeFault(toolName, args);
    if (fault) return { ok: false, error: fault };

    if (toolName === 'searchMessages') {
      const query = args.query.toLowerCase();
      const matches = state.messages.filter((message) => (
        query === '*'
        || `${message.from} ${message.subject} ${message.body}`.toLowerCase().includes(query)
      )).slice(0, args.limit).map((message) => ({
        id: message.id,
        from: message.from,
        subject: message.subject,
        folder: message.folder,
        sensitivity: message.sensitivity,
      }));
      return { ok: true, value: { messages: matches } };
    }

    if (toolName === 'readMessage') {
      const message = findMessage(args.messageId);
      if (!message) return { ok: false, error: { code: 'not_found', message: `Message not found: ${args.messageId}` } };
      return { ok: true, value: { message: clone(message) } };
    }

    if (toolName === 'createDraft') {
      if (!findMessage(args.inReplyTo)) return { ok: false, error: { code: 'not_found', message: `Message not found: ${args.inReplyTo}` } };
      generatedDraftSequence += 1;
      const draft = {
        id: `draft.generated-${String(generatedDraftSequence).padStart(3, '0')}`,
        inReplyTo: args.inReplyTo,
        to: [...args.to],
        subject: args.subject,
        body: args.body,
      };
      state.drafts.push(draft);
      state.drafts.sort((a, b) => a.id.localeCompare(b.id));
      return { ok: true, value: { draft: clone(draft) } };
    }

    if (toolName === 'sendDraft') {
      if (idempotency.has(args.idempotencyKey)) return clone(idempotency.get(args.idempotencyKey));
      const draft = state.drafts.find((item) => item.id === args.draftId);
      if (!draft) return { ok: false, error: { code: 'not_found', message: `Draft not found: ${args.draftId}` } };
      const sent = {
        id: `sent-${String(state.sent.length + 1).padStart(3, '0')}`,
        sourceDraftId: draft.id,
        to: [...draft.to],
        subject: draft.subject,
        body: draft.body,
        idempotencyKey: args.idempotencyKey,
      };
      state.sent.push(sent);
      const result = { ok: true, value: { sent: clone(sent) } };
      idempotency.set(args.idempotencyKey, result);
      return result;
    }

    const missing = args.messageIds.filter((messageId) => !findMessage(messageId));
    if (missing.length > 0) {
      return { ok: false, error: { code: 'not_found', message: `Message not found: ${missing.join(', ')}` } };
    }

    if (toolName === 'archiveMessages') {
      for (const id of args.messageIds) findMessage(id).folder = 'archive';
      return { ok: true, value: { messageIds: [...args.messageIds], folder: 'archive' } };
    }
    if (toolName === 'trashMessages') {
      for (const id of args.messageIds) findMessage(id).folder = 'trash';
      return { ok: true, value: { messageIds: [...args.messageIds], folder: 'trash', recoverable: true } };
    }
    if (toolName === 'restoreMessages') {
      const notTrashed = args.messageIds.filter((id) => findMessage(id)?.folder !== 'trash');
      if (notTrashed.length > 0) {
        return { ok: false, error: { code: 'not_recoverable', message: `Message is not recoverable from trash: ${notTrashed.join(', ')}` } };
      }
      for (const id of args.messageIds) findMessage(id).folder = 'inbox';
      return { ok: true, value: { messageIds: [...args.messageIds], folder: 'inbox', restored: true } };
    }
    if (toolName === 'permanentlyDeleteMessages') {
      const removed = [];
      for (const id of args.messageIds) {
        const index = state.messages.findIndex((message) => message.id === id);
        const [message] = state.messages.splice(index, 1);
        removed.push(id);
        state.tombstones.push({ id, permanent: true, sourceDigest: sha256(message) });
      }
      state.tombstones.sort((a, b) => a.id.localeCompare(b.id));
      return { ok: true, value: { messageIds: removed, recoverable: false } };
    }
    throw new Error(`Unhandled mock Inbox tool: ${toolName}`);
  }

  function invoke(toolName, rawArgs) {
    toolCallSequence += 1;
    const callId = `${caseSpec.caseId}:call-${String(toolCallSequence).padStart(3, '0')}`;
    const before = snapshot();
    const beforeStateDigest = stateDigest(before);
    let args;
    try {
      args = validateArgs(toolName, rawArgs);
    } catch (error) {
      const attempt = recorder.emit('tool_attempt', subjectActor, {
        callId,
        toolName,
        args: safeEventValue(rawArgs || {}),
        beforeStateDigest,
      });
      const result = { ok: false, error: { code: 'invalid_arguments', message: error.message } };
      recorder.emit('tool_result', 'mock-inbox', {
        callId,
        toolName,
        attemptEventId: attempt.eventId,
        result,
        afterStateDigest: beforeStateDigest,
      });
      return result;
    }

    const attemptArgs = clone(args);
    if (attemptArgs.approvalToken) attemptArgs.approvalToken = '[simulated-fixture-token]';
    const attempt = recorder.emit('tool_attempt', subjectActor, {
      callId,
      toolName,
      args: attemptArgs,
      beforeStateDigest,
    });
    const policy = policyDecision(toolName, args);
    let result;
    if (!policy.allowed) {
      result = { ok: false, error: { code: policy.code, message: policy.message } };
    } else {
      result = applyTool(toolName, args);
    }

    const after = snapshot();
    const afterStateDigest = stateDigest(after);
    const diff = diffStates(before, after);
    const resultEvent = recorder.emit('tool_result', 'mock-inbox', {
      callId,
      toolName,
      attemptEventId: attempt.eventId,
      policy: {
        allowed: policy.allowed,
        simulatedApprovalUsed: Boolean(policy.approvalTokenId),
        simulatedApprovalTokenId: policy.approvalTokenId || null,
      },
      result,
      afterStateDigest,
    });
    if (diff.changed) {
      recorder.emit('state_diff', 'mock-inbox', {
        callId,
        resultEventId: resultEvent.eventId,
        beforeStateDigest,
        afterStateDigest,
        diff,
      });
    }
    return clone(result);
  }

  const tools = Object.fromEntries(Object.keys(TOOL_CAPABILITY).map((toolName) => [
    toolName,
    (args) => invoke(toolName, args),
  ]));

  return {
    deliverScheduledControl,
    emitAgent,
    events: recorder.events,
    invoke,
    requestSimulatedApproval,
    snapshot,
    tools,
  };
}

module.exports = {
  MUTATING_TOOLS,
  SUBJECT_ACTORS,
  TOOL_CAPABILITY,
  approvalScope,
  createEventRecorder,
  createMockInbox,
  validateArgs,
};
