# OpenClaw bridge

This integration runs a genuinely isolated OpenClaw model/tool loop as the external parent of Clawbotomy's fixed `stdio-jsonl/v1` child protocol.

It does not modify the production OpenClaw state directory. Every case gets one canonical temporary root containing `HOME`, `TMPDIR`/`TMP`/`TEMP`, XDG directories, `OPENCLAW_STATE_DIR`, the workspace, an agent session, and an OpenClaw process. The child environment is allowlisted. Local inference uses an Ollama loopback and the non-secret `ollama-local` marker. A same-model OpenAI run builds state without authentication, verifies the session-effective inventory, and only then attaches exactly one selected-provider auth profile. The credential-free inventory inspector gets one bounded retry only when its child exceeds the 30-second deadline; the second attempt must pass the same provenance and exact-eight-tool checks. Provider, authentication, malformed-inventory, and model failures are never retried. The minimized, verified OpenAI/Codex plugin registry and auth database use mode 0600. The complete OpenAI evaluation root is always deleted, including with `--keep-temp` and after failures.

The native TypeScript plugin declares exactly these tools in `openclaw.plugin.json`: `searchMessages`, `readMessage`, `createDraft`, `sendDraft`, `archiveMessages`, `trashMessages`, `permanentlyDeleteMessages`, and `restoreMessages`. Only `searchMessages` and `readMessage` are declared replay-safe; every state-changing mock tool remains side-effecting. The bridge verifies that exact inventory and its implementation provenance before inference, then verifies the model-facing inventory again on every turn. For the pinned Codex runtime, it accepts only the verified embedded-runner success contract, the `codex` harness identity, one exact provider/model success attempt without fallback, and matching successful terminal reasons. It binds OpenClaw's replay flag and exact successful tool summary to the private IPC calls observed in that turn. No-call turns must remain replay-safe and summary-free; state-changing calls must be replay-invalid; read-only calls may carry either replay flag because OpenClaw `2026.7.1-beta.5` drops manifest `toolMetadata` from its persisted plugin-registry record, but they still require an exact successful IPC/tool-summary match. Hidden, missing, failed, or mismatched calls are rejected with closed reason codes. OpenClaw may report standard bootstrap-file rows, but every row must remain missing, zero-byte, non-truncated, and lexically inside the isolated workspace. The plugin exchanges one bounded JSONL request and response at a time with the parent bridge over a private per-turn Unix socket. Requests carry the real OpenClaw tool-call ID and a random one-turn capability bound to the case, runtime session, and tool.

The bridge strictly validates every Clawbotomy host frame before use, pins the host session and monotonic sequence, and races every OpenClaw turn against host failure or exit. Its 105-second hard turn deadline stays below Clawbotomy's fixed 120-second message deadline; the five-turn maximum totals 525 seconds, below the fixed 600-second case deadline. Before it writes a bridge receipt, it runs Clawbotomy's deterministic `validateBundle` replay and binds the run ID, core digest, plan, cases, counts, and terminal status. Clawbotomy receives no OpenClaw path, module, command, URL, provider, credential, socket, or adapter.

`OPENCLAW_RUNTIME_SHA256`, `OPENCLAW_PROVIDER_RUNTIME_SHA256`, and, for OpenAI, `OPENCLAW_CODEX_RUNTIME_SHA256` must be trusted release or operator pins obtained independently of the runtime being evaluated. The bridge uses the prefix-free `clawbotomy.runtime-manifest/v2` format to stream-hash each complete canonical runtime root. It rejects every mismatch before executing OpenClaw, derives the expected CLI version from `package.json` inside the verified root, invokes the exact `openclaw.mjs` through `process.execPath`, and requires the reported version to match.

Inspect the plugin runtime:

```bash
node integrations/openclaw/inspect-runtime.mjs \
  --model ollama/qwen3:1.7b \
  --openclaw-bin "$OPENCLAW_BIN" \
  --expected-openclaw-runtime-sha256 "$OPENCLAW_RUNTIME_SHA256" \
  --expected-provider-runtime-sha256 "$OPENCLAW_PROVIDER_RUNTIME_SHA256"
```

Standalone inspection authenticates the same runtime pins before execution and reports plugin-owned registrations separately from the session-effective model tool inventory. OpenAI inspection additionally requires the plugin-registry source and Codex runtime pin used by the bridge command below.

Run the focused integration tests:

```bash
node --experimental-strip-types --test integrations/openclaw/*.test.mjs
node --test tests/inbox-protocol-{adversarial,bundle,host,runner,security}.test.js
```

Run a genuine local-model evaluation:

```bash
node integrations/openclaw/bridge.mjs \
  --plan tests/fixtures/inbox-plan.v1.json \
  --model ollama/qwen3:1.7b \
  --openclaw-bin "$OPENCLAW_BIN" \
  --expected-openclaw-runtime-sha256 "$OPENCLAW_RUNTIME_SHA256" \
  --expected-provider-runtime-sha256 "$OPENCLAW_PROVIDER_RUNTIME_SHA256"
```

Run the same model as the production Codex agent:

```bash
node integrations/openclaw/bridge.mjs \
  --plan tests/fixtures/inbox-plan.v1.json \
  --model openai/gpt-5.6-sol \
  --openclaw-bin "$OPENCLAW_BIN" \
  --auth-source-agent-dir "$OPENCLAW_AUTH_SOURCE_AGENT_DIR" \
  --plugin-registry-source-state-dir "$OPENCLAW_PLUGIN_REGISTRY_SOURCE_STATE_DIR" \
  --expected-openclaw-runtime-sha256 "$OPENCLAW_RUNTIME_SHA256" \
  --expected-provider-runtime-sha256 "$OPENCLAW_PROVIDER_RUNTIME_SHA256" \
  --expected-codex-runtime-sha256 "$OPENCLAW_CODEX_RUNTIME_SHA256"
```

Exit `0` means the valid evidence bundle passed, exit `2` means the valid bundle contains findings, and exit `1` means protocol or infrastructure failure. Validate the reported bundle separately:

```bash
npm run inbox -- validate .clawbotomy/inbox-runs/<runId>
```
