import { TextDecoder } from "node:util";

export const SCHEMA_ID = "clawbotomy.inbox-protocol-frame/v1";
export const PROTOCOL_ID = "stdio-jsonl/v1";
export const MAX_FRAME_BYTES = 64 * 1024;
export const MAX_TOTAL_HOST_BYTES = 8 * 1024 * 1024;
export const HOST_LIMITS = Object.freeze({
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

const HOST_TYPES = new Set([
  "hello_ack",
  "case_start",
  "tool_result",
  "approval_result",
  "control",
  "case_closed",
  "run_complete",
  "error",
]);
const SAFE_ID = /^[a-z0-9][a-z0-9._-]{0,119}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const SESSION_ID = /^session-[a-f0-9]{32}$/;
const CASE_TOKEN = /^case-[a-f0-9]{48}$/;
const RUN_ID = /^inbox-host-[a-f0-9]{20}$/;

export class StopSignal extends Error {
  constructor(control) {
    super("Clawbotomy issued an operator stop");
    this.name = "StopSignal";
    this.control = control;
  }
}

export class Deferred {
  constructor() {
    this.settled = false;
    this.promise = new Promise((resolve, reject) => {
      this.resolve = (value) => {
        if (this.settled) return;
        this.settled = true;
        resolve(value);
      };
      this.reject = (error) => {
        if (this.settled) return;
        this.settled = true;
        reject(error);
      };
    });
  }
}

export function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function fail(label, message) {
  throw new Error(`${label} ${message}`);
}

export function assertExactKeys(value, required, label) {
  if (!isPlainObject(value)) fail(label, "must be a JSON object.");
  const actual = Reflect.ownKeys(value);
  if (
    actual.some((key) => typeof key !== "string")
    || actual.length !== required.length
    || required.some((key) => !Object.hasOwn(value, key))
  ) {
    fail(label, "contains unexpected or missing fields.");
  }
}

function assertSafeInteger(value, label, { minimum = 0, maximum = Number.MAX_SAFE_INTEGER } = {}) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    fail(label, "must be a bounded integer.");
  }
}

function assertBoundedString(value, label, { pattern, maximum = 1_000 } = {}) {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum || (pattern && !pattern.test(value))) {
    fail(label, "must be a bounded string in the required format.");
  }
}

function assertErrorResult(result, label) {
  assertExactKeys(result, ["ok", "error"], label);
  if (result.ok !== false) fail(label, "must set ok to false.");
  assertExactKeys(result.error, ["code", "message"], `${label}.error`);
  assertBoundedString(result.error.code, `${label}.error.code`, { pattern: SAFE_ID, maximum: 120 });
  assertBoundedString(result.error.message, `${label}.error.message`, { maximum: 2_000 });
}

function assertToolResult(result) {
  if (!isPlainObject(result) || typeof result.ok !== "boolean") fail("tool_result.result", "must be a result object.");
  if (result.ok) {
    assertExactKeys(result, ["ok", "value"], "tool_result.result");
    if (!isPlainObject(result.value)) fail("tool_result.result.value", "must be an object.");
  } else {
    assertErrorResult(result, "tool_result.result");
  }
}

function assertHostEnvelope(frame, type, keys, expectedHostSeq) {
  assertExactKeys(frame, keys, `${type} frame`);
  if (frame.schemaId !== SCHEMA_ID || frame.protocolId !== PROTOCOL_ID || frame.type !== type) {
    fail(`${type} frame`, "uses an unexpected protocol identity or type.");
  }
  assertSafeInteger(frame.hostSeq, `${type}.hostSeq`, { minimum: 1 });
  if (frame.hostSeq !== expectedHostSeq) fail(`${type}.hostSeq`, `must be the next exact host sequence (${expectedHostSeq}).`);
}

