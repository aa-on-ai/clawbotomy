#!/usr/bin/env node

const {
  appendCaseRecord,
  finishBundle,
  readPlanFile,
  startBundle,
  writePlanFile,
} = require('./bundle');
const { assertModelConfigured, getModel, normalizeLocalEndpoint } = require('./models');
const { authorizeLivePlan, buildRunPlan, formatPreflight } = require('./preflight');
const { formatReport } = require('./reporter');
const { runBenchmark, TASKS } = require('./runner');
const { getSourceState } = require('./source');

const VALUE_OPTIONS = new Set([
  'models',
  'tasks',
  'runs',
  'judge',
  'output',
  'local-endpoint',
  'bundle-dir',
  'write-plan',
  'plan',
  'confirm-plan',
  'max-cost-usd',
  'max-requests',
]);
const BOOLEAN_OPTIONS = new Set(['dry-run', 'live', 'preflight', 'help']);
const OUTPUTS = ['table', 'json', 'markdown'];

const USAGE = `Clawbotomy model benchmark (research preview)

Usage:

Safe preview:
  node bench/index.js --models <aliases> --tasks <categories> --bundle-dir <new-dir> \\
    --write-plan <new-file> --preflight

Authorized live run:
  node bench/index.js --plan <file> --confirm-plan <digest> --max-requests <n> \\
    --max-cost-usd <usd> --live

Synthetic dry run:
  node bench/index.js --models <aliases> --tasks <categories> --dry-run

Options:
  --models <list>          Comma-separated hosted aliases or local:<model-id>
  --tasks <list|all>       Comma-separated task categories
  --runs <integer>         Runs per case, 1-100 (default: 1; use 5+ for comparison)
  --judge <alias>          Judge model for model-scored categories (default: sonnet)
  --output <format>        table, json, or markdown (default: table)
  --local-endpoint <url>   Loopback OpenAI-compatible local /v1 endpoint
  --bundle-dir <path>      New private evidence directory for the planned live run
  --write-plan <path>      New private plan file written by --preflight
  --plan <path>            Frozen plan file consumed by --live
  --confirm-plan <digest>  Digest copied from the reviewed preflight
  --max-requests <n>       Explicit provider-request ceiling for --live
  --max-cost-usd <usd>     Explicit USD ceiling at or above the preflight upper bound
  --preflight              Resolve and save a plan; makes zero provider requests
  --dry-run                Synthetic stdout preview; not measured evidence
  --live                   Execute only a frozen, separately confirmed plan
  --help                   Show this help

Provider calls use your own accounts and can incur charges. Generated code and tool
calls are not executed. Private bundles are never published automatically.`;

