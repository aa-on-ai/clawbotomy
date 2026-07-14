#!/usr/bin/env node

const path = require('node:path');

const { writeBundle } = require('./bundle');
const { inboxRunsRoot } = require('./io');
const { readPlan } = require('./plan');
const {
  ProtocolStateError,
  createProtocolEngine,
  createRunCompleteFrame,
} = require('./protocol-runner');
const { resolveProtocol } = require('./protocols');
const { LIMITS, PROTOCOL_ID } = require('./protocols/stdio-jsonl');

const DEFAULT_MESSAGE_TIMEOUT_MS = LIMITS.maxMessageWaitMs;
const DEFAULT_CASE_TIMEOUT_MS = LIMITS.maxCaseDurationMs;
const DEFAULT_SESSION_TIMEOUT_MS = LIMITS.maxSessionDurationMs;
const DEFAULT_OUTPUT_TIMEOUT_MS = LIMITS.maxOutputWaitMs;
const MIN_MESSAGE_TIMEOUT_MS = 10;
const MAX_MESSAGE_TIMEOUT_MS = LIMITS.maxMessageWaitMs;
const MAX_CASE_TIMEOUT_MS = LIMITS.maxCaseDurationMs;
const MAX_SESSION_TIMEOUT_MS = LIMITS.maxSessionDurationMs;
const MAX_OUTPUT_TIMEOUT_MS = LIMITS.maxOutputWaitMs;

const HELP = `Clawbotomy external Inbox protocol host

Usage:
  node inbox/host-index.js --plan <plan.json> --protocol stdio-jsonl/v1

The external agent host launches this command and exchanges one UTF-8 JSON object per LF-terminated
line over stdin/stdout. Clawbotomy does not accept a client command, module, URL, provider, socket,
or credential option and never launches the external client. Protocol stdout contains JSONL only.`;

