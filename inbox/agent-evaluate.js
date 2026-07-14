#!/usr/bin/env node

const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const fs = require('node:fs');

const { readPlan } = require('./plan');
const { writeExclusive } = require('./io');
const { validateBundle } = require('./bundle');

const ATTEMPT_SCHEMA_ID = 'clawbotomy.agent-evaluation-attempt/v1';
const ATTEMPT_SCHEMA_VERSION = '1.0.0';
const MAX_CAPTURE_BYTES = 8 * 1024 * 1024;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const RUN_ID_PATTERN = /^inbox-host-[a-f0-9]{20}$/;
const UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

const DIAGNOSTIC_CODES = Object.freeze({
  BRIDGE_SPAWN_FAILED: 'bridge_spawn_failed',
  BRIDGE_TERMINATED_BY_SIGNAL: 'bridge_terminated_by_signal',
  BRIDGE_EXIT_1: 'bridge_exit_1',
  UNSUPPORTED_BRIDGE_EXIT: 'unsupported_bridge_exit',
  TERMINAL_RECEIPT_INVALID: 'terminal_receipt_invalid',
  BUNDLE_SNAPSHOT_FAILED: 'bundle_snapshot_failed',
  NO_UNIQUE_VALIDATED_BUNDLE: 'no_unique_validated_bundle',
  MULTIPLE_VALIDATED_BUNDLES: 'multiple_validated_bundles',
  BUNDLE_INSPECTION_FAILED: 'bundle_inspection_failed',
  BRIDGE_BUNDLE_MISMATCH: 'bridge_bundle_mismatch',
  BRIDGE_STATUS_MISMATCH: 'bridge_status_mismatch',
  RECOVERED_AFTER_EXIT_1: 'replay_validated_bundle_recovered_after_exit_1',
});

const ADAPTERS = Object.freeze({
  openclaw: Object.freeze({
    clientId: 'openclaw.clawbotomy-bridge',
  }),
  hermes: Object.freeze({
    clientId: 'hermes-agent.clawbotomy-bridge',
    modelLabel: 'openai-codex/gpt-5.6-sol',
  }),
});

const FLAG_NAMES = Object.freeze({
  '--adapter': 'adapter',
  '--plan': 'plan',
  '--model': 'model',
  '--openclaw-bin': 'openclawBin',
  '--auth-source-agent-dir': 'authSourceAgentDir',
  '--plugin-registry-source-state-dir': 'pluginRegistrySourceStateDir',
  '--expected-openclaw-runtime-sha256': 'expectedOpenClawRuntimeSha256',
  '--expected-provider-runtime-sha256': 'expectedProviderRuntimeSha256',
  '--expected-codex-runtime-sha256': 'expectedCodexRuntimeSha256',
  '--hermes-root': 'hermesRoot',
  '--hermes-home': 'hermesHome',
});

const COMMON_OPTIONS = new Set(['adapter', 'plan']);
const OPENCLAW_OPTIONS = new Set([
  ...COMMON_OPTIONS,
  'model',
  'openclawBin',
  'authSourceAgentDir',
  'pluginRegistrySourceStateDir',
  'expectedOpenClawRuntimeSha256',
  'expectedProviderRuntimeSha256',
  'expectedCodexRuntimeSha256',
]);
const HERMES_OPTIONS = new Set([
  ...COMMON_OPTIONS,
  'hermesRoot',
  'hermesHome',
]);

function requiredText(value, label, maximum = 4096) {
  if (typeof value !== 'string' || value.length === 0 || value.length > maximum || /[\0\r\n]/.test(value)) {
    throw new Error(`${label} requires a non-empty value.`);
  }
  return value;
}

function requiredDigest(value, label) {
  if (!SHA256_PATTERN.test(value || '')) throw new Error(`${label} must be a lowercase SHA-256 digest.`);
  return value;
}

function rejectOptionsOutside(options, allowed, adapter) {
  for (const name of Object.keys(options)) {
    if (!allowed.has(name)) throw new Error(`Option --${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} is not valid for ${adapter}.`);
  }
}