export function parseStrictJson(text, label = "JSON document", { maxValues = 1_000, maxDepth = 16 } = {}) {
  let offset = 0;
  let values = 0;

  function parseFail(message) {
    throw new Error(`${label} ${message}`);
  }

  function skipWhitespace() {
    while (/\s/u.test(text[offset] || "")) offset += 1;
  }

  function readString() {
    const start = offset;
    if (text[offset] !== '"') parseFail("contains invalid JSON.");
    offset += 1;
    while (offset < text.length) {
      const character = text[offset];
      if (character === '"') {
        offset += 1;
        try {
          return JSON.parse(text.slice(start, offset));
        } catch {
          parseFail("contains invalid JSON.");
        }
      }
      if (character === "\\") offset += 2;
      else offset += 1;
    }
    parseFail("contains invalid JSON.");
  }

  function readPrimitive() {
    const start = offset;
    while (offset < text.length && !/[\s,\]}]/u.test(text[offset])) offset += 1;
    if (offset === start) parseFail("contains invalid JSON.");
    try {
      JSON.parse(text.slice(start, offset));
    } catch {
      parseFail("contains invalid JSON.");
    }
  }

  function readArray(depth) {
    offset += 1;
    skipWhitespace();
    if (text[offset] === "]") {
      offset += 1;
      return;
    }
    while (offset < text.length) {
      readValue(depth + 1);
      skipWhitespace();
      if (text[offset] === "]") {
        offset += 1;
        return;
      }
      if (text[offset] !== ",") parseFail("contains invalid JSON.");
      offset += 1;
      skipWhitespace();
    }
    parseFail("contains invalid JSON.");
  }

  function readObject(depth) {
    const keys = new Set();
    offset += 1;
    skipWhitespace();
    if (text[offset] === "}") {
      offset += 1;
      return;
    }
    while (offset < text.length) {
      const key = readString();
      if (keys.has(key)) parseFail("contains a duplicate JSON object key.");
      keys.add(key);
      skipWhitespace();
      if (text[offset] !== ":") parseFail("contains invalid JSON.");
      offset += 1;
      readValue(depth + 1);
      skipWhitespace();
      if (text[offset] === "}") {
        offset += 1;
        return;
      }
      if (text[offset] !== ",") parseFail("contains invalid JSON.");
      offset += 1;
      skipWhitespace();
    }
    parseFail("contains invalid JSON.");
  }

  function readValue(depth = 0) {
    values += 1;
    if (values > maxValues) parseFail("contains too many JSON values.");
    if (depth > maxDepth) parseFail("is nested too deeply.");
    skipWhitespace();
    if (text[offset] === "{") return readObject(depth);
    if (text[offset] === "[") return readArray(depth);
    if (text[offset] === '"') return readString();
    return readPrimitive();
  }

  readValue();
  skipWhitespace();
  if (offset !== text.length) parseFail("contains invalid JSON.");
  try {
    return JSON.parse(text);
  } catch {
    parseFail("contains invalid JSON.");
  }
}

export function decodeBoundedJsonFrame(bytes, label = "host frame") {
  const buffer = Buffer.from(bytes);
  if (buffer.length === 0) fail(label, "must not be blank.");
  if (buffer.length > MAX_FRAME_BYTES) fail(label, `exceeds the ${MAX_FRAME_BYTES}-byte limit.`);
  if (buffer.includes(0x00)) fail(label, "contains a NUL byte.");
  if (buffer.includes(0x0d)) fail(label, "must use LF framing without carriage returns.");
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    fail(label, "must not contain a UTF-8 BOM.");
  }
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    fail(label, "contains invalid UTF-8.");
  }
  const value = parseStrictJson(text, label, { maxValues: 1_000, maxDepth: 16 });
  if (!isPlainObject(value)) fail(label, "must contain one JSON object.");
  return value;
}

export class HostFrameValidator {
  constructor({ planSha256 }) {
    assertBoundedString(planSha256, "planSha256", { pattern: SHA256, maximum: 64 });
    this.planSha256 = planSha256;
    this.expectedHostSeq = 1;
    this.sessionId = null;
    this.caseCount = null;
    this.caseToken = null;
    this.caseTokens = new Set();
    this.startedCases = 0;
    this.closedCases = 0;
    this.terminalSeen = false;
  }

  assertSession(frame, label) {
    if (typeof frame.sessionId !== "string" || frame.sessionId !== this.sessionId) {
      fail(label, "sessionId does not match hello_ack.");
    }
  }

  assertCase(frame, label) {
    this.assertSession(frame, label);
    if (typeof frame.caseToken !== "string" || frame.caseToken !== this.caseToken) {
      fail(label, "caseToken does not match the active case.");
    }
  }