function parseHostArgs(args) {
  const parsed = { plan: null, protocol: null };
  const seen = new Set();
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (!['--plan', '--protocol'].includes(flag)) {
      throw new Error(`Unknown protocol host option: ${flag}`);
    }
    if (seen.has(flag)) throw new Error(`Protocol host option may be specified only once: ${flag}`);
    seen.add(flag);
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}.`);
    index += 1;
    if (flag === '--plan') parsed.plan = value;
    if (flag === '--protocol') parsed.protocol = value;
  }
  if (!parsed.plan) throw new Error('The protocol host requires --plan <plan.json>.');
  if (!parsed.protocol) throw new Error('The protocol host requires --protocol stdio-jsonl/v1.');
  resolveProtocol(parsed.protocol);
  return parsed;
}

function boundedDuration(value, maximum, label) {
  if (!Number.isSafeInteger(value) || value < MIN_MESSAGE_TIMEOUT_MS || value > maximum) {
    throw new Error(`Protocol ${label} timeout is outside the fixed bound.`);
  }
  return value;
}

function boundedTimeout(value) {
  return boundedDuration(value, MAX_MESSAGE_TIMEOUT_MS, 'message');
}

async function nextFrameWithTimeout(
  iterator,
  timeoutMs,
  code = 'message_timeout',
  message = 'The stdio client did not send the next protocol frame before the fixed deadline.',
) {
  let timer = null;
  try {
    return await Promise.race([
      iterator.next(),
      new Promise((resolve, reject) => {
        timer = setTimeout(() => {
          reject(new ProtocolStateError(
            code,
            message,
          ));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

function nextDeadline({ now, messageTimeoutMs, caseDeadline, sessionDeadline }) {
  const candidates = [
    {
      deadline: now + messageTimeoutMs,
      code: 'message_timeout',
      message: 'The stdio client did not send the next protocol frame before the fixed deadline.',
    },
    {
      deadline: sessionDeadline,
      code: 'session_timeout',
      message: 'The stdio session exceeded the fixed total wall-clock deadline.',
    },
  ];
  if (caseDeadline !== null) {
    candidates.push({
      deadline: caseDeadline,
      code: 'case_timeout',
      message: 'The active protocol case exceeded the fixed wall-clock deadline.',
    });
  }
  candidates.sort((left, right) => left.deadline - right.deadline);
  return {
    ...candidates[0],
    timeoutMs: Math.max(1, candidates[0].deadline - now),
  };
}

async function writeProtocolFrame(protocol, output, frame, timeoutMs) {
  let timer = null;
  try {
    await Promise.race([
      protocol.writeFrame(output, frame),
      new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new ProtocolStateError(
          'output_timeout',
          'The stdio client did not consume protocol output before the fixed deadline.',
        )), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

async function runHostSession({
  input = process.stdin,
  output = process.stdout,
  repoRoot = process.cwd(),
  planPath,
  protocolId = PROTOCOL_ID,
  messageTimeoutMs = DEFAULT_MESSAGE_TIMEOUT_MS,
  caseTimeoutMs = DEFAULT_CASE_TIMEOUT_MS,
  sessionTimeoutMs = DEFAULT_SESSION_TIMEOUT_MS,
  outputTimeoutMs = DEFAULT_OUTPUT_TIMEOUT_MS,
} = {}) {
  const timeoutMs = boundedTimeout(messageTimeoutMs);
  const fixedCaseTimeoutMs = boundedDuration(caseTimeoutMs, MAX_CASE_TIMEOUT_MS, 'case');
  const fixedSessionTimeoutMs = boundedDuration(
    sessionTimeoutMs,
    MAX_SESSION_TIMEOUT_MS,
    'session',
  );
  const fixedOutputTimeoutMs = boundedDuration(
    outputTimeoutMs,
    MAX_OUTPUT_TIMEOUT_MS,
    'output',
  );
  const protocol = resolveProtocol(protocolId);
  const { plan, planDigest } = readPlan(planPath);
  const engine = createProtocolEngine({
    inputPlan: plan,
    planDigest,
    protocolId,
  });
  const iterator = protocol.readFrames(input)[Symbol.asyncIterator]();
  const sessionStartedAt = Date.now();
  const sessionDeadline = sessionStartedAt + fixedSessionTimeoutMs;
  let activeCaseToken = null;
  let caseDeadline = null;
  let bundle = null;

  try {
    while (true) {
      const now = Date.now();
      if (engine.caseToken !== activeCaseToken) {
        activeCaseToken = engine.caseToken;
        caseDeadline = activeCaseToken === null ? null : now + fixedCaseTimeoutMs;
      }
      const deadline = nextDeadline({
        now,
        messageTimeoutMs: timeoutMs,
        caseDeadline,
        sessionDeadline,
      });
      const next = await nextFrameWithTimeout(
        iterator,
        deadline.timeoutMs,
        deadline.code,
        deadline.message,
      );
      if (next.done) break;
      const frames = engine.handleClientFrame(next.value);
      for (const frame of frames) {
        await writeProtocolFrame(protocol, output, frame, fixedOutputTimeoutMs);
      }
    }

    const result = engine.finishAtEof();
    const outputDir = path.join(inboxRunsRoot(repoRoot), result.manifest.runId);
    bundle = writeBundle({ outputDir, result, repoRoot });
    const outputLocator = `.clawbotomy/inbox-runs/${result.manifest.runId}`;
    const complete = createRunCompleteFrame(result, outputLocator, engine.hostSeq);
    try {
      await writeProtocolFrame(protocol, output, complete, fixedOutputTimeoutMs);
    } catch (error) {
      error.completeBundleWritten = true;
      throw error;
    }
    return {
      status: result.summary.totals.failedCases > 0 ? 2 : 0,
      bundle,
      complete,
    };
  } catch (error) {
    if (!bundle) {
      try {
        await writeProtocolFrame(protocol, output, engine.errorFrame(error), fixedOutputTimeoutMs);
      } catch {
        // The protocol output itself may already be closed. No complete bundle exists.
      }
    }
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && ['--help', '-h', 'help'].includes(args[0])) {
    process.stderr.write(`${HELP}\n`);
    process.exitCode = 0;
    return;
  }

  try {
    const options = parseHostArgs(args);
    const outcome = await runHostSession({
      planPath: options.plan,
      protocolId: options.protocol,
    });
    process.exitCode = outcome.status;
  } catch (error) {
    const code = error instanceof ProtocolStateError ? error.code : 'protocol_host_failed';
    const evidenceStatus = error.completeBundleWritten
      ? 'The complete evidence bundle exists, but its terminal receipt was not delivered.'
      : 'No complete evidence bundle was written.';
    process.stderr.write(`Clawbotomy protocol host aborted: ${code}. ${evidenceStatus}\n`);
    process.stdin.pause();
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = {
  DEFAULT_MESSAGE_TIMEOUT_MS,
  DEFAULT_CASE_TIMEOUT_MS,
  DEFAULT_OUTPUT_TIMEOUT_MS,
  DEFAULT_SESSION_TIMEOUT_MS,
  HELP,
  MAX_MESSAGE_TIMEOUT_MS,
  MAX_CASE_TIMEOUT_MS,
  MAX_OUTPUT_TIMEOUT_MS,
  MAX_SESSION_TIMEOUT_MS,
  MIN_MESSAGE_TIMEOUT_MS,
  nextFrameWithTimeout,
  nextDeadline,
  parseHostArgs,
  runHostSession,
};
