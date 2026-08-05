#!/usr/bin/env node

const path = require('node:path');

const { inboxRunsRoot } = require('./io');
const { readPlan } = require('./plan');
const { resolveAdapter } = require('./adapters');
const { runAdapterPlanInMemory } = require('./adapter-runner');
const { runPlanInMemory } = require('./runner');
const { validateBundle, writeBundle } = require('./bundle');
const claimRegistry = require('../claims/registry.json');

const HELP = `Clawbotomy deterministic mock Inbox runner

Usage:
  npm run inbox -- run --plan <plan.json> [--agent bounded|overreach]
  npm run inbox -- run --plan <plan.json> --adapter declarative-policy/v1 --adapter-config <policy.json>
  npm run inbox -- validate <bundle-directory>
  npm run inbox -- replay <bundle-directory>
  npm run inbox -- summarize <bundle-directory>

External stdio client (the client host launches Clawbotomy):
  node inbox/host-index.js --plan <plan.json> --protocol stdio-jsonl/v1

The runner uses only bundled reference controls or a checked-in allowlisted declarative adapter
and a synthetic in-memory mailbox. It never loads adapter modules from user input, inspects the
configuration reference in the plan, executes a deployed agent, or connects to a real Inbox.
Adapter evidence applies only to the exact embedded policy; configuredAgentInspected stays false.

Exit status: 0 = passed, 2 = valid evidence with findings, 1 = invalid input, execution, or bundle.`;

function parseRunArgs(args) {
  const parsed = {
    agent: 'bounded',
    agentExplicit: false,
    adapter: null,
    adapterConfig: null,
    plan: null,
  };
  const seenFlags = new Set();
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (!['--agent', '--adapter', '--adapter-config', '--plan'].includes(flag)) {
      throw new Error(`Unknown run option: ${flag}`);
    }
    if (seenFlags.has(flag)) throw new Error(`Run option may be specified only once: ${flag}`);
    seenFlags.add(flag);
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}.`);
    index += 1;
    if (flag === '--agent') {
      parsed.agent = value;
      parsed.agentExplicit = true;
    }
    if (flag === '--adapter') parsed.adapter = value;
    if (flag === '--adapter-config') parsed.adapterConfig = value;
    if (flag === '--plan') parsed.plan = value;
  }
  if (!parsed.plan) throw new Error('The run command requires --plan <plan.json>.');
  if (Boolean(parsed.adapter) !== Boolean(parsed.adapterConfig)) {
    throw new Error('The adapter run requires both --adapter and --adapter-config.');
  }
  if (parsed.adapter && parsed.agentExplicit) {
    throw new Error('--agent cannot be combined with --adapter and --adapter-config.');
  }
  if (parsed.adapter) resolveAdapter(parsed.adapter);
  if (!['bounded', 'bounded/v1', 'overreach', 'overreach/v1'].includes(parsed.agent)) {
    throw new Error('The reference agent must be bounded or overreach.');
  }
  return parsed;
}

function oneBundleArg(command, args) {
  if (args.length !== 1 || args[0].startsWith('--')) {
    throw new Error(`The ${command} command requires exactly one bundle directory.`);
  }
  return args[0];
}

function printRunReceipt(bundle) {
  const adapterRun = bundle.manifest.schemaId === 'clawbotomy.inbox-adapter-run-manifest/v1';
  const protocolRun = bundle.manifest.schemaId === 'clawbotomy.inbox-protocol-run-manifest/v1';
  const observation = protocolRun
    ? bundle.summary.protocolObservation
    : adapterRun
      ? bundle.summary.subjectObservation
      : bundle.summary.referenceObservation;
  const evidenceLane = protocolRun ? 'configured-agent-session' : 'synthetic-reference-control';
  console.log(JSON.stringify({
    evidenceLane,
    nonClaims: claimRegistry.lanes[evidenceLane].defaultNonClaims,
    runId: bundle.manifest.runId,
    outputDir: bundle.outputDir,
    executionSubject: protocolRun || adapterRun
      ? bundle.manifest.executionSubject.id
      : bundle.manifest.referenceAgent.id,
    executionKind: protocolRun || adapterRun
      ? bundle.manifest.executionSubject.kind
      : bundle.manifest.referenceAgent.kind,
    applicability: observation.applicability,
    adapterConfigurationSha256: adapterRun
      ? bundle.manifest.adapterConfiguration.sha256
      : undefined,
    status: observation.status,
    cases: bundle.summary.totals.completedCases,
    passed: bundle.summary.totals.passedCases,
    failed: bundle.summary.totals.failedCases,
    toolAttempts: bundle.summary.totals.toolAttempts,
    stateTransitions: bundle.summary.totals.stateTransitions,
    coreDigest: bundle.summary.coreDigest,
    authorizationStatus: bundle.summary.evidence.authorizationStatus,
    permissionDecision: null,
  }, null, 2));
}

async function execute(argv, { repoRoot = process.cwd() } = {}) {
  const [command, ...args] = argv;
  if (!command || command === '--help' || command === '-h' || command === 'help') {
    console.log(HELP);
    return 0;
  }

  if (command === 'run') {
    const options = parseRunArgs(args);
    const { plan, planDigest } = readPlan(options.plan);
    const result = options.adapter
      ? await runAdapterPlanInMemory({
        inputPlan: plan,
        planDigest,
        adapterId: options.adapter,
        adapterConfiguration: resolveAdapter(options.adapter).readConfig(options.adapterConfig).configuration,
      })
      : await runPlanInMemory({
        inputPlan: plan,
        planDigest,
        profile: options.agent,
      });
    const outputDir = path.join(inboxRunsRoot(repoRoot), result.manifest.runId);
    const bundle = writeBundle({ outputDir, result, repoRoot });
    printRunReceipt(bundle);
    return result.summary.totals.failedCases > 0 ? 2 : 0;
  }

  if (['validate', 'replay', 'summarize'].includes(command)) {
    const bundleDir = oneBundleArg(command, args);
    const bundle = await validateBundle(bundleDir, { repoRoot });
    if (command === 'summarize') console.log(JSON.stringify(bundle.summary, null, 2));
    else printRunReceipt(bundle);
    return bundle.summary.totals.failedCases > 0 ? 2 : 0;
  }

  throw new Error(`Unknown Inbox command: ${command}`);
}

async function main() {
  try {
    process.exitCode = await execute(process.argv.slice(2));
  } catch (error) {
    console.error(`Inbox runner error: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = {
  HELP,
  execute,
  parseRunArgs,
};
