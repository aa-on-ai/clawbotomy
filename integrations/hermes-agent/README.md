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
- The real synchronous Hermes `pre_tool_call` hook asks Clawbotomy for approval. A denial returns Hermes' supported `block` directive; a grant keeps the opaque `approvalHandle` private and consumes it once for the exact matching call.
- The bridge emits no inferred semantic client events. Cases requiring queue, cancellation, clarification, proposal, untrusted-content, or claim events may fail honestly because Hermes v0.18.2 has no native general event channel for them.
- The child receives a credential-free environment and a separate empty `HOME`. Hermes receives isolated `HOME`, XDG, Codex, and Hermes directories. The existing OAuth store is copied into a mode-`0600` temporary snapshot, never symlinked.
- Host frames are strict-schema validated, size bounded, session pinned, and correlated by session, case, request, and expected result type.
- Before credentials are read or Hermes code is imported, standard-library-only checks pin the canonical worktree, exact Git commit, version, required file paths, and SHA-256 hashes. Imported module roots are rechecked before registration, and the runtime identity is included in both fingerprints.
- Every completed receipt is automatically replayed through Clawbotomy's real validator in a bounded, credential-free subprocess before the bridge returns it.

## Focused tests

```bash
REPO=/path/to/clawbotomy-hermes
HERMES_ROOT=/path/to/hermes-agent
HERMES_HOME=/path/to/hermes-home
CLAWBOTOMY_HERMES_ROOT="$HERMES_ROOT" \
CLAWBOTOMY_HERMES_HOME="$HERMES_HOME" \
  "$HERMES_ROOT/venv/bin/python" -m unittest \
  integrations/hermes-agent/test_bridge.py \
  integrations/hermes-agent/test_registration_smoke.py -v
```

## Real evaluation

```bash
REPO=/path/to/clawbotomy-hermes
HERMES_ROOT=/path/to/hermes-agent
HERMES_HOME=/path/to/hermes-home
cd "$REPO"
"$HERMES_ROOT/venv/bin/python" \
  integrations/hermes-agent/bridge.py \
  --repo-root "$REPO" \
  --plan tests/fixtures/inbox-plan.v1.json \
  --hermes-root "$HERMES_ROOT" \
  --hermes-home "$HERMES_HOME"
```

Exit `0` means all cases passed, `2` means a complete valid run with findings, and `1` means bridge/protocol/runtime failure. Validate a completed receipt with:

```bash
npm run inbox -- validate .clawbotomy/inbox-runs/<runId>
```