function parseArgs(argv) {
  if (!Array.isArray(argv)) throw new Error('Evaluation arguments must be an array.');
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const name = FLAG_NAMES[flag];
    if (!name) throw new Error(`Unknown evaluation option: ${String(flag)}`);
    if (Object.hasOwn(options, name)) throw new Error(`Duplicate evaluation option: ${flag}`);
    const value = argv[index + 1];
    if (typeof value !== 'string' || value.length === 0 || value.startsWith('--')) {
      throw new Error(`${flag} requires a value.`);
    }
    options[name] = value;
  }

  if (!Object.hasOwn(ADAPTERS, options.adapter)) {
    throw new Error('--adapter must be exactly openclaw or hermes.');
  }
  requiredText(options.plan, '--plan');

  if (options.adapter === 'openclaw') {
    rejectOptionsOutside(options, OPENCLAW_OPTIONS, 'openclaw');
    const model = requiredText(options.model, '--model', 120);
    if (!/^(?:ollama|openai)\/[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(model)) {
      throw new Error('--model must be a non-secret ollama/<model> or openai/<model> label.');
    }
    if (/(?:^|\/)(?:sk|gh[opsu]|xox[baprs])-[A-Za-z0-9_-]{8,}/i.test(model)) {
      throw new Error('--model must not contain a credential-like value.');
    }
    requiredText(options.openclawBin, '--openclaw-bin');
    requiredDigest(options.expectedOpenClawRuntimeSha256, '--expected-openclaw-runtime-sha256');
    requiredDigest(options.expectedProviderRuntimeSha256, '--expected-provider-runtime-sha256');
    if (model.startsWith('openai/')) {
      requiredText(options.authSourceAgentDir, '--auth-source-agent-dir');
      requiredText(options.pluginRegistrySourceStateDir, '--plugin-registry-source-state-dir');
      requiredDigest(options.expectedCodexRuntimeSha256, '--expected-codex-runtime-sha256');
    } else if (
      options.authSourceAgentDir
      || options.pluginRegistrySourceStateDir
      || options.expectedCodexRuntimeSha256
    ) {
      throw new Error('OpenAI credential/profile options are only valid with an openai/* model.');
    }
  } else {
    rejectOptionsOutside(options, HERMES_OPTIONS, 'hermes');
    requiredText(options.hermesRoot, '--hermes-root');
    requiredText(options.hermesHome, '--hermes-home');
  }
  return options;
}

function buildLaunch(options, { repoRoot, nodePath = process.execPath }) {
  if (options.adapter === 'openclaw') {
    const args = [
      path.join(repoRoot, 'integrations', 'openclaw', 'bridge.mjs'),
      '--plan', options.planAbsolute,
      '--model', options.model,
      '--openclaw-bin', options.openclawBin,
      '--expected-openclaw-runtime-sha256', options.expectedOpenClawRuntimeSha256,
      '--expected-provider-runtime-sha256', options.expectedProviderRuntimeSha256,
    ];
    if (options.model.startsWith('openai/')) {
      args.push(
        '--auth-source-agent-dir', options.authSourceAgentDir,
        '--plugin-registry-source-state-dir', options.pluginRegistrySourceStateDir,
        '--expected-codex-runtime-sha256', options.expectedCodexRuntimeSha256,
      );
    }
    return { command: nodePath, args };
  }

  return {
    command: path.join(path.resolve(options.hermesRoot), 'venv', 'bin', 'python'),
    args: [
      path.join(repoRoot, 'integrations', 'hermes-agent', 'bridge.py'),
      '--repo-root', repoRoot,
      '--plan', options.planAbsolute,
      '--hermes-root', options.hermesRoot,
      '--hermes-home', options.hermesHome,
    ],
  };
}

function appendBounded(state, chunk, maximum, { tail = false } = {}) {
  const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
  if (tail) {
    if (bytes.length >= maximum) {
      state.buffer = Buffer.from(bytes.subarray(bytes.length - maximum));
      state.truncated = true;
      return;
    }
    state.buffer = Buffer.concat([state.buffer, bytes]);
    if (state.buffer.length > maximum) {
      state.buffer = state.buffer.subarray(state.buffer.length - maximum);
      state.truncated = true;
    }
    return;
  }
  const remaining = maximum - state.buffer.length;
  if (remaining > 0) state.buffer = Buffer.concat([state.buffer, bytes.subarray(0, remaining)]);
  if (bytes.length > remaining) state.truncated = true;
}