function parseArgs(argv) {
  const args = {
    models: 'opus,sonnet,gpt-5.4',
    tasks: 'all',
    runs: 1,
    judge: 'sonnet',
    output: 'table',
    dryRun: false,
    live: false,
    preflight: false,
    help: false,
    localEndpoint: process.env.LOCAL_LLM_ENDPOINT,
    bundleDir: null,
    writePlan: null,
    plan: null,
    confirmPlan: null,
    maxCostUsd: null,
    maxRequests: null,
    provided: new Set(),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) throw new Error(`Unexpected positional argument: ${token}`);

    const key = token.replace(/^--/, '');
    args.provided.add(key);
    if (BOOLEAN_OPTIONS.has(key)) {
      args[key.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = true;
      continue;
    }
    if (!VALUE_OPTIONS.has(key)) throw new Error(`Unknown option: --${key}`);

    const value = argv[i + 1];
    if (!value || value.startsWith('--')) throw new Error(`Option --${key} requires a value.`);
    args[key.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
    i += 1;
  }

  args.runs = Number(args.runs || 1);
  args.maxCostUsd = args.maxCostUsd === null ? null : Number(args.maxCostUsd);
  args.maxRequests = args.maxRequests === null ? null : Number(args.maxRequests);
  args.localEndpoint = normalizeLocalEndpoint(args.localEndpoint);
  return args;
}

function splitSelections(value, label) {
  const values = value.split(',').map((item) => item.trim()).filter(Boolean);
  if (values.length === 0) throw new Error(`${label} selection cannot be empty.`);
  return values;
}

function validateRunCount(runs) {
  if (!Number.isInteger(runs) || runs < 1) throw new Error(`Runs must be a positive integer; received ${runs}.`);
  if (runs > 100) throw new Error(`Runs must be 100 or fewer; received ${runs}.`);
}

function resolveSelectors(args) {
  const models = splitSelections(args.models, 'Model');
  const tasks = args.tasks === 'all' ? Object.keys(TASKS) : splitSelections(args.tasks, 'Task');
  validateRunCount(args.runs);
  for (const model of models) getModel(model, { localEndpoint: args.localEndpoint });
  getModel(args.judge, { localEndpoint: args.localEndpoint });
  for (const task of tasks) if (!TASKS[task]) throw new Error(`Unknown task category: ${task}`);
  return { models, tasks };
}

function assertOutput(output) {
  if (!OUTPUTS.includes(output)) throw new Error(`Invalid output format: ${output}`);
}

function mode(args) {
  const selected = [args.dryRun, args.live, args.preflight].filter(Boolean).length;
  if (selected !== 1) throw new Error('Choose exactly one execution mode: --preflight, --dry-run, or --live.');
  if (args.preflight) return 'preflight';
  if (args.live) return 'live';
  return 'dry-run';
}

function assertExplicitScope(args) {
  if (!args.provided.has('models') || !args.provided.has('tasks')) {
    throw new Error('Preflight and live planning require explicit --models and --tasks selections.');
  }
}

function validateModeArgs(args, selectedMode) {
  assertOutput(args.output);
  if (selectedMode === 'preflight') {
    assertExplicitScope(args);
    if (!args.bundleDir || !args.writePlan) {
      throw new Error('--preflight requires --bundle-dir and --write-plan new paths.');
    }
    if (args.plan || args.confirmPlan || args.maxCostUsd !== null || args.maxRequests !== null) {
      throw new Error('--preflight cannot accept live authorization options.');
    }
    return;
  }

  if (selectedMode === 'live') {
    if (!args.plan) throw new Error('--live requires a frozen --plan file.');
    const forbidden = ['models', 'tasks', 'runs', 'judge', 'local-endpoint', 'bundle-dir', 'write-plan', 'dry-run', 'preflight'];
    const override = forbidden.find((key) => args.provided.has(key));
    if (override) throw new Error(`--live cannot override frozen plan option --${override}.`);
    return;
  }

  if (args.plan || args.bundleDir || args.writePlan || args.confirmPlan || args.maxCostUsd !== null || args.maxRequests !== null) {
    throw new Error('--dry-run is a synthetic stdout preview and does not accept plan or bundle options.');
  }
}

function planFromArgs(args, source) {
  const { models, tasks } = resolveSelectors(args);
  return buildRunPlan({
    models,
    tasks,
    runs: args.runs,
    judge: args.judge,
    localEndpoint: args.localEndpoint,
    bundlePath: args.bundleDir,
    source,
  });
}

function rebuildFrozenPlan(plan) {
  return buildRunPlan({
    models: plan.configuration.models,
    tasks: plan.configuration.tasks,
    runs: plan.configuration.runs,
    judge: plan.configuration.judge,
    localEndpoint: plan.configuration.localEndpoint,
    bundlePath: plan.configuration.bundlePath,
    source: getSourceState(process.cwd()),
  });
}

function assertCredentials(plan) {
  const aliases = [...new Set(plan.requestGroups.map((group) => group.alias))];
  for (const alias of aliases) {
    assertModelConfigured(alias, { localEndpoint: plan.configuration.localEndpoint });
  }
}

async function runDry(args) {
  const { models, tasks } = resolveSelectors(args);
  const results = await runBenchmark({
    models,
    tasks: tasks.join(','),
    runs: args.runs,
    judge: args.judge,
    dryRun: true,
    localEndpoint: args.localEndpoint,
  });
  return formatReport({
    results,
    output: args.output,
    meta: {
      date: new Date().toISOString().slice(0, 10),
      models,
      tasks,
      runs: args.runs,
      judge: args.judge,
      executionMode: 'synthetic-test',
      lowConfidenceWarning: 'Synthetic dry-run output is not measured evidence and must not inform routing.',
    },
  });
}

function runPreflight(args) {
  const plan = planFromArgs(args, getSourceState(process.cwd()));
  writePlanFile(args.writePlan, plan);
  if (args.output === 'json') {
    return JSON.stringify({ ...plan, frozenPlanPath: require('node:path').resolve(args.writePlan) }, null, 2);
  }
  return `${formatPreflight(plan, args.output)}\n\nFrozen plan written privately to ${args.writePlan}`;
}

async function runLive(args) {
  const frozen = readPlanFile(args.plan);
  const current = rebuildFrozenPlan(frozen);
  if (current.planDigest !== frozen.planDigest) {
    throw new Error(
      `Frozen plan drifted from current source, tasks, pricing, credentials, or configuration. Expected ${frozen.planDigest}; current ${current.planDigest}. Run --preflight again.`,
    );
  }
  authorizeLivePlan(current, {
    confirmPlan: args.confirmPlan,
    maxCostUsd: args.maxCostUsd,
    maxRequests: args.maxRequests,
  });
  assertCredentials(current);

  // This repeats the reviewed facts immediately before the first possible network call.
  // eslint-disable-next-line no-console
  console.error(formatPreflight(current));
  const writer = startBundle({
    outputDir: current.configuration.bundlePath,
    plan: current,
    mode: 'live',
  });

  let results;
  let bundle;
  try {
    results = await runBenchmark({
      models: current.configuration.models,
      tasks: current.configuration.tasks.join(','),
      runs: current.configuration.runs,
      judge: current.configuration.judge,
      dryRun: false,
      localEndpoint: current.configuration.localEndpoint,
      requestBudget: args.maxRequests,
      onResult: (record) => appendCaseRecord(writer.outputDir, record),
    });
    bundle = finishBundle({ outputDir: writer.outputDir });
  } catch (error) {
    try {
      finishBundle({ outputDir: writer.outputDir, terminalStatus: 'failed' });
    } catch {
      // A missing final integrity file is intentionally non-publishable after a hard interruption.
    }
    throw error;
  }

  const report = formatReport({
    results,
    output: args.output,
    meta: {
      date: new Date().toISOString().slice(0, 10),
      models: current.configuration.models,
      tasks: current.configuration.tasks,
      runs: current.configuration.runs,
      judge: current.configuration.judge,
      executionMode: 'live',
      planDigest: current.planDigest,
      bundleDigest: bundle.integrity.bundleDigest,
      lowConfidenceWarning: current.configuration.runs < 5
        ? `Low confidence: runs=${current.configuration.runs}. Use 5 or more for comparison.`
        : null,
    },
  });

  // eslint-disable-next-line no-console
  console.error(`Private evidence bundle: ${writer.outputDir} (${bundle.manifest.lifecycle.status})`);
  if (bundle.manifest.lifecycle.status !== 'complete') process.exitCode = 2;
  return report;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    // eslint-disable-next-line no-console
    console.log(USAGE);
    return;
  }
  const selectedMode = mode(args);
  validateModeArgs(args, selectedMode);

  let output;
  if (selectedMode === 'preflight') output = runPreflight(args);
  else if (selectedMode === 'live') output = await runLive(args);
  else output = await runDry(args);

  // eslint-disable-next-line no-console
  console.log(output);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(`Bench run failed: ${error.message}`);
  process.exit(1);
});
