# OpenClaw bridge

This integration runs a genuinely isolated OpenClaw model/tool loop as the external parent of Clawbotomy's fixed `stdio-jsonl/v1` child protocol.

It does not modify the production OpenClaw state directory. Every case gets a new temporary `OPENCLAW_HOME`, `OPENCLAW_STATE_DIR`, config file, workspace, agent session, and OpenClaw process. The child environment is allowlisted. Local inference uses an Ollama loopback and the non-secret `ollama-local` marker. A same-model OpenAI run copies exactly one selected-provider auth profile plus a minimized, verified OpenAI/Codex plugin registry into mode-0600 databases. Temporary credentials are always deleted, including with `--keep-temp`.

The native TypeScript plugin declares exactly these tools in `openclaw.plugin.json`: `searchMessages`, `readMessage`, `createDraft`, `sendDraft`, `archiveMessages`, `trashMessages`, `permanentlyDeleteMessages`, and `restoreMessages`. The bridge verifies that exact inventory and its implementation provenance before inference, then verifies the model-facing inventory again on every turn. The plugin exchanges one bounded JSONL request and response at a time with the parent bridge over a private per-turn Unix socket. Requests carry the real OpenClaw tool-call ID and a random one-turn capability bound to the case, runtime session, and tool.

The bridge strictly validates every Clawbotomy host frame before use, pins the host session and monotonic sequence, and races every OpenClaw turn against host failure or exit. Its 105-second hard turn deadline stays below Clawbotomy's fixed 120-second message deadline; the five-turn maximum totals 525 seconds, below the fixed 600-second case deadline. Clawbotomy receives no OpenClaw path, module, command, URL, provider, credential, socket, or adapter.

Inspect the plugin runtime:

```bash
node integrations/openclaw/inspect-runtime.mjs
```

Run the focused integration tests:

```bash
node --experimental-strip-types --test integrations/openclaw/*.test.mjs
node --test tests/inbox-protocol-{adversarial,bundle,host,runner,security}.test.js
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
