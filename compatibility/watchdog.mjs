#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createConnection } from "node:net";
import { chmod, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { canonicalStringify, sha256 } = require("../bench/canonical");
const { runBundleSelfTest, runSingleCaseProbe } = require("./protocol-probe");
const { PROTOCOL_ID, PROTOCOL_VERSION, TOOL_NAMES } = require("../inbox/protocols/stdio-jsonl");

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = path.dirname(path.dirname(SCRIPT_PATH));
const DEFAULT_POLICY = path.join(REPO_ROOT, "compatibility", "current-pins.json");
const DEFAULT_OUTPUT_ROOT = path.join(REPO_ROOT, ".clawbotomy", "compatibility-runs");
const NETWORK_SANDBOX_MARKER = "CLAWBOTOMY_COMPATIBILITY_NETWORK_DENY_ACTIVE";
const SANDBOX_PROFILE = "(version 1) (allow default) (deny network*)";
const DIGEST = /^[a-f0-9]{64}$/;

function parseArgs(argv) {
  const options = {
    policy: DEFAULT_POLICY,
    outputRoot: DEFAULT_OUTPUT_ROOT,
    openclawBin: null,
    pluginRegistryStateDir: null,
    hermesRoot: null,
    hermesPython: null,
  };
  const flags = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const mapping = {
      "--policy": "policy",
      "--output-root": "outputRoot",
      "--openclaw-bin": "openclawBin",
      "--plugin-registry-state-dir": "pluginRegistryStateDir",
      "--hermes-root": "hermesRoot",
      "--hermes-python": "hermesPython",
    };
    const field = mapping[flag];
    if (!field) throw new Error(`Unknown compatibility watchdog option: ${flag}`);
    if (flags.has(flag)) throw new Error(`Compatibility watchdog option may appear only once: ${flag}`);
    flags.add(flag);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
    options[field] = value;
    index += 1;
  }
  for (const field of ["openclawBin", "pluginRegistryStateDir", "hermesRoot", "hermesPython"]) {
    if (!options[field]) throw new Error(`Compatibility watchdog requires ${field}`);
  }
  return options;
}

function scrubbedEnvironment(extra = {}) {
  const environment = {};
  for (const key of ["PATH", "LANG", "LC_ALL", "TZ"]) {
    if (process.env[key]) environment[key] = process.env[key];
  }
  return {
    ...environment,
    [NETWORK_SANDBOX_MARKER]: "1",
    ...extra,
  };
}

