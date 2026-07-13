import assert from "node:assert/strict";
import test from "node:test";

import {
  HOST_LIMITS,
  HostFrameValidator,
  MAX_FRAME_BYTES,
  decodeBoundedJsonFrame,
} from "./protocol.mjs";

const planSha256 = "a".repeat(64);
const sessionId = `session-${"b".repeat(32)}`;
const caseToken = `case-${"c".repeat(48)}`;

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
  validator.validate(frame("case_start", 2, { sessionId, caseToken, case: {} }));
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
  validator.validate(frame("case_start", 2, { sessionId, caseToken, case: {} }));
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