function parseTerminalReceipt(adapter, stdoutText, exitCode) {
  let document;
  try {
    document = JSON.parse(stdoutText.trim());
  } catch {
    throw new Error('Bridge completed without one valid JSON receipt.');
  }
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new Error('Bridge receipt must be a JSON object.');
  }

  let terminal;
  if (adapter === 'openclaw') {
    if (
      document.schemaId !== 'clawbotomy.openclaw-bridge-receipt/v2'
      || document.hostExitCode !== exitCode
    ) {
      throw new Error('OpenClaw bridge receipt identity or exit code is invalid.');
    }
    terminal = document.run;
  } else {
    if (document.exitCode !== exitCode) throw new Error('Hermes bridge receipt exit code is invalid.');
    terminal = document.receipt;
  }

  if (!terminal || typeof terminal !== 'object' || Array.isArray(terminal)) {
    throw new Error('Bridge receipt omitted the terminal run receipt.');
  }
  const runId = terminal.runId;
  const locator = terminal.outputDir;
  const coreDigest = terminal.coreDigest;
  const expectedStatus = exitCode === 0 ? 'passed' : 'failed';
  if (
    terminal.schemaId !== 'clawbotomy.inbox-protocol-frame/v1'
    || terminal.protocolId !== 'stdio-jsonl/v1'
    || terminal.type !== 'run_complete'
    || !RUN_ID_PATTERN.test(runId || '')
    || locator !== `.clawbotomy/inbox-runs/${runId}`
    || !SHA256_PATTERN.test(coreDigest || '')
    || terminal.status !== expectedStatus
    || !Number.isSafeInteger(terminal.cases)
    || !Number.isSafeInteger(terminal.passed)
    || !Number.isSafeInteger(terminal.failed)
    || terminal.cases < 1
    || terminal.passed < 0
    || terminal.failed < 0
    || terminal.passed + terminal.failed !== terminal.cases
    || (exitCode === 0 && terminal.failed !== 0)
    || (exitCode === 2 && terminal.failed < 1)
  ) {
    throw new Error('Bridge terminal receipt is not a complete, internally consistent run.');
  }
  return { locator, runId, coreDigest };
}

function listRunIds(repoRoot) {
  const runsRoot = path.join(repoRoot, '.clawbotomy', 'inbox-runs');
  let stats;
  try {
    stats = fs.lstatSync(runsRoot);
  } catch (error) {
    if (error?.code === 'ENOENT') return new Set();
    throw error;
  }
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw new Error('Private Inbox runs root must be a real directory.');
  }
  return new Set(fs.readdirSync(runsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && RUN_ID_PATTERN.test(entry.name))
    .map((entry) => entry.name));
}

function normalizedRunIds(value) {
  if (!value || typeof value[Symbol.iterator] !== 'function') {
    throw new Error('Inbox run snapshot must be iterable.');
  }
  const result = new Set();
  for (const runId of value) {
    if (!RUN_ID_PATTERN.test(runId || '')) throw new Error('Inbox run snapshot contained an invalid run ID.');
    result.add(runId);
  }
  return result;
}

function safeValidatedBundle(validated, {
  repoRoot,
  planDigest,
  clientId,
  runId,
}) {
  const manifest = validated?.manifest;
  const summary = validated?.summary;
  const locator = `.clawbotomy/inbox-runs/${runId}`;
  const expectedOutput = path.join(repoRoot, '.clawbotomy', 'inbox-runs', runId);
  const coreDigest = manifest?.coreDigest;
  const totals = summary?.totals;
  if (
    manifest?.schemaId !== 'clawbotomy.inbox-protocol-run-manifest/v1'
    || manifest?.lifecycle?.status !== 'complete'
    || manifest?.runId !== runId
    || manifest?.plan?.sha256 !== planDigest
    || manifest?.executionSubject?.id !== clientId
    || manifest?.protocol?.id !== 'stdio-jsonl/v1'
    || path.resolve(validated?.outputDir || '') !== expectedOutput
    || summary?.runId !== runId
    || !SHA256_PATTERN.test(coreDigest || '')
    || summary?.coreDigest !== coreDigest
    || validated?.replay?.coreDigest !== coreDigest
    || !Number.isSafeInteger(totals?.scheduledCases)
    || !Number.isSafeInteger(totals?.completedCases)
    || !Number.isSafeInteger(totals?.passedCases)
    || !Number.isSafeInteger(totals?.failedCases)
    || totals.scheduledCases < 1
    || totals.completedCases !== totals.scheduledCases
    || totals.passedCases < 0
    || totals.failedCases < 0
    || totals.passedCases + totals.failedCases !== totals.completedCases
  ) {
    throw new Error('Validated bundle does not match this adapter evaluation attempt.');
  }
  return {
    status: totals.failedCases === 0 ? 'passed' : 'findings',
    bundle: { locator, runId, coreDigest },
  };
}

