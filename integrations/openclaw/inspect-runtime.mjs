#!/usr/bin/env node

import { once } from "node:events";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { PLUGIN_ID, TOOL_NAMES, createOpenClawConfig } from "./bridge.mjs";

const integrationRoot = path.dirname(fileURLToPath(import.meta.url));
const openclawBin = process.env.OPENCLAW_BIN || "/Users/moltbot/homebrew/bin/openclaw";
const root = await mkdtemp(path.join(tmpdir(), "clawbotomy-openclaw-inspect-"));
const home = path.join(root, "home");
const state = path.join(root, "state");
const workspace = path.join(root, "workspace");
await Promise.all([mkdir(home), mkdir(state), mkdir(workspace)]);
const configPath = path.join(state, "openclaw.json");
await writeFile(configPath, `${JSON.stringify(createOpenClawConfig({ model: "ollama/qwen3:1.7b", workspace }), null, 2)}\n`, { mode: 0o600 });

const child = spawn(openclawBin, ["plugins", "inspect", PLUGIN_ID, "--runtime", "--json"], {
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
let stdout = "";
let stderr = "";
child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");
child.stdout.on("data", (chunk) => { stdout += chunk; });
child.stderr.on("data", (chunk) => { stderr += chunk; });
const [code] = await once(child, "close");
try {
  if (code !== 0) throw new Error(`Runtime inspection failed: ${stderr.trim()}`);
  const inspection = JSON.parse(stdout);
  const serialized = JSON.stringify(inspection);
  const missing = TOOL_NAMES.filter((name) => !serialized.includes(`"${name}"`));
  if (missing.length > 0) throw new Error(`Runtime inspection omitted tools: ${missing.join(", ")}`);
  process.stdout.write(`${JSON.stringify({ pluginId: PLUGIN_ID, expectedEnabledTools: TOOL_NAMES, runtimeInspection: inspection }, null, 2)}\n`);
} finally {
  await rm(root, { recursive: true, force: true });
}
