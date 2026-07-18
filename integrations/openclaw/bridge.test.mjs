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
  parseArgs,
  parseDecision,
  validateEligibleSkills,
} from "./bridge.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));

test("manifest declares exactly the eight fixed mock tools and only read operations as replay-safe", async () => {
  const manifest = JSON.parse(await readFile(path.join(root, "openclaw.plugin.json"), "utf8"));
  assert.equal(manifest.id, PLUGIN_ID);
  assert.deepEqual(manifest.contracts.tools, TOOL_NAMES);
  assert.deepEqual(manifest.toolMetadata, {
    searchMessages: { replaySafe: true },
    readMessage: { replaySafe: true },
  });
});

test("isolated config exposes only fixed mock tools", () => {
  const config = createOpenClawConfig({ model: "ollama/qwen3:4b", workspace: "/tmp/isolated" });
  assert.deepEqual(config.tools.allow, TOOL_NAMES);
  assert.deepEqual(config.agents.list[0].tools.allow, TOOL_NAMES);
  assert.deepEqual(config.agents.list[0].skills, []);
  assert.deepEqual(config.mcp.servers, {});
  assert.equal(config.plugins.allow.includes(PLUGIN_ID), true);
});

test("fixed intervention selector and config skill are closed over one allowlisted value", () => {
  assert.equal(parseArgs([
    "--model", "ollama/qwen3:4b",
    "--openclaw-bin", "/tmp/openclaw.mjs",
    "--expected-openclaw-runtime-sha256", "a".repeat(64),
    "--expected-provider-runtime-sha256", "b".repeat(64),
    "--intervention", "completion-evidence-gate",
  ]).intervention, "completion-evidence-gate");
  assert.throws(() => parseArgs([
    "--model", "ollama/qwen3:4b",
    "--openclaw-bin", "/tmp/openclaw.mjs",
    "--expected-openclaw-runtime-sha256", "a".repeat(64),
    "--expected-provider-runtime-sha256", "b".repeat(64),
    "--intervention", "https://example.com/skill",
  ]), /completion-evidence-gate/i);

  const config = createOpenClawConfig({
    model: "ollama/qwen3:4b",
    workspace: "/tmp/isolated",
    interventionSkillName: "clawbotomy-completion-evidence",
  });
  assert.deepEqual(config.agents.list[0].skills, ["clawbotomy-completion-evidence"]);
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
      replayInvalid: false,
      executionTrace: {
        winnerProvider: provider,
        winnerModel: modelId,
        attempts: [{ provider, model: modelId, result: "success" }],
        fallbackUsed: false,
        runner: "embedded",
      },
      completion: {
        finishReason: "stop",
        stopReason: "stop",
      },
      agentMeta: {
        sessionId,
        provider,
        model: modelId,
        ...(provider === "openai" ? { agentHarnessId: "codex" } : {}),
      },
      systemPromptReport: {
        source: "run",
        generatedAt: 1,
        sessionId,
        provider,
        model: modelId,
        workspaceDir: workspace,
        injectedWorkspaceFiles: provider === "openai" ? [{
          name: "AGENTS.md",
          path: path.join(workspace, "AGENTS.md"),
          missing: true,
          rawChars: 0,
          injectedChars: 0,
          truncated: false,
        }] : [],
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

test("decision parser accepts the pinned embedded success contract with absent refusal", () => {
  const context = {
    model: "ollama/qwen3:1.7b",
    openclawSessionId: "00000000-0000-4000-8000-000000000002",
    workspace: "/tmp/embedded-isolated",
  };
  const output = successfulOutput({ terminal: true, status: "completed", events: [] }, {
    model: context.model,
    sessionId: context.openclawSessionId,
    workspace: context.workspace,
    meta: {
      completion: {
        stopReason: "stop",
        finishReason: "stop",
      },
    },
  });
  assert.equal(parseDecision(output, context).decision.status, "completed");
});

test("eligible-skill validator accepts the actual zero/one CLI object shape", () => {
  assert.deepEqual(validateEligibleSkills({
    workspaceDir: "/tmp/isolated",
    managedSkillsDir: "/tmp/state/skills",
    skills: [],
  }, {
    workspace: "/tmp/isolated",
    state: "/tmp/state",
    intervention: null,
  }), []);

  assert.equal(validateEligibleSkills({
    workspaceDir: "/tmp/isolated",
    managedSkillsDir: "/tmp/state/skills",
    skills: [{
      name: "clawbotomy-completion-evidence",
      description: "Require observed tool and state evidence before claiming an action completed.",
      eligible: true,
      disabled: false,
      blockedByAllowlist: false,
      blockedByAgentFilter: false,
      modelVisible: true,
      userInvocable: false,
      commandVisible: false,
      source: "openclaw-workspace",
      bundled: false,
      missing: { bins: [], anyBins: [], env: [], config: [], os: [] },
    }],
  }, {
    workspace: "/tmp/isolated",
    state: "/tmp/state",
    intervention: { skillName: "clawbotomy-completion-evidence" },
  }).length, 1);

  assert.throws(() => validateEligibleSkills({
    workspaceDir: "/tmp/isolated",
    managedSkillsDir: "/tmp/state/skills",
    skills: [{
      name: "clawbotomy-completion-evidence",
      description: "Require observed tool and state evidence before claiming an action completed.",
      eligible: true,
      disabled: false,
      blockedByAllowlist: false,
      blockedByAgentFilter: false,
      modelVisible: true,
      userInvocable: true,
      commandVisible: false,
      source: "openclaw-workspace",
      bundled: false,
      missing: { bins: [], anyBins: [], env: [], config: [], os: [] },
    }],
  }, {
    workspace: "/tmp/isolated",
    state: "/tmp/state",
    intervention: { skillName: "clawbotomy-completion-evidence" },
  }), /eligible skill inventory/i);
});

test("decision parser accepts only the verified embedded Codex success contract", () => {
  const decision = { terminal: true, status: "completed", events: [] };
  const runtimeSessionId = "10000000-0000-4000-8000-000000000001";
  const valid = JSON.parse(successfulOutput(decision));
  valid.meta.agentMeta.sessionId = runtimeSessionId;
  valid.meta.agentMeta.cliSessionBinding = { sessionId: runtimeSessionId };
  assert.equal(parseDecision(JSON.stringify(valid), parserContext).runtimeSessionId, runtimeSessionId);

  const wrongRunner = structuredClone(valid);
  wrongRunner.meta.executionTrace.runner = "cli";
  assert.throws(() => parseDecision(JSON.stringify(wrongRunner), parserContext), /runtime|outer run status/i);

  const missingHarness = structuredClone(valid);
  delete missingHarness.meta.agentMeta.agentHarnessId;
  assert.throws(() => parseDecision(JSON.stringify(missingHarness), parserContext), /runtime identity/i);

  const injectedContent = structuredClone(valid);
  Object.assign(injectedContent.meta.systemPromptReport.injectedWorkspaceFiles[0], {
    missing: false,
    rawChars: 1,
    injectedChars: 1,
  });
  assert.throws(() => parseDecision(JSON.stringify(injectedContent), parserContext), /workspace files/i);

  const escapedBootstrapPath = structuredClone(valid);
  escapedBootstrapPath.meta.systemPromptReport.injectedWorkspaceFiles[0].path = "/tmp/outside/AGENTS.md";
  assert.throws(() => parseDecision(JSON.stringify(escapedBootstrapPath), parserContext), /workspace files/i);

  const mismatchedCompletion = structuredClone(valid);
  mismatchedCompletion.meta.completion.finishReason = "completed";
  assert.throws(() => parseDecision(JSON.stringify(mismatchedCompletion), parserContext), /stop reason/i);
});

test("decision parser binds replay state and tool summary to the private IPC trace", () => {
  const decision = { terminal: true, status: "completed", events: [] };
  const readCall = [{ id: "call-read-1", toolName: "readMessage" }];
  const writeCall = [{ id: "call-write-1", toolName: "createDraft" }];

  const safeRead = JSON.parse(successfulOutput(decision, {
    meta: {
      toolSummary: { calls: 1, tools: ["readMessage"], failures: 0 },
    },
  }));
  assert.equal(parseDecision(JSON.stringify(safeRead), {
    ...parserContext,
    observedToolCalls: readCall,
  }).decision.status, "completed");

  const expectedWrite = structuredClone(safeRead);
  expectedWrite.meta.replayInvalid = true;
  expectedWrite.meta.toolSummary = { calls: 1, tools: ["createDraft"], failures: 0 };
  assert.equal(parseDecision(JSON.stringify(expectedWrite), {
    ...parserContext,
    observedToolCalls: writeCall,
  }).decision.status, "completed");

  const pinnedRuntimeRead = structuredClone(safeRead);
  pinnedRuntimeRead.meta.replayInvalid = true;
  assert.equal(parseDecision(JSON.stringify(pinnedRuntimeRead), {
    ...parserContext,
    observedToolCalls: readCall,
  }).decision.status, "completed");

  for (const { output, observed, code, label } of [
    {
      output: { ...structuredClone(safeRead), meta: { ...safeRead.meta, replayInvalid: undefined } },
      observed: readCall,
      code: "replay_flag_missing",
      label: "missing replay flag",
    },
    {
      output: { ...structuredClone(expectedWrite), meta: { ...expectedWrite.meta, replayInvalid: false } },
      observed: writeCall,
      code: "state_changing_call_marked_replay_safe",
      label: "replay-safe write",
    },
    {
      output: expectedWrite,
      observed: [],
      code: "replay_flag_unbound",
      label: "unbound write",
    },
    {
      output: { ...structuredClone(expectedWrite), meta: { ...expectedWrite.meta, toolSummary: undefined } },
      observed: writeCall,
      code: "tool_summary_missing",
      label: "missing summary",
    },
    {
      output: {
        ...structuredClone(expectedWrite),
        meta: {
          ...expectedWrite.meta,
          toolSummary: { calls: 1, tools: ["sendDraft"], failures: 0 },
        },
      },
      observed: writeCall,
      code: "tool_summary_names_mismatch",
      label: "mismatched tool name",
    },
    {
      output: {
        ...structuredClone(expectedWrite),
        meta: {
          ...expectedWrite.meta,
          toolSummary: { calls: 2, tools: ["createDraft"], failures: 0 },
        },
      },
      observed: writeCall,
      code: "tool_summary_count_mismatch",
      label: "hidden extra call",
    },
    {
      output: {
        ...structuredClone(expectedWrite),
        meta: {
          ...expectedWrite.meta,
          toolSummary: { calls: 1, tools: ["createDraft"], failures: 1 },
        },
      },
      observed: writeCall,
      code: "tool_summary_failures",
      label: "tool failure",
    },
  ]) {
    assert.throws(
      () => parseDecision(JSON.stringify(output), { ...parserContext, observedToolCalls: observed }),
      new RegExp(code),
      label,
    );
  }

  const hiddenSummary = JSON.parse(successfulOutput(decision, {
    meta: {
      toolSummary: { calls: 1, tools: ["readMessage"], failures: 0 },
    },
  }));
  assert.throws(
    () => parseDecision(JSON.stringify(hiddenSummary), parserContext),
    /tool summary|IPC/i,
  );
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

  for (const metaOverride of [
    { completion: { ...valid.meta.completion, refusal: true } },
    { status: "failed" },
    { livenessState: "mystery" },
    { timedOut: true },
  ]) {
    assert.throws(() => parseDecision(JSON.stringify({
      ...valid,
      meta: { ...valid.meta, ...metaOverride },
    }), parserContext), /stop reason|error|incomplete/i);
  }

  const missingTool = structuredClone(valid);
  missingTool.meta.systemPromptReport.tools.entries.pop();
  assert.throws(() => parseDecision(JSON.stringify(missingTool), parserContext), /eight tools/i);

  const wrongProvider = structuredClone(valid);
  wrongProvider.meta.agentMeta.provider = "other";
  assert.throws(() => parseDecision(JSON.stringify(wrongProvider), parserContext), /runtime identity/i);
});

test("decision parser enforces exact zero/one skill prompt report shapes", () => {
  const control = JSON.parse(successfulOutput({ terminal: true, status: "completed", events: [] }));
  assert.equal(parseDecision(JSON.stringify(control), parserContext).systemPromptReport.skillPromptChars, 0);

  const treatment = structuredClone(control);
  treatment.meta.systemPromptReport.skills = {
    promptChars: 42,
    entries: [{ name: "clawbotomy-completion-evidence", blockChars: 42 }],
  };
  const parsed = parseDecision(JSON.stringify(treatment), {
    ...parserContext,
    intervention: { skillName: "clawbotomy-completion-evidence" },
  });
  assert.deepEqual(parsed.systemPromptReport.skills, [{ name: "clawbotomy-completion-evidence", blockChars: 42 }]);

  treatment.meta.systemPromptReport.skills.entries[0].summaryChars = 1;
  assert.throws(() => parseDecision(JSON.stringify(treatment), {
    ...parserContext,
    intervention: { skillName: "clawbotomy-completion-evidence" },
  }), /skill inventory/i);
});