  validate(frame) {
    if (!isPlainObject(frame) || !HOST_TYPES.has(frame.type)) fail("host frame", "has an unsupported type.");
    if (this.terminalSeen) fail("host frame", "arrived after a terminal run_complete frame.");
    const sequence = this.expectedHostSeq;

    if (frame.type === "hello_ack") {
      assertHostEnvelope(frame, frame.type, [
        "schemaId", "protocolId", "type", "hostSeq", "sessionId", "identityAssurance",
        "limits", "caseCount", "planSha256",
      ], sequence);
      if (this.sessionId !== null || this.startedCases !== 0) fail("hello_ack frame", "is out of order.");
      assertBoundedString(frame.sessionId, "hello_ack.sessionId", { pattern: SESSION_ID, maximum: 40 });
      if (frame.identityAssurance !== "self-asserted") fail("hello_ack.identityAssurance", "is invalid.");
      assertExactKeys(frame.limits, Object.keys(HOST_LIMITS), "hello_ack.limits");
      for (const [name, expected] of Object.entries(HOST_LIMITS)) {
        assertSafeInteger(frame.limits[name], `hello_ack.limits.${name}`, { minimum: 1 });
        if (frame.limits[name] !== expected) fail(`hello_ack.limits.${name}`, `must equal ${expected}.`);
      }
      assertSafeInteger(frame.caseCount, "hello_ack.caseCount", { minimum: 1, maximum: 1_000 });
      if (frame.planSha256 !== this.planSha256) fail("hello_ack.planSha256", "does not match the selected plan.");
      this.sessionId = frame.sessionId;
      this.caseCount = frame.caseCount;
    } else if (frame.type === "case_start") {
      assertHostEnvelope(frame, frame.type, [
        "schemaId", "protocolId", "type", "hostSeq", "sessionId", "caseToken", "case",
      ], sequence);
      this.assertSession(frame, "case_start frame");
      if (this.caseToken !== null || this.startedCases >= this.caseCount) fail("case_start frame", "is out of order.");
      assertBoundedString(frame.caseToken, "case_start.caseToken", { pattern: CASE_TOKEN, maximum: 53 });
      if (this.caseTokens.has(frame.caseToken)) fail("case_start.caseToken", "was already used.");
      if (!isPlainObject(frame.case)) fail("case_start.case", "must be an object.");
      this.caseTokens.add(frame.caseToken);
      this.caseToken = frame.caseToken;
      this.startedCases += 1;
    } else if (frame.type === "tool_result") {
      assertHostEnvelope(frame, frame.type, [
        "schemaId", "protocolId", "type", "hostSeq", "sessionId", "caseToken", "requestId", "result",
      ], sequence);
      this.assertCase(frame, "tool_result frame");
      assertBoundedString(frame.requestId, "tool_result.requestId", { pattern: SAFE_ID, maximum: 120 });
      assertToolResult(frame.result);
    } else if (frame.type === "approval_result") {
      assertHostEnvelope(frame, frame.type, [
        "schemaId", "protocolId", "type", "hostSeq", "sessionId", "caseToken", "requestId", "result",
      ], sequence);
      this.assertCase(frame, "approval_result frame");
      assertBoundedString(frame.requestId, "approval_result.requestId", { pattern: SAFE_ID, maximum: 120 });
      if (!isPlainObject(frame.result) || typeof frame.result.ok !== "boolean") fail("approval_result.result", "must be an approval result.");
      if (frame.result.ok) {
        assertExactKeys(frame.result, ["ok", "approvalHandle", "scope"], "approval_result.result");
        assertBoundedString(frame.result.approvalHandle, "approval_result.approvalHandle", {
          pattern: /^approval-[a-f0-9]{32}$/,
          maximum: 41,
        });
        assertBoundedString(frame.result.scope, "approval_result.scope", { pattern: /^[a-f0-9]{24}$/, maximum: 24 });
      } else {
        assertErrorResult(frame.result, "approval_result.result");
      }
    } else if (frame.type === "control") {
      assertHostEnvelope(frame, frame.type, [
        "schemaId", "protocolId", "type", "hostSeq", "sessionId", "caseToken", "control",
      ], sequence);
      this.assertCase(frame, "control frame");
      assertExactKeys(frame.control, ["kind", "reason"], "control.control");
      if (frame.control.kind !== "operator_stop" || frame.control.reason !== "operator-cancelled-before-execution") {
        fail("control.control", "is not the fixed operator-stop control.");
      }
    } else if (frame.type === "case_closed") {
      assertHostEnvelope(frame, frame.type, [
        "schemaId", "protocolId", "type", "hostSeq", "sessionId", "caseToken",
      ], sequence);
      this.assertCase(frame, "case_closed frame");
      this.caseToken = null;
      this.closedCases += 1;
    } else if (frame.type === "run_complete") {
      assertHostEnvelope(frame, frame.type, [
        "schemaId", "protocolId", "type", "hostSeq", "sessionId", "runId", "outputDir",
        "status", "cases", "passed", "failed", "coreDigest",
      ], sequence);
      this.assertSession(frame, "run_complete frame");
      if (this.caseToken !== null || this.startedCases !== this.caseCount || this.closedCases !== this.caseCount) {
        fail("run_complete frame", "arrived before every advertised case closed.");
      }
      assertBoundedString(frame.runId, "run_complete.runId", { pattern: RUN_ID, maximum: 31 });
      if (frame.outputDir !== `.clawbotomy/inbox-runs/${frame.runId}`) fail("run_complete.outputDir", "is not the exact private output locator.");
      if (frame.status !== "passed" && frame.status !== "failed") fail("run_complete.status", "is invalid.");
      for (const field of ["cases", "passed", "failed"]) {
        assertSafeInteger(frame[field], `run_complete.${field}`, { minimum: 0, maximum: this.caseCount });
      }
      if (
        frame.cases !== this.caseCount
        || frame.passed + frame.failed !== frame.cases
        || (frame.failed === 0 ? frame.status !== "passed" : frame.status !== "failed")
      ) {
        fail("run_complete counts", "do not match hello_ack or status.");
      }
      assertBoundedString(frame.coreDigest, "run_complete.coreDigest", { pattern: SHA256, maximum: 64 });
      this.terminalSeen = true;
    } else {
      assertHostEnvelope(frame, frame.type, [
        "schemaId", "protocolId", "type", "hostSeq", "sessionId", "code", "message", "completeBundleWritten",
      ], sequence);
      this.assertSession(frame, "error frame");
      assertBoundedString(frame.code, "error.code", { pattern: SAFE_ID, maximum: 120 });
      assertBoundedString(frame.message, "error.message", { maximum: 2_000 });
      if (frame.completeBundleWritten !== false) fail("error.completeBundleWritten", "must be false.");
      throw new Error(`Clawbotomy host rejected the bridge (${frame.code}): ${frame.message}`);
    }

    this.expectedHostSeq += 1;
    return frame;
  }
}

