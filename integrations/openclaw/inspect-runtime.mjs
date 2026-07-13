#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  getOpenClawVersion,
  inspectEffectiveInventory,
  inspectRuntime,
  writeCaseState,
} from "./bridge.mjs";
import {
  integrationPluginIdentity,
  loadRuntimeProvenance,
} from "./provenance.mjs";

const integrationRoot = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const options = {
    model: process.env.OPENCLAW_INSPECT_MODEL || "ollama/qwen3:1.7b",
    openclawBin: process.env.OPENCLAW_BIN || null,
    pluginRegistrySourceStateDir: process.env.OPENCLAW_PLUGIN_REGISTRY_SOURCE_STATE_DIR || null,
    expectedOpenClawRuntimeSha256: process.env.OPENCLAW_RUNTIME_SHA256 || null,
    expectedProviderRuntimeSha256: process.env.OPENCLAW_PROVIDER_RUNTIME_SHA256 || null,
    expectedCodexRuntimeSha256: process.env.OPENCLAW_CODEX_RUNTIME_SHA256 || null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--model") options.model = argv[++index];
    else if (value === "--openclaw-bin") options.openclawBin = argv[++index];
    else if (value === "--plugin-registry-source-state-dir") options.pluginRegistrySourceStateDir = argv[++index];
    else if (value === "--expected-openclaw-runtime-sha256") options.expectedOpenClawRuntimeSha256 = argv[++index];
    else if (value === "--expected-provider-runtime-sha256") options.expectedProviderRuntimeSha256 = argv[++index];
    else if (value === "--expected-codex-runtime-sha256") options.expectedCodexRuntimeSha256 = argv[++index];
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (!options.openclawBin) throw new Error("--openclaw-bin or OPENCLAW_BIN is required");
  if (!options.expectedOpenClawRuntimeSha256 || !options.expectedProviderRuntimeSha256) {
    throw new Error("Trusted OpenClaw and provider runtime SHA-256 pins are required");
  }
  if (options.model.startsWith("openai/") && !options.expectedCodexRuntimeSha256) {
    throw new Error("openai/* inspection requires a trusted Codex runtime SHA-256 pin");
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const runtimeProvenance = await loadRuntimeProvenance(options);
  const openclawBin = runtimeProvenance.identity.openclaw.path;
  const openclawVersion = await getOpenClawVersion(openclawBin, runtimeProvenance.identity.openclaw.version);
  const integrationIdentity = await integrationPluginIdentity(integrationRoot);
  const pluginRegistrations = await inspectRuntime({
    model: options.model,
    openclawBin,
    runtimeProvenance,
    integrationIdentity,
  });

  const root = await realpath(await mkdtemp(path.join(tmpdir(), "clawbotomy-openclaw-inspect-effective-")));
  try {
    const caseState = await writeCaseState(root, {
      model: options.model,
      runtimeProvenance,
    });
    const sessionEffectiveInventory = await inspectEffectiveInventory({
      caseState,
      model: options.model,
      openclawBin,
      sessionKey: `agent:clawbotomy-eval:inspection-${randomUUID()}`,
    });
    process.stdout.write(`${JSON.stringify({
      openclawVersion,
      runtime: runtimeProvenance.identity,
      pluginOwnedRegistrations: pluginRegistrations,
      sessionEffectiveModelToolInventory: sessionEffectiveInventory,
    }, null, 2)}\n`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`OpenClaw runtime inspection failure: ${error?.stack || error?.message || error}\n`);
  process.exitCode = 1;
});
