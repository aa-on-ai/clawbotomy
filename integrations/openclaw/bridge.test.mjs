import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  OPENCLAW_HARD_TIMEOUT_MS,
  OPENCLAW_TIMEOUT_SECONDS,
  PLUGIN_ID,
  TOOL_NAMES,
  createOpenClawConfig,
  parseDecision,
} from "./bridge.mjs";

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
  assert.equal(config.agents.defaults.timeoutSeconds, OPENCLAW_TIMEOUT_SECONDS);
  assert.equal(OPENCLAW_HARD_TIMEOUT_MS < 120_000, true);
});

function successfulOutput(decision, overrides = {}) {
  const model = overrides.model || "openai/gpt-5.6-sol";
  const [provider, modelId] = model.split("/");
  const sessionId = overrides.sessionId || "00000000-0000-4000-8000-000000000001";
  const workspace = overrides.workspace || "/tmp/isolated";
  return JSON.stringify({
    payloads: [{ text: JSON.stringify({ protocolDecision: decision }), mediaUrl: null }],
    meta: {
      durationMs: 10,
      executionTrace: {
        winnerProvider: provider,
        winnerModel: modelId,
        attempts: [{ provider, model: modelId, result: "success" }],
        fallbackUsed: false,
        runner: provider === "openai" ? "cli" : "embedded",
      },
      completion: {
        finishReason: "stop",
        stopReason: provider === "openai" ? "completed" : "stop",
        refusal: false,
      },
      agentMeta: { sessionId, provider, model: modelId },
      systemPromptReport: {
        source: "run",
        generatedAt: 1,
        sessionId,
        provider,
        model: modelId,
        workspaceDir: workspace,
        injectedWorkspaceFiles: [],
        skills: { promptChars: 0, entries: [] },
        tools: {
          listChars: 1,
          schemaChars: 1,
          entries: TOOL_NAMES.map((name) => ({ name, summaryChars: 1, schemaChars: 1 })),
        },
      },
      ...overrides.meta,
    },
  });
}

const parserContext = {
  model: "openai/gpt-5.6-sol",
  openclawSessionId: "00000000-0000-4000-8000-000000000001",
  workspace: "/tmp/isolated",
};

test("decision parser accepts only the documented successful final payload", () => {
  const assistant = JSON.stringify({
    terminal: true,
    status: "completed",
    events: [],
  });
  const output = successfulOutput(JSON.parse(assistant));
  assert.equal(parseDecision(output, parserContext).decision.status, "completed");
  assert.throws(() => parseDecision(JSON.stringify({
    payloads: [{ text: "done" }],
    meta: JSON.parse(output).meta,
  }), parserContext), /decision/i);
});

test("decision parser rejects recursive, ambiguous, failed, mismatched, and incomplete candidates", () => {
  const decision = { terminal: true, status: "completed", events: [] };
  const valid = JSON.parse(successfulOutput(decision));

  assert.throws(() => parseDecision(JSON.stringify({
    payloads: [],
    meta: { ...valid.meta, nested: { text: JSON.stringify({ protocolDecision: decision }) } },
  }), parserContext), /exactly one/i);

  assert.throws(() => parseDecision(JSON.stringify({
    ...valid,
    payloads: [valid.payloads[0], valid.payloads[0]],
  }), parserContext), /exactly one/i);

  assert.throws(() => parseDecision(JSON.stringify({
    ...valid,
    meta: {
      ...valid.meta,
      executionTrace: {
        ...valid.meta.executionTrace,
        attempts: [{ provider: "openai", model: "gpt-5.6-sol", result: "error" }],
      },
    },
  }), parserContext), /outer run status/i);

  assert.throws(() => parseDecision(JSON.stringify({
    ...valid,
    meta: { ...valid.meta, aborted: true },
  }), parserContext), /abort/i);

  assert.throws(() => parseDecision(JSON.stringify({
    ...valid,
    meta: { ...valid.meta, completion: { ...valid.meta.completion, stopReason: "length" } },
  }), parserContext), /stop reason/i);

  const missingTool = structuredClone(valid);
  missingTool.meta.systemPromptReport.tools.entries.pop();
  assert.throws(() => parseDecision(JSON.stringify(missingTool), parserContext), /eight tools/i);

  const wrongProvider = structuredClone(valid);
  wrongProvider.meta.agentMeta.provider = "other";
  assert.throws(() => parseDecision(JSON.stringify(wrongProvider), parserContext), /runtime identity/i);
});
