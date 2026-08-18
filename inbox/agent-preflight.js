#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const { readPlan } = require('./plan');

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const FLAG_NAMES = Object.freeze({
  '--plan': 'planPath',
  '--model': 'model',
  '--openclaw-bin': 'openclawBin',
  '--auth-source-agent-dir': 'authSourceAgentDir',
  '--plugin-registry-source-state-dir': 'pluginRegistrySourceStateDir',
  '--expected-openclaw-runtime-sha256': 'expectedOpenClawRuntimeSha256',
  '--expected-provider-runtime-sha256': 'expectedProviderRuntimeSha256',
  '--expected-codex-runtime-sha256': 'expectedCodexRuntimeSha256',
});

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const name = FLAG_NAMES[flag];
    if (!name) throw new Error(`Unknown preflight option: ${String(flag)}`);
    if (Object.hasOwn(options, name)) throw new Error(`Duplicate preflight option: ${flag}`);
    const value = argv[index + 1];
    if (typeof value !== 'string' || value.length === 0 || value.startsWith('--')) {
      throw new Error(`${flag} requires a value.`);
    }
    options[name] = value;
  }
  for (const name of ['planPath', 'model', 'openclawBin']) {
    if (!options[name]) throw new Error(`--${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} is required.`);
  }
  if (!/^(?:ollama|openai)\/[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(options.model)) {
    throw new Error('--model must be a non-secret ollama/<model> or openai/<model> label.');
  }
  for (const name of ['expectedOpenClawRuntimeSha256', 'expectedProviderRuntimeSha256']) {
    if (!SHA256_PATTERN.test(options[name] || '')) {
      throw new Error(`--${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} must be a lowercase SHA-256 digest.`);
    }
  }
  if (options.model.startsWith('openai/')) {
    for (const name of ['authSourceAgentDir', 'pluginRegistrySourceStateDir']) {
      if (!options[name]) throw new Error(`--${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} is required for openai/*.`);
    }
    if (!SHA256_PATTERN.test(options.expectedCodexRuntimeSha256 || '')) {
      throw new Error('--expected-codex-runtime-sha256 must be a lowercase SHA-256 digest for openai/*.');
    }
  }
  return options;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'"'"'`)}'`;
}

function canonicalExecutable(inputPath) {
  const canonical = fs.realpathSync(path.resolve(inputPath));
  const stats = fs.statSync(canonical);
  if (!stats.isFile()) throw new Error(`OpenClaw launcher is not a regular file: ${canonical}`);
  fs.accessSync(canonical, fs.constants.R_OK | fs.constants.X_OK);
  return canonical;
}

function stagePlan(planPath, repoRoot) {
  const source = readPlan(planPath);
  const plansRoot = path.join(repoRoot, '.clawbotomy', 'plans');
  fs.mkdirSync(plansRoot, { recursive: true, mode: 0o700 });
  fs.chmodSync(plansRoot, 0o700);
  const target = path.join(plansRoot, `${source.planDigest}.json`);
  let created = false;
  if (!fs.existsSync(target)) {
    fs.copyFileSync(source.absolute, target, fs.constants.COPYFILE_EXCL);
    fs.chmodSync(target, 0o600);
    created = true;
  }
  try {
    const staged = readPlan(target);
    if (staged.planDigest !== source.planDigest) throw new Error('Staged Inbox plan digest changed.');
    return staged;
  } catch (error) {
    if (created) fs.rmSync(target, { force: true });
    throw error;
  }
}

function buildEvaluationCommand(options) {
  const parts = [
    'npm run agent:evaluate --',
    '--adapter openclaw',
    `--plan ${shellQuote(options.planPath)}`,
    `--model ${shellQuote(options.model)}`,
    `--openclaw-bin ${shellQuote(options.openclawBin)}`,
    `--expected-openclaw-runtime-sha256 ${shellQuote(options.expectedOpenClawRuntimeSha256)}`,
    `--expected-provider-runtime-sha256 ${shellQuote(options.expectedProviderRuntimeSha256)}`,
  ];
  if (options.model.startsWith('openai/')) {
    parts.push(
      `--auth-source-agent-dir ${shellQuote(options.authSourceAgentDir)}`,
      `--plugin-registry-source-state-dir ${shellQuote(options.pluginRegistrySourceStateDir)}`,
      `--expected-codex-runtime-sha256 ${shellQuote(options.expectedCodexRuntimeSha256)}`,
    );
  }
  return parts.join(' \\\n  ');
}

async function prepareOpenClawEvaluation(options, dependencies = {}) {
  const repoRoot = fs.realpathSync(path.resolve(options.repoRoot || path.join(__dirname, '..')));
  const stagedPlan = stagePlan(options.planPath, repoRoot);
  const openclawBin = canonicalExecutable(options.openclawBin);
  const provenance = await import('../integrations/openclaw/provenance.mjs');
  const inspectAuth = dependencies.inspectAuth || provenance.inspectInferenceAuthStore;
  const verifyRuntime = dependencies.verifyRuntime || provenance.loadRuntimeProvenance;
  const runtimeOptions = {
    openclawBin,
    model: options.model,
    pluginRegistrySourceStateDir: options.pluginRegistrySourceStateDir,
    expectedOpenClawRuntimeSha256: options.expectedOpenClawRuntimeSha256,
    expectedProviderRuntimeSha256: options.expectedProviderRuntimeSha256,
    expectedCodexRuntimeSha256: options.expectedCodexRuntimeSha256,
  };
  await verifyRuntime(runtimeOptions);
  const auth = options.model.startsWith('openai/')
    ? inspectAuth(options.authSourceAgentDir, options.model)
    : null;
  const commandOptions = {
    ...options,
    planPath: stagedPlan.absolute,
    openclawBin,
  };
  return {
    schemaId: 'clawbotomy.agent-preflight/v1',
    ready: true,
    planPath: stagedPlan.absolute,
    planSha256: stagedPlan.planDigest,
    openclawBin,
    model: options.model,
    auth,
    command: buildEvaluationCommand(commandOptions),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const receipt = await prepareOpenClawEvaluation(options);
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`Clawbotomy agent preflight failed: ${error instanceof Error ? error.message : 'unknown error'}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  buildEvaluationCommand,
  canonicalExecutable,
  parseArgs,
  prepareOpenClawEvaluation,
  stagePlan,
};
