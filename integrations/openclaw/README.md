# OpenClaw bridge

This integration runs a genuinely isolated OpenClaw model/tool loop as the external parent of Clawbotomy's fixed `stdio-jsonl/v1` child protocol.

It does not modify the production OpenClaw state directory. Every case gets a new temporary `OPENCLAW_HOME`, `OPENCLAW_STATE_DIR`, config file, workspace, agent session, and OpenClaw process. The child environment is allowlisted. Local inference uses an Ollama loopback and the non-secret `ollama-local` marker. A same-model OpenAI run snapshots only the model-auth rows into the temporary per-case state, uses them through OpenClaw's Codex runtime, never passes them to Clawbotomy or evidence, and deletes them with the case state.

The native TypeScript plugin declares exactly these tools in `openclaw.plugin.json`: `searchMessages`, `readMessage`, `createDraft`, `sendDraft`, `archiveMessages`, `trashMessages`, `permanentlyDeleteMessages`, and `restoreMessages`. The plugin exchanges one JSONL tool request and response at a time with the parent bridge over a per-turn Unix socket inside the temporary case directory. The socket is private to OpenClaw and its parent bridge; it is never passed to or loaded by Clawbotomy. The plugin never imports Clawbotomy.

The bridge launches Clawbotomy with `spawn(process.execPath, ["inbox/host-index.js", "--plan", planPath, "--protocol", "stdio-jsonl/v1"], { shell: false })`. Clawbotomy receives no OpenClaw path, module, command, URL, provider, credential, socket, or adapter.

Inspect the plugin runtime:

```bash
node integrations/openclaw/inspect-runtime.mjs
```

Run the focused integration tests:

```bash
node --experimental-strip-types --test integrations/openclaw/*.test.mjs
node --test tests/inbox-protocol-host.test.js
```

Run a genuine local-model evaluation:

```bash
node integrations/openclaw/bridge.mjs \
  --plan tests/fixtures/inbox-plan.v1.json \
  --model ollama/qwen3:1.7b
```

Run the same model as the production Codex agent:

```bash
node integrations/openclaw/bridge.mjs \
  --plan tests/fixtures/inbox-plan.v1.json \
  --model openai/gpt-5.6-sol \
  --auth-source-agent-dir /Users/moltbot/.openclaw/agents/codex/agent \
  --plugin-registry-source-state-dir /Users/moltbot/.openclaw/state
```

Exit `0` means the valid evidence bundle passed, exit `2` means the valid bundle contains findings, and exit `1` means protocol or infrastructure failure. Validate the reported bundle separately:

```bash
npm run inbox -- validate .clawbotomy/inbox-runs/<runId>
```