async function discoverNewBundle({
  beforeRunIds,
  repoRoot,
  planDigest,
  clientId,
  listRuns = listRunIds,
  validator = validateBundle,
}) {
  const before = normalizedRunIds(beforeRunIds);
  const after = normalizedRunIds(await listRuns(repoRoot));
  const newRunIds = [...after].filter((runId) => !before.has(runId));
  const accepted = [];
  for (const runId of newRunIds) {
    try {
      const outputDir = path.join(repoRoot, '.clawbotomy', 'inbox-runs', runId);
      const validated = await validator(outputDir, { repoRoot });
      accepted.push(safeValidatedBundle(validated, {
        repoRoot,
        planDigest,
        clientId,
        runId,
      }));
    } catch {
      // A new directory is not evidence until the checked-in replay validator accepts it.
    }
  }
  if (accepted.length !== 1) {
    return {
      accepted: null,
      diagnosticCode: accepted.length > 1
        ? DIAGNOSTIC_CODES.MULTIPLE_VALIDATED_BUNDLES
        : DIAGNOSTIC_CODES.NO_UNIQUE_VALIDATED_BUNDLE,
    };
  }
  return { accepted: accepted[0], diagnosticCode: null };
}

function sameBundle(left, right) {
  return Boolean(
    left
    && right
    && left.locator === right.locator
    && left.runId === right.runId
    && left.coreDigest === right.coreDigest
  );
}

function streamChild(child, operatorStdout, operatorStderr) {
  const stdout = { buffer: Buffer.alloc(0), truncated: false };

  if (!child?.stdout || !child?.stderr) throw new Error('Bridge process did not expose piped output.');
  child.stdout.on('data', (chunk) => {
    operatorStdout.write(chunk);
    appendBounded(stdout, chunk, MAX_CAPTURE_BYTES);
  });
  child.stderr.on('data', (chunk) => {
    operatorStderr.write(chunk);
  });
  return { stdout };
}

function waitForChild(child) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    child.once('error', (error) => finish({ code: 1, signal: null, error }));
    child.once('close', (code, signal) => finish({ code, signal, error: null }));
  });
}

function canonicalTime(now) {
  const value = now();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Evaluation clock returned an invalid time.');
  return date.toISOString();
}

function attemptIdFor(adapter, uuid) {
  const value = uuid();
  if (!UUID_PATTERN.test(value)) throw new Error('Evaluation attempt ID source returned an invalid UUID.');
  return `attempt-${adapter}-${value.toLowerCase()}`;
}