export class HostFrameQueue {
  constructor(child, validator) {
    this.child = child;
    this.validator = validator;
    this.frames = [];
    this.waiters = [];
    this.failure = null;
    this.failureSignal = new Deferred();
    this.failureSignal.promise.catch(() => undefined);
    this.controlHandler = null;
  }

  start() {
    this.reader = this.consume();
    this.reader.catch((error) => this.fail(error));
  }

  async consume() {
    let totalBytes = 0;
    let pendingBytes = 0;
    let pending = [];
    let frameNumber = 0;
    for await (const rawChunk of this.child.stdout) {
      const chunk = Buffer.isBuffer(rawChunk) ? rawChunk : Buffer.from(rawChunk);
      totalBytes += chunk.length;
      if (totalBytes > MAX_TOTAL_HOST_BYTES) throw new Error(`Clawbotomy host stdout exceeded ${MAX_TOTAL_HOST_BYTES} bytes`);
      let start = 0;
      for (let index = 0; index < chunk.length; index += 1) {
        if (chunk[index] !== 0x0a) continue;
        const segment = chunk.subarray(start, index);
        pendingBytes += segment.length;
        if (pendingBytes > MAX_FRAME_BYTES) throw new Error(`Clawbotomy host frame ${frameNumber + 1} exceeded ${MAX_FRAME_BYTES} bytes`);
        if (segment.length > 0) pending.push(segment);
        frameNumber += 1;
        const frame = this.validator.validate(decodeBoundedJsonFrame(
          Buffer.concat(pending, pendingBytes),
          `Clawbotomy host frame ${frameNumber}`,
        ));
        pending = [];
        pendingBytes = 0;
        if (frame.type === "control") {
          if (!this.controlHandler) throw new Error("Clawbotomy emitted control without an active case handler");
          this.controlHandler(frame);
        } else {
          this.push(frame);
        }
        start = index + 1;
      }
      const tail = chunk.subarray(start);
      pendingBytes += tail.length;
      if (pendingBytes > MAX_FRAME_BYTES) throw new Error(`Clawbotomy host frame ${frameNumber + 1} exceeded ${MAX_FRAME_BYTES} bytes`);
      if (tail.length > 0) pending.push(tail);
    }
    if (pendingBytes > 0) throw new Error(`Clawbotomy host frame ${frameNumber + 1} ended without LF`);
    if (!this.validator.terminalSeen) throw new Error("Clawbotomy host stdout ended before run_complete");
  }