function sanitizeDiagnostic(value) {
  return String(value ?? "")
    .replaceAll(process.env.HOME || "/Users/unknown", "[local-home]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+/gi, "Bearer [redacted]")
    .replace(/\b(?:sk|gho|ghp|xox[baprs])-[-A-Za-z0-9_]{8,}\b/g, "[redacted]")
    .replace(/\b(api[_-]?key|token|secret|password|authorization|cookie)\b\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1000);
}

function runJson(command, args, { cwd = REPO_ROOT, env = scrubbedEnvironment(), timeout = 120_000 } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
    timeout,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const diagnostic = sanitizeDiagnostic(result.stderr || result.stdout || `exit ${result.status}`);
    throw new Error(diagnostic || `Compatibility child exited ${result.status}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`Compatibility child returned invalid JSON: ${sanitizeDiagnostic(error.message)}`);
  }
}

function runText(command, args, { cwd = REPO_ROOT, timeout = 30_000 } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: scrubbedEnvironment(),
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    timeout,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(sanitizeDiagnostic(result.stderr || result.stdout));
  return result.stdout.trim();
}

function exactObjectKeys(document, keys, label) {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new Error(`${label} must be an object`);
  }
  const actual = Object.keys(document).sort();
  const expected = [...keys].sort();
  if (canonicalStringify(actual) !== canonicalStringify(expected)) {
    throw new Error(`${label} has unsupported fields`);
  }
}

function validatePolicy(policy) {
  exactObjectKeys(policy, ["schemaId", "schemaVersion", "policyVersion", "sourceIdentity", "protocol", "runtimes"], "Support policy");
  if (policy.schemaId !== "clawbotomy.compatibility-support-policy/v1" || policy.schemaVersion !== "1.0.0") {
    throw new Error("Unsupported compatibility support policy schema");
  }
  if (policy.sourceIdentity?.kind !== "clean-git-commit-containing-policy" || policy.sourceIdentity?.requireCleanWorktree !== true) {
    throw new Error("Compatibility support policy requires a clean Git source identity");
  }
  const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);
  if (String(nodeMajor) !== policy.sourceIdentity.nodeVersion) {
    throw new Error(`Compatibility watchdog requires Node.js ${policy.sourceIdentity.nodeVersion}`);
  }
  if (
    policy.protocol?.id !== PROTOCOL_ID
    || policy.protocol?.version !== PROTOCOL_VERSION
    || canonicalStringify(policy.protocol?.toolNames) !== canonicalStringify(TOOL_NAMES)
  ) {
    throw new Error("Compatibility support policy does not match the checked-in protocol contract");
  }
  for (const runtime of Object.values(policy.runtimes || {})) {
    if (runtime?.supportState !== "supported") throw new Error("The current-pin inventory may contain only supported pins");
  }
  return policy;
}

async function assertNetworkDenied() {
  const code = await new Promise((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port: 9 });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve("timeout");
    }, 1500);
    socket.once("connect", () => {
      clearTimeout(timer);
      socket.destroy();
      resolve("connected");
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      resolve(error.code || "error");
    });
  });
  if (!["EPERM", "EACCES"].includes(code)) {
    throw new Error(`Network deny boundary was not enforced (negative control: ${code})`);
  }
  return { kind: "darwin-sandbox-exec-deny-network", denialControl: code };
}

function assertDigest(actual, expected, label) {
  if (!DIGEST.test(actual || "") || actual !== expected) throw new Error(`${label} digest drifted`);
}

function checkOpenClaw(document, policy) {
  const runtime = document?.runtime?.openclaw;
  const plugins = document?.runtime?.plugins;
  if (!runtime || !Array.isArray(plugins)) throw new Error("OpenClaw inspection omitted runtime provenance");
  if (document.openclawVersion !== policy.version || runtime.version !== policy.version) {
    throw new Error("OpenClaw runtime version drifted");
  }
  assertDigest(runtime.sha256, policy.binarySha256, "OpenClaw binary");
  assertDigest(runtime.runtimeSha256, policy.runtimeSha256, "OpenClaw runtime");
  assertDigest(runtime.packageJsonSha256, policy.packageJsonSha256, "OpenClaw package manifest");
  const expectedPlugins = [policy.provider, policy.harness];
  if (plugins.length !== expectedPlugins.length) throw new Error("OpenClaw selected plugin inventory drifted");
  for (const expected of expectedPlugins) {
    const actual = plugins.find((entry) => entry.pluginId === expected.pluginId);
    if (
      !actual
      || actual.packageName !== expected.packageName
      || actual.packageVersion !== expected.version
      || actual.origin !== expected.origin
    ) {
      throw new Error(`OpenClaw ${expected.pluginId} package identity drifted`);
    }
    assertDigest(actual.runtimeSha256, expected.runtimeSha256, `OpenClaw ${expected.pluginId} runtime`);
  }
  const registered = document.pluginOwnedRegistrations;
  const effective = document.sessionEffectiveModelToolInventory;
  if (
    registered?.pluginId !== "clawbotomy-openclaw-tools"
    || canonicalStringify(registered.toolNames) !== canonicalStringify(policy.toolNames)
    || canonicalStringify([...effective?.toolNames || []].sort()) !== canonicalStringify([...policy.toolNames].sort())
  ) {
    throw new Error("OpenClaw exact eight-tool registration drifted");
  }
  return {
    version: runtime.version,
    binarySha256: runtime.sha256,
    runtimeSha256: runtime.runtimeSha256,
    packageJsonSha256: runtime.packageJsonSha256,
    providerRuntimeSha256: plugins.find((entry) => entry.pluginId === policy.provider.pluginId).runtimeSha256,
    harnessRuntimeSha256: plugins.find((entry) => entry.pluginId === policy.harness.pluginId).runtimeSha256,
    registrationInspectionSha256: registered.inspectionSha256,
    effectiveInventorySha256: effective.inventorySha256,
    toolNames: [...policy.toolNames],
    providerExecutionInvoked: false,
    providerRequests: 0,
  };
}

function checkHermes(document, policy) {
  if (
    document?.schemaId !== "clawbotomy.hermes-current-pin-probe/v1"
    || document.clientId !== policy.clientId
    || document.runtime?.version !== policy.version
    || document.pythonVersion !== policy.pythonVersion
    || document.pythonImplementation !== "cpython"
    || document.runtime?.gitCommit !== policy.gitCommit
    || document.runtime?.sourceTreeSha256 !== policy.sourceTreeSha256
  ) {
    throw new Error("Hermes source/runtime identity drifted");
  }
  if (canonicalStringify(document.toolNames) !== canonicalStringify([...TOOL_NAMES].sort())) {
    throw new Error("Hermes exact eight-tool registration drifted");
  }
  if (
    !DIGEST.test(document.implementationSha256)
    || !DIGEST.test(document.configurationSha256)
    || document.providerExecutionInvoked !== false
    || document.providerRequests !== 0
    || document.networkConnectAttempts !== 0
  ) {
    throw new Error("Hermes provider-free probe contract failed");
  }
  return {
    version: document.runtime.version,
    pythonVersion: document.pythonVersion,
    pythonImplementation: document.pythonImplementation,
    gitCommit: document.runtime.gitCommit,
    sourceTreeSha256: document.runtime.sourceTreeSha256,
    bridgeVersion: document.bridgeVersion,
    implementationSha256: document.implementationSha256,
    configurationSha256: document.configurationSha256,
    toolNames: [...document.toolNames],
    providerExecutionInvoked: false,
    providerRequests: 0,
  };
}

function openClawProtocolIdentity(verified, clientId) {
  return {
    id: clientId,
    version: verified.version,
    implementationSha256: sha256({
      schemaId: "clawbotomy.openclaw-current-pin-probe-implementation/v1",
      registrationInspectionSha256: verified.registrationInspectionSha256,
      runtimeSha256: verified.runtimeSha256,
    }),
    configurationSha256: sha256({
      schemaId: "clawbotomy.openclaw-current-pin-probe-configuration/v1",
      providerRuntimeSha256: verified.providerRuntimeSha256,
      harnessRuntimeSha256: verified.harnessRuntimeSha256,
      effectiveInventorySha256: verified.effectiveInventorySha256,
      toolNames: verified.toolNames,
    }),
  };
}

function hermesProtocolIdentity(verified, clientId) {
  return {
    id: clientId,
    version: verified.version,
    implementationSha256: verified.implementationSha256,
    configurationSha256: verified.configurationSha256,
  };
}

function sourceIdentity() {
  const commit = runText("git", ["rev-parse", "HEAD"]);
  if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error("Clawbotomy Git commit is invalid");
  const status = runText("git", ["status", "--porcelain=v1", "--untracked-files=normal"]);
  if (status !== "") throw new Error("Clawbotomy worktree is dirty; current-pin support cannot be verified");
  return {
    gitCommit: commit,
    clean: true,
    nodeVersion: process.versions.node,
    platform: process.platform,
    architecture: process.arch,
  };
}

async function writeReceipt(outputRoot, document) {
  const coreDigest = sha256({ ...document, createdAt: undefined });
  const stamp = document.createdAt.replace(/[-:.]/g, "").replace("Z", "z").toLowerCase();
  const runId = `compat-${stamp}-${coreDigest.slice(0, 12)}`;
  const root = await realpath(path.resolve(outputRoot)).catch(async () => {
    await mkdir(path.resolve(outputRoot), { recursive: true, mode: 0o700 });
    return realpath(path.resolve(outputRoot));
  });
  const runDir = path.join(root, runId);
  await mkdir(runDir, { mode: 0o700 });
  await chmod(runDir, 0o700);
  const receiptPath = path.join(runDir, "receipt.json");
  const receipt = { ...document, runId, coreDigest };
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  await chmod(receiptPath, 0o600);
  return { receipt, receiptPath };
}

async function run(options) {
  const policyPath = await realpath(path.resolve(options.policy));
  const policy = validatePolicy(JSON.parse(await readFile(policyPath, "utf8")));
  const source = sourceIdentity();
  const networkBoundary = await assertNetworkDenied();
  const openclawPolicy = policy.runtimes.openclaw;
  const hermesPolicy = policy.runtimes.hermes;
  async function captureRuntime(name, callback) {
    try {
      return await callback();
    } catch (error) {
      return {
        supportState: "drifted",
        diagnosticCode: `${name}_current_pin_check_failed`,
        diagnostic: sanitizeDiagnostic(error?.message || error),
      };
    }
  }

  const openclawResult = await captureRuntime("openclaw", async () => {
    const openclawDocument = runJson(process.execPath, [
      path.join(REPO_ROOT, "integrations", "openclaw", "inspect-runtime.mjs"),
      "--model", openclawPolicy.selectionModel,
      "--openclaw-bin", await realpath(path.resolve(options.openclawBin)),
      "--plugin-registry-source-state-dir", await realpath(path.resolve(options.pluginRegistryStateDir)),
      "--expected-openclaw-runtime-sha256", openclawPolicy.runtimeSha256,
      "--expected-provider-runtime-sha256", openclawPolicy.provider.runtimeSha256,
      "--expected-codex-runtime-sha256", openclawPolicy.harness.runtimeSha256,
    ]);
    const openclaw = checkOpenClaw(openclawDocument, {
      ...openclawPolicy,
      toolNames: policy.protocol.toolNames,
    });
    const identity = openClawProtocolIdentity(openclaw, openclawPolicy.clientId);
    return {
      supportState: "supported",
      provenance: openclaw,
      protocol: runSingleCaseProbe({ repoRoot: REPO_ROOT, identity }),
      bundleSelfTest: await runBundleSelfTest({ repoRoot: REPO_ROOT, identity }),
    };
  });

  const hermesResult = await captureRuntime("hermes", async () => {
    const hermesDocument = runJson(await realpath(path.resolve(options.hermesPython)), [
      path.join(REPO_ROOT, "compatibility", "hermes-current-pin-probe.py"),
      "--hermes-root", await realpath(path.resolve(options.hermesRoot)),
      "--expected-version", hermesPolicy.version,
      "--expected-python-version", hermesPolicy.pythonVersion,
      "--expected-commit", hermesPolicy.gitCommit,
      "--expected-tree-sha256", hermesPolicy.sourceTreeSha256,
    ], { env: scrubbedEnvironment({ PYTHONNOUSERSITE: "1" }) });
    const hermes = checkHermes(hermesDocument, hermesPolicy);
    const identity = hermesProtocolIdentity(hermes, hermesPolicy.clientId);
    return {
      supportState: "supported",
      provenance: hermes,
      protocol: runSingleCaseProbe({ repoRoot: REPO_ROOT, identity }),
      bundleSelfTest: await runBundleSelfTest({ repoRoot: REPO_ROOT, identity }),
    };
  });

  const runtimeResults = { openclaw: openclawResult, hermes: hermesResult };
  const supportState = Object.values(runtimeResults).every((result) => result.supportState === "supported")
    ? "supported"
    : "drifted";
  const document = {
    schemaId: "clawbotomy.compatibility-watchdog-receipt/v1",
    schemaVersion: "1.0.0",
    createdAt: new Date().toISOString(),
    supportState,
    source,
    policy: {
      schemaId: policy.schemaId,
      policyVersion: policy.policyVersion,
      sha256: sha256(policy),
    },
    networkBoundary: {
      ...networkBoundary,
      enforcedForEntireProcessTree: true,
      providerRequests: 0,
    },
    runtimes: runtimeResults,
    nonClaims: [
      "No model or configured-agent session was executed.",
      "This is not behavior, reliability, security, safety, certification, production-readiness, or future-version evidence.",
      "Protocol client identity remains self-asserted.",
    ],
  };
  return writeReceipt(options.outputRoot, document);
}

function reexecInNetworkSandbox(argv) {
  const result = spawnSync("/usr/bin/sandbox-exec", [
    "-p", SANDBOX_PROFILE,
    process.execPath,
    SCRIPT_PATH,
    ...argv,
  ], {
    stdio: "inherit",
    env: { ...process.env, [NETWORK_SANDBOX_MARKER]: "1" },
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

async function main() {
  if (process.platform !== "darwin") {
    throw new Error("The v0.1 current-pin watchdog requires the approved macOS deny-network runner");
  }
  if (process.env[NETWORK_SANDBOX_MARKER] !== "1") {
    return reexecInNetworkSandbox(process.argv.slice(2));
  }
  const options = parseArgs(process.argv.slice(2));
  const { receipt, receiptPath } = await run(options);
  process.stdout.write(`${JSON.stringify({
    supportState: receipt.supportState,
    runId: receipt.runId,
    receiptPath,
    sourceGitCommit: receipt.source.gitCommit,
    policySha256: receipt.policy.sha256,
    providerRequests: receipt.networkBoundary.providerRequests,
    runtimes: Object.fromEntries(Object.entries(receipt.runtimes).map(([name, value]) => [name, {
      supportState: value.supportState,
      version: value.provenance?.version || null,
      completedSyntheticCases: value.protocol?.completedCaseCount || 0,
      bundleIntegrityValidated: value.bundleSelfTest?.integrityValidated || false,
      deterministicReplayMatched: value.bundleSelfTest?.deterministicReplayMatched || false,
      diagnosticCode: value.diagnosticCode || null,
    }])),
  }, null, 2)}\n`);
  return receipt.supportState === "supported" ? 0 : 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((code) => {
    process.exitCode = code;
  }).catch((error) => {
    process.stderr.write(`Compatibility watchdog failed: ${sanitizeDiagnostic(error?.message || error)}\n`);
    process.exitCode = 1;
  });
}

export {
  checkHermes,
  checkOpenClaw,
  parseArgs,
  run,
  validatePolicy,
};
