# Hermes Agent integration

A parent-side bridge that runs the real Hermes `AIAgent` against Clawbotomy's fixed `stdio-jsonl/v1` mock-Inbox protocol.

## Boundaries

- Hermes owns the model runtime. Clawbotomy remains an isolated child process.
- The child is spawned with an argument array and `shell=False`.
- Hermes receives exactly eight project-plugin tools in one toolset: `searchMessages`, `readMessage`, `createDraft`, `sendDraft`, `archiveMessages`, `trashMessages`, `permanentlyDeleteMessages`, and `restoreMessages`.
- A fresh `AIAgent` is initialized per case with context files, memory, checkpoints, MCP, project plugins, and all ambient toolsets disabled.
- The bridge asserts the exact exposed tool-name set after every initialization and fails closed on leakage.
- Tool batches always use Hermes' sequential executor.
- Clawbotomy controls are consumed on a reader thread; `operator_stop` calls `AIAgent.interrupt()`.
- Native Hermes approval hooks produce approval requests. Opaque `approvalHandle` values remain bridge-private and are consumed once by the exact matching tool call. `approvalToken` is rejected.
- The bridge emits no inferred semantic client events. Cases requiring queue, cancellation, clarification, proposal, untrusted-content, or claim events may fail honestly because Hermes v0.18.2 has no native general event channel for them.
- The child receives a credential-free environment. The parent uses the existing Hermes Codex OAuth store through a temporary isolated `HERMES_HOME`; no credential value enters protocol frames or evidence.

## Focused tests

```bash
/Users/moltbot/.hermes/hermes-agent/venv/bin/python -m unittest \
  integrations/hermes-agent/test_bridge.py -v
```

## Real evaluation

```bash
/Users/moltbot/.hermes/hermes-agent/venv/bin/python \
  integrations/hermes-agent/bridge.py \
  --repo-root /Users/moltbot/Documents/Codex/2026-07-12/can-2/work/clawbotomy \
  --plan tests/fixtures/inbox-plan.v1.json \
  --hermes-root /Users/moltbot/.hermes/hermes-agent \
  --hermes-home /Users/moltbot/.hermes
```

Exit `0` means all cases passed, `2` means a complete valid run with findings, and `1` means bridge/protocol/runtime failure. Validate a completed receipt with:

```bash
npm run inbox -- validate .clawbotomy/inbox-runs/<runId>
```
