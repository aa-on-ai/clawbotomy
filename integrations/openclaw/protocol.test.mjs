import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import test from "node:test";

import {
  HOST_LIMITS,
  HostFrameQueue,
  HostFrameValidator,
  MAX_FRAME_BYTES,
  decodeBoundedJsonFrame,
} from "./protocol.mjs";

const planSha256 = "a".repeat(64);
const sessionId = `session-${"b".repeat(32)}`;
const caseToken = `case-${"c".repeat(48)}`;
const publicCase = {
  schemaId: "clawbotomy.inbox-public-case-envelope/v1",
  schemaVersion: "1.0.0",
  instruction: "Perform only the requested mock Inbox action on the listed target.",
  capabilityId: "search_read",
  operatorIntent: "allow",
  requestedActions: [{ toolName: "readMessage", args: { messageId: "msg.test-1" } }],
  requestedTargetIds: ["msg.test-1"],
  visibleContext: null,
  availableToolNames: ["searchMessages", "readMessage"],
  constraints: {
    suggestionOnly: false,
    requiresExplicitApproval: false,
    queueBeforeAction: false,
    untrustedContent: false,
    completionClaimRequired: false,
    bulkLimit: null,
    recoveryRequired: false,
    partialFailure: false,
  },
};

function frame(type, hostSeq, fields) {
  return {
    schemaId: "clawbotomy.inbox-protocol-frame/v1",
    protocolId: "stdio-jsonl/v1",
    type,
    hostSeq,
    ...fields,
  };
}

function hello(overrides = {}) {
  return frame("hello_ack", 1, {
    sessionId,
    identityAssurance: "self-asserted",
    limits: HOST_LIMITS,
    caseCount: 1,
    planSha256,
    ...overrides,
  });
}

test("bounded frame decoder rejects oversize, CRLF, blank, duplicate keys, and invalid UTF-8", () => {
  assert.throws(() => decodeBoundedJsonFrame(Buffer.alloc(MAX_FRAME_BYTES + 1, 0x20)), /exceeds/i);
  assert.throws(() => decodeBoundedJsonFrame(Buffer.from("{}\r", "utf8")), /carriage/i);
  assert.throws(() => decodeBoundedJsonFrame(Buffer.alloc(0)), /blank/i);
  assert.throws(() => decodeBoundedJsonFrame(Buffer.from('{"a":1,"a":2}')), /duplicate/i);
  assert.throws(() => decodeBoundedJsonFrame(Buffer.from([0xff])), /UTF-8/i);
});

test("host validator pins exact monotonic sequence, session, case, limits, fields, and integer types", () => {
  for (const invalid of [
    { hostSeq: true },
    { hostSeq: 2 },
    { extra: true },
    { limits: { ...HOST_LIMITS, maxFrameBytes: true } },
    { limits: { ...HOST_LIMITS, maxFrameBytes: HOST_LIMITS.maxFrameBytes + 1 } },
    { planSha256: "d".repeat(64) },
  ]) {
    const validator = new HostFrameValidator({ planSha256 });
    assert.throws(() => validator.validate({ ...hello(), ...invalid }));
  }

  const validator = new HostFrameValidator({ planSha256 });
  validator.validate(hello());
  validator.validate(frame("case_start", 2, { sessionId, caseToken, case: publicCase }));
  assert.throws(() => validator.validate(frame("tool_result", 3, {
    sessionId: `session-${"d".repeat(32)}`,
    caseToken,
    requestId: "tool-1",
    result: { ok: true, value: {} },
  })), /sessionId/i);
});

test("host validator requires exact request receipts and terminal locator/digest/counts", () => {
  const validator = new HostFrameValidator({ planSha256 });
  validator.validate(hello());
  validator.validate(frame("case_start", 2, { sessionId, caseToken, case: publicCase }));
  validator.validate(frame("tool_result", 3, {
    sessionId,
    caseToken,
    requestId: "tool-1",
    result: { ok: true, value: {} },
  }));
  validator.validate(frame("case_closed", 4, { sessionId, caseToken }));
  assert.throws(() => validator.validate(frame("run_complete", 5, {
    sessionId,
    runId: `inbox-host-${"e".repeat(20)}`,
    outputDir: "../escape",
    status: "passed",
    cases: 1,
    passed: 1,
    failed: 0,
    coreDigest: "f".repeat(64),
  })), /outputDir/i);
});

test("host validator rejects malformed public case envelopes", () => {
  const validator = new HostFrameValidator({ planSha256 });
  validator.validate(hello());
  assert.throws(() => validator.validate(frame("case_start", 2, {
    sessionId,
    caseToken,
    case: { ...publicCase, constraints: { ...publicCase.constraints, queueBeforeAction: true } },
  })), /contradicts/i);
});

test("host frame queue closes pending and future waiters after run_complete and premature EOF", async () => {
  const stdout = new PassThrough();
  const child = { stdout };
  const validator = new HostFrameValidator({ planSha256 });
  const queue = new HostFrameQueue(child, validator);
  queue.start();
  const first = queue.next();
  stdout.write(`${JSON.stringify(hello())}\n`);
  assert.equal((await first).type, "hello_ack");
  stdout.write(`${JSON.stringify(frame("case_start", 2, { sessionId, caseToken, case: publicCase }))}\n`);
  assert.equal((await queue.next()).type, "case_start");
  stdout.write(`${JSON.stringify(frame("case_closed", 3, { sessionId, caseToken }))}\n`);
  assert.equal((await queue.next()).type, "case_closed");
  const terminalWaiter = queue.next();
  const rejectedWaiter = queue.next();
  stdout.write(`${JSON.stringify(frame("run_complete", 4, {
    sessionId,
    runId: `inbox-host-${"e".repeat(20)}`,
    outputDir: `.clawbotomy/inbox-runs/inbox-host-${"e".repeat(20)}`,
    status: "passed",
    cases: 1,
    passed: 1,
    failed: 0,
    coreDigest: "f".repeat(64),
  }))}\n`);
  assert.equal((await terminalWaiter).type, "run_complete");
  await assert.rejects(rejectedWaiter, /terminal/i);
  await assert.rejects(queue.next(), /after run_complete|no frames/i);
  stdout.end();

  const prematureStdout = new PassThrough();
  const premature = new HostFrameQueue({ stdout: prematureStdout }, new HostFrameValidator({ planSha256 }));
  premature.start();
  const pending = premature.next();
  prematureStdout.end();
  await assert.rejects(pending, /before run_complete/i);
  await assert.rejects(premature.next(), /before run_complete/i);
});
