#!/usr/bin/env node

import { once } from "node:events";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { PLUGIN_ID, TOOL_NAMES, createOpenClawConfig } from "./bridge.mjs";
import { parseStrictJson } from "./protocol.mjs";
import { integrationPluginIdentity, validateRuntimeInspection } from "./provenance.mjs";

const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
const INSPECTION_TIMEOUT_MS = 30_000;
const EXIT_TIMEOUT_MS = 5_000;
const EFFECTIVE_INVENTORY_COMMAND = "clawbotomy-effective-tools";
const integrationRoot = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
let openclawBin = process.env.OPENCLAW_BIN || null;
for (let index = 0; index < args.length; index += 1) {
  if (args[index] !== "--openclaw-bin" || !args[index + 1]) throw new Error(`Unknown or incomplete argument: ${args[index]}`);
  openclawBin = args[index + 1];
  index += 1;
}
if (!openclawBin) throw new Error("--openclaw-bin or OPENCLAW_BIN is required");
const root = await mkdtemp(path.join(tmpdir(), "clawbotomy-openclaw-inspect-"));
const home = path.join(root, "home");
const state = path.join(root, "state");
const workspace = path.join(root, "workspace");
await Promise.all([
  mkdir(home, { mode: 0o700 }),
  mkdir(state, { mode: 0o700 }),
  mkdir(workspace, { mode: 0o700 }),
]);
const configPath = path.join(state, "openclaw.json");
await writeFile(
  configPath,
  `${JSON.stringify(createOpenClawConfig({ model: "ollama/qwen3:1.7b", workspace }), null, 2)}\n`,
  { mode: 0o600 },
);

let child = null;
try {
  child = spawn(openclawBin, ["plugins", "inspect", PLUGIN_ID, "--runtime", "--json"], {
    cwd: workspace,
    env: {
      PATH: process.env.PATH || "/usr/bin:/bin:/usr/sbin:/sbin",
      HOME: home,
      OPENCLAW_HOME: home,
      OPENCLAW_STATE_DIR: state,
      OPENCLAW_CONFIG_PATH: configPath,
      OPENCLAW_EXEC_SHELL_SNAPSHOT: "0",
      OLLAMA_API_KEY: "ollama-local",
    },
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const stdoutChunks = [];
  const stderrChunks = [];
  let stdoutBytes = 0;
  let stderrBytes = 0;
  let outputFailure = null;
  const collect = (target, label) => (chunk) => {
    if (outputFailure) return;
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    const current = label === "stdout" ? stdoutBytes : stderrBytes;
    if (current + bytes.length > MAX_OUTPUT_BYTES) {
      outputFailure = new Error(`Runtime inspection ${label} exceeded ${MAX_OUTPUT_BYTES} bytes`);
      child.kill("SIGTERM");
      return;
    }
    target.push(bytes);
    if (label === "stdout") stdoutBytes += bytes.length;
    else stderrBytes += bytes.length;
  };
  child.stdout.on("data", collect(stdoutChunks, "stdout"));
  child.stderr.on("data", collect(stderrChunks, "stderr"));
  let timer = null;
  const [code, signal] = await Promise.race([
    once(child, "close"),
    new Promise((resolve, reject) => {
      timer = setTimeout(() => {
        child.kill("SIGTERM");
        reject(new Error("Runtime inspection timed out"));
      }, INSPECTION_TIMEOUT_MS);
      timer.unref();
    }),
  ]).finally(() => clearTimeout(timer));
  if (outputFailure) throw outputFailure;
  const stderr = Buffer.concat(stderrChunks, stderrBytes).toString("utf8");
  if (code !== 0 || signal !== null) throw new Error(`Runtime inspection failed: ${stderr.trim().slice(0, 2_000)}`);
  const inspection = parseStrictJson(
    Buffer.concat(stdoutChunks, stdoutBytes).toString("utf8"),
    "OpenClaw runtime inspection",
    { maxValues: 250_000, maxDepth: 128 },
  );
  const identity = await validateRuntimeInspection(inspection, {
    integrationIdentity: await integrationPluginIdentity(integrationRoot),
    toolNames: TOOL_NAMES,
    cliCommand: EFFECTIVE_INVENTORY_COMMAND,
  });
  process.stdout.write(`${JSON.stringify({ pluginId: PLUGIN_ID, toolNames: TOOL_NAMES, identity }, null, 2)}\n`);
} finally {
  if (child && child.exitCode === null && child.signalCode === null) {
    child.kill("SIGTERM");
    let timer = null;
    await Promise.race([
      once(child, "close").catch(() => undefined),
      new Promise((resolve) => {
        timer = setTimeout(() => {
          if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
          resolve();
        }, EXIT_TIMEOUT_MS);
        timer.unref();
      }),
    ]).finally(() => clearTimeout(timer));
  }
  await rm(root, { recursive: true, force: true });
}
