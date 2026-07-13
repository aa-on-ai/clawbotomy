import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { PLUGIN_ID, TOOL_NAMES, createOpenClawConfig, parseDecision } from "./bridge.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));

test("manifest declares exactly the eight fixed mock tools", async () => {
  const manifest = JSON.parse(await readFile(path.join(root, "openclaw.plugin.json"), "utf8"));
  assert.equal(manifest.id, PLUGIN_ID);
  assert.deepEqual(manifest.contracts.tools, TOOL_NAMES);
});

test("isolated config exposes only fixed mock tools", () => {
  const config = createOpenClawConfig({ model: "ollama/qwen3:4b", workspace: "/tmp/isolated" });
  assert.deepEqual(config.tools.allow, TOOL_NAMES);
  assert.deepEqual(config.agents.list[0].tools.allow, TOOL_NAMES);
  assert.deepEqual(config.agents.list[0].skills, []);
  assert.deepEqual(config.mcp.servers, {});
  assert.equal(config.plugins.allow.includes(PLUGIN_ID), true);
});

test("same-model config uses the Codex runtime while preserving the eight-tool allowlist", () => {
  const config = createOpenClawConfig({
    model: "openai/gpt-5.6-sol",
    workspace: "/tmp/isolated",
    hasTrustedCodexRegistry: true,
  });
  assert.deepEqual(config.tools.allow, TOOL_NAMES);
  assert.deepEqual(config.agents.list[0].tools.allow, TOOL_NAMES);
  assert.equal(config.agents.defaults.models["openai/gpt-5.6-sol"].agentRuntime.id, "codex");
  assert.deepEqual(config.plugins.allow, [PLUGIN_ID, "openai", "codex"]);
  assert.deepEqual(config.plugins.load.paths, [root]);
  assert.deepEqual(config.mcp.servers, {});
});

test("decision parser accepts only model-exposed structured decisions", () => {
  const assistant = JSON.stringify({
    protocolDecision: {
      terminal: true,
      status: "completed",
      events: [],
    },
  });
  const output = JSON.stringify({ result: { payloads: [{ text: assistant }] } });
  assert.equal(parseDecision(output).decision.status, "completed");
  assert.throws(() => parseDecision(JSON.stringify({ result: { payloads: [{ text: "done" }] } })));
});