  push(frame) {
    const waiter = this.waiters.shift();
    if (waiter) waiter.resolve(frame);
    else this.frames.push(frame);
  }

  fail(error) {
    if (this.failure) return;
    this.failure = error instanceof Error ? error : new Error(String(error));
    this.failureSignal.reject(this.failure);
    for (const waiter of this.waiters.splice(0)) waiter.reject(this.failure);
  }

  next() {
    if (this.failure) return Promise.reject(this.failure);
    if (this.frames.length > 0) return Promise.resolve(this.frames.shift());
    const deferred = new Deferred();
    this.waiters.push(deferred);
    return deferred.promise;
  }

  async expect(type, { caseToken, requestId } = {}) {
    const frame = await this.next();
    if (frame.type !== type) throw new Error(`Expected ${type}, received ${frame.type}`);
    if (caseToken !== undefined && frame.caseToken !== caseToken) throw new Error(`${type} caseToken mismatch`);
    if (requestId !== undefined && frame.requestId !== requestId) throw new Error(`${type} requestId mismatch`);
    return frame;
  }

  async nextUntil(stopPromise) {
    if (this.failure) throw this.failure;
    if (this.frames.length > 0) return this.frames.shift();
    const deferred = new Deferred();
    this.waiters.push(deferred);
    return Promise.race([
      deferred.promise,
      stopPromise.then((frame) => {
        const index = this.waiters.indexOf(deferred);
        if (index >= 0) this.waiters.splice(index, 1);
        throw new StopSignal(frame);
      }),
      this.failureSignal.promise,
    ]);
  }

  setControlHandler(handler) {
    this.controlHandler = handler;
  }
}

export class ActionGate {
  constructor() {
    this.state = "active";
    this.control = null;
    this.tail = Promise.resolve();
  }

  activateStop(control) {
    if (this.state === "completed") throw new Error("Operator stop arrived after case completion");
    if (this.state === "stopped") throw new Error("Duplicate operator stop");
    if (this.state !== "active") throw new Error(`Cannot activate operator stop from ${this.state}`);
    this.state = "stopped";
    this.control = control;
  }

  fail() {
    this.state = "failed";
  }

  run(kind, write, { afterStop = false, completes = false } = {}) {
    const invoke = async () => {
      if (this.state === "failed" || this.state === "completed") throw new Error(`Action ${kind} is not allowed after ${this.state}`);
      if (this.state === "stopped" && !afterStop) throw new StopSignal(this.control);
      if (this.state === "active" && afterStop) throw new Error(`Stop-only action ${kind} is not allowed before operator stop`);
      const result = write();
      if (completes) this.state = "completed";
      return result;
    };
    const queued = this.tail.then(invoke, invoke);
    this.tail = queued.then(() => undefined, () => undefined);
    return queued;
  }
}

export async function writeJsonLineBounded(stream, frame) {
  const bytes = Buffer.from(`${JSON.stringify(frame)}\n`, "utf8");
  if (bytes.length - 1 > MAX_FRAME_BYTES) throw new Error(`Outbound protocol frame exceeded ${MAX_FRAME_BYTES} bytes`);
  await new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      stream.off("error", onError);
      callback(value);
    };
    const onError = (error) => finish(reject, error);
    stream.once("error", onError);
    try {
      stream.write(bytes, (error) => {
        if (error) finish(reject, error);
        else finish(resolve);
      });
    } catch (error) {
      finish(reject, error);
    }
  });
}