async function run(argv, dependencies = {}) {
  const options = parseArgs(argv);
  const repoRoot = path.resolve(dependencies.repoRoot || path.join(__dirname, '..'));
  const planReader = dependencies.readPlan || readPlan;
  const planResult = await planReader(options.plan);
  if (
    !planResult
    || typeof planResult.absolute !== 'string'
    || !SHA256_PATTERN.test(planResult.planDigest || '')
  ) {
    throw new Error('Inbox plan reader did not return a canonical plan digest.');
  }
  options.planAbsolute = planResult.absolute;

  const now = dependencies.now || (() => new Date());
  const uuid = dependencies.randomUUID || randomUUID;
  const startedAt = canonicalTime(now);
  const attemptId = attemptIdFor(options.adapter, uuid);
  const adapter = ADAPTERS[options.adapter];
  const modelLabel = options.adapter === 'openclaw' ? options.model : adapter.modelLabel;
  const launch = buildLaunch(options, {
    repoRoot,
    nodePath: dependencies.nodePath || process.execPath,
  });
  const spawnProcess = dependencies.spawn || spawn;
  const operatorStdout = dependencies.stdout || process.stdout;
  const operatorStderr = dependencies.stderr || process.stderr;
  const listRuns = dependencies.listRunIds || listRunIds;
  const bundleValidator = dependencies.validateBundle || validateBundle;

  let child;
  let streams = {
    stdout: { buffer: Buffer.alloc(0), truncated: false },
  };
  let outcome;
  try {
    const beforeRunIds = normalizedRunIds(await listRuns(repoRoot));
    try {
      child = spawnProcess(launch.command, launch.args, {
        cwd: repoRoot,
        env: dependencies.env || process.env,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      streams = streamChild(child, operatorStdout, operatorStderr);
      outcome = await waitForChild(child);
    } catch (error) {
      outcome = { code: 1, signal: null, error };
    }
    outcome.beforeRunIds = beforeRunIds;
  } catch (error) {
    outcome = { code: 1, signal: null, error };
  }

  const acceptedExitCode = outcome.signal === null && [0, 1, 2].includes(outcome.code)
    ? outcome.code
    : 1;
  let status = 'infrastructure_failure';
  let bundle = null;
  const diagnosticCodes = [];
  const addDiagnosticCode = (code) => {
    if (!diagnosticCodes.includes(code)) diagnosticCodes.push(code);
  };
  let stdoutBundle = null;

  if (outcome.error) {
    addDiagnosticCode(DIAGNOSTIC_CODES.BRIDGE_SPAWN_FAILED);
  } else if (outcome.signal) {
    addDiagnosticCode(DIAGNOSTIC_CODES.BRIDGE_TERMINATED_BY_SIGNAL);
  } else if (outcome.code === 1) {
    addDiagnosticCode(DIAGNOSTIC_CODES.BRIDGE_EXIT_1);
  } else if (![0, 1, 2].includes(outcome.code)) {
    addDiagnosticCode(DIAGNOSTIC_CODES.UNSUPPORTED_BRIDGE_EXIT);
  }

  if (acceptedExitCode === 0 || acceptedExitCode === 2) {
    try {
      if (streams.stdout.truncated) throw new Error('Bridge receipt exceeded the fixed output capture limit.');
      stdoutBundle = parseTerminalReceipt(
        options.adapter,
        streams.stdout.buffer.toString('utf8'),
        acceptedExitCode,
      );
    } catch {
      addDiagnosticCode(DIAGNOSTIC_CODES.TERMINAL_RECEIPT_INVALID);
    }
  }

  let discovery;
  if (outcome.beforeRunIds) {
    try {
      discovery = await discoverNewBundle({
        beforeRunIds: outcome.beforeRunIds,
        repoRoot,
        planDigest: planResult.planDigest,
        clientId: adapter.clientId,
        listRuns,
        validator: bundleValidator,
      });
    } catch {
      discovery = {
        accepted: null,
        diagnosticCode: DIAGNOSTIC_CODES.BUNDLE_INSPECTION_FAILED,
      };
    }
  } else {
    discovery = {
      accepted: null,
      diagnosticCode: DIAGNOSTIC_CODES.BUNDLE_SNAPSHOT_FAILED,
    };
  }

  const canRecoverExitOne = outcome.signal === null && outcome.code === 1 && !outcome.error;
  if (acceptedExitCode === 1) {
    if (canRecoverExitOne && discovery.accepted) {
      ({ status, bundle } = discovery.accepted);
      addDiagnosticCode(DIAGNOSTIC_CODES.RECOVERED_AFTER_EXIT_1);
    } else if (discovery.diagnosticCode) {
      addDiagnosticCode(discovery.diagnosticCode);
    }
  } else if (stdoutBundle && discovery.accepted) {
    if (!sameBundle(stdoutBundle, discovery.accepted.bundle)) {
      addDiagnosticCode(DIAGNOSTIC_CODES.BRIDGE_BUNDLE_MISMATCH);
    } else if (acceptedExitCode !== (discovery.accepted.status === 'passed' ? 0 : 2)) {
      addDiagnosticCode(DIAGNOSTIC_CODES.BRIDGE_STATUS_MISMATCH);
    } else {
      ({ status, bundle } = discovery.accepted);
    }
  } else if (discovery.diagnosticCode) {
    addDiagnosticCode(discovery.diagnosticCode);
  }

  const receipt = {
    schemaId: ATTEMPT_SCHEMA_ID,
    schemaVersion: ATTEMPT_SCHEMA_VERSION,
    attemptId,
    adapter: options.adapter,
    clientId: adapter.clientId,
    modelLabel,
    planSha256: planResult.planDigest,
    startedAt,
    completedAt: canonicalTime(now),
    exitCode: acceptedExitCode,
    status,
    completeBundleWritten: bundle !== null,
    bundle,
    diagnosticCodes,
  };

  const attemptsRoot = path.resolve(
    dependencies.attemptsRoot || path.join(repoRoot, '.clawbotomy', 'evaluation-attempts'),
  );
  const receiptPath = path.join(attemptsRoot, `evaluation-${attemptId}.json`);
  const receiptWriter = dependencies.writeReceipt || ((target, value) => {
    writeExclusive(target, `${JSON.stringify(value, null, 2)}\n`, 0o600);
  });
  await receiptWriter(receiptPath, receipt);
  return { exitCode: acceptedExitCode, receipt, receiptPath };
}

async function main() {
  const result = await run(process.argv.slice(2));
  process.exitCode = result.exitCode;
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`Clawbotomy agent evaluation failed: ${error instanceof Error ? error.message : 'unknown local error'}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  ADAPTERS,
  ATTEMPT_SCHEMA_ID,
  ATTEMPT_SCHEMA_VERSION,
  MAX_CAPTURE_BYTES,
  DIAGNOSTIC_CODES,
  buildLaunch,
  parseArgs,
  parseTerminalReceipt,
  run,
};
