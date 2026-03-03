#!/usr/bin/env node

const { getModel, normalizeLocalEndpoint } = require('./models');
const { runBenchmark, TASKS } = require('./runner');
const { formatReport } = require('./reporter');

function parseArgs(argv) {
  const args = {
    models: 'opus,sonnet,gpt4o',
    tasks: 'all',
    runs: 1,
    judge: 'sonnet',
    output: 'table',
    dryRun: false,
    localEndpoint: process.env.LOCAL_LLM_ENDPOINT,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;

    const key = token.replace(/^--/, '');
    if (key === 'dry-run') {
      args.dryRun = true;
      continue;
    }

    const value = argv[i + 1];
    if (value && !value.startsWith('--')) {
      args[key.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
      i += 1;
    }
  }

  args.runs = Number(args.runs || 1);
  args.localEndpoint = normalizeLocalEndpoint(args.localEndpoint);
  return args;
}

function validateArgs(args) {
  const models = args.models.split(',').map((m) => m.trim()).filter(Boolean);
  const tasks = args.tasks === 'all' ? Object.keys(TASKS) : args.tasks.split(',').map((t) => t.trim()).filter(Boolean);

  for (const model of models) {
    getModel(model, { localEndpoint: args.localEndpoint });
  }
  getModel(args.judge, { localEndpoint: args.localEndpoint });

  for (const task of tasks) {
    if (!TASKS[task]) throw new Error(`Unknown task category: ${task}`);
  }

  const outputs = ['table', 'json', 'markdown'];
  if (!outputs.includes(args.output)) throw new Error(`Invalid output format: ${args.output}`);

  return { models, tasks };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { models, tasks } = validateArgs(args);

  const results = await runBenchmark({
    models,
    tasks: args.tasks,
    runs: args.runs,
    judge: args.judge,
    dryRun: args.dryRun,
    localEndpoint: args.localEndpoint,
  });

  const report = formatReport({
    results,
    output: args.output,
    meta: {
      date: new Date().toISOString().slice(0, 10),
      models,
      tasks,
      runs: args.runs,
      judge: args.judge,
      localEndpoint: args.localEndpoint,
      lowConfidenceWarning:
        args.runs < 5
          ? `Low confidence: runs=${args.runs}. Use --runs 5 or more for stable routing decisions.`
          : null,
    },
  });

  // eslint-disable-next-line no-console
  console.log(report);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(`Bench run failed: ${err.message}`);
  process.exit(1);
});
