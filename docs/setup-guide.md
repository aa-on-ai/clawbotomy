# Clawbotomy setup guide

Clawbotomy's benchmark runs from a trusted source checkout. There is no published global CLI and no hosted registration or assessment API.

The evidence workflow has five distinct boundaries:

1. Optional synthetic dry run
2. Zero-request frozen preflight
3. Digest-confirmed live run with explicit request and estimated-cost ceilings
4. Offline validation and inspection of the private bundle
5. Optional, explicit creation of a separate redacted public artifact

No stage grants tool access. No live run auto-publishes, and no export command deploys, commits, or pushes anything.

Configured-agent evaluation uses the separate practical local boundary in [ADR 0001](adr/0001-practical-local-trust-boundary.md). It trusts the operator and local runtime environment while treating the model, tool choices, protocol frames, and evidence claims as untrusted.

## Current public evidence state

[`public/evidence/index.json`](../public/evidence/index.json) is currently empty. No reproducible public run has been exported.

The values on `/bench` are a maintainer-reported March 2026 legacy summary. They predate the current evidence-bundle workflow and do not include raw case artifacts needed for independent reproduction. They remain visible for historical context, not as authorization for routing, tools, write access, or autonomous operation.

## Prerequisites

- Node.js 18 or newer
- Git
- A bring-your-own provider key for each hosted target or judge selected, or an OpenAI-compatible local model endpoint

Provider calls can incur charges on your accounts. The checked-in pricing snapshot is an estimate used to authorize a conservative bound; it is not a provider invoice or billing guarantee.

## 1. Install from source

```bash
git clone https://github.com/aa-on-ai/clawbotomy.git
cd clawbotomy
npm install
```

The runner requires exactly one execution mode per invocation: `--dry-run`, `--preflight`, or `--live`.

## Deterministic Inbox runner

The browser planner at `/preflight` downloads a `clawbotomy.inbox-preflight-plan/v1` file. Move that file into the trusted checkout and run it locally:

```bash
INBOX_PLAN=./clawbotomy-inbox-support-agent.json

npm run inbox -- run \
  --plan "$INBOX_PLAN" \
  --agent bounded
```

The runner validates the entire plan against the checked-in Inbox contract, expands each required scenario into one fresh-fixture case per covered capability, and prints the private output directory. A full five-capability plan produces 36 isolated cases.

The built-in `bounded/v1` profile is the positive control. The built-in `overreach/v1` profile is a negative control that deliberately produces observable failures. Neither profile represents the configuration reference recorded in the plan.

### Allowlisted declarative adapter

To exercise a declared policy rather than a reference control, create a closed-schema JSON document. Version 1 requires all 11 canonical scenario modes:

```json
{
  "schemaId": "clawbotomy.inbox-declarative-policy/v1",
  "schemaVersion": "1.0.0",
  "adapterId": "declarative-policy/v1",
  "scenarioModes": {
    "inbox.scope-boundary": "requested-only",
    "inbox.sensitive-disclosure": "minimum-necessary",
    "inbox.untrusted-message-content": "ignore-untrusted-authority",
    "inbox.ambiguous-recipient": "clarify",
    "inbox.suggest-versus-act": "propose-only",
    "inbox.explicit-confirmation": "confirm-before-action",
    "inbox.stop-cancel": "cancel-on-stop",
    "inbox.partial-failure": "failed-items-only",
    "inbox.claimed-completion": "evidence-matched",
    "inbox.bulk-boundary": "enforce-limit",
    "inbox.delete-recovery": "recoverable"
  }
}
```

Run the checked-in adapter explicitly:

```bash
INBOX_POLICY=./inbox-policy.json

npm run inbox -- run \
  --plan "$INBOX_PLAN" \
  --adapter declarative-policy/v1 \
  --adapter-config "$INBOX_POLICY"
```

`--adapter` and `--adapter-config` require each other and are mutually exclusive with `--agent`. `declarative-policy/v1` is the only adapter ID in this version. The config accepts only the documented schema and modes; it cannot select a module, executable, package, provider, URL, mailbox, environment variable, or hook.

The adapter interprets the declared modes through checked-in code and exercises only the same in-memory mock tools used by the controls. Its evidence applies to the canonical configuration document, not to a deployed agent. The runner does not load the plan's configuration reference or execute an agent prompt, runtime, provider SDK, authentication layer, or mailbox integration.

### Fixed stdio agent-host protocol

To observe an operator-owned agent host instead of a built-in control or declarative policy, integrate that host as the parent process and have it launch the checked-in protocol command:

```bash
node inbox/host-index.js \
  --plan "$INBOX_PLAN" \
  --protocol stdio-jsonl/v1
```

The parent writes strict UTF-8 JSONL frames to the child's stdin and reads protocol frames from stdout; stderr is reserved for bounded diagnostics. `stdio-jsonl/v1` is the only accepted protocol ID. The command has no option for an agent executable, module, package, command, client path, URL, endpoint, provider, credential, environment variable, socket, or mailbox connector, and Clawbotomy never launches the external client.

Implement the parent against the checked-in [frame schema](../public/evidence/schema/inbox-protocol-frame.v1.schema.json), [public case-envelope schema](../public/evidence/schema/inbox-public-case-envelope.v1.schema.json), and [protocol manifest schema](../public/evidence/schema/inbox-protocol-run-manifest.v1.schema.json). The parent owns its agent integration and maps that agent's decisions into fixed protocol frames; no parent or agent code path is passed to Clawbotomy.

The opening `hello` frame supplies a bounded client ID and version plus optional implementation and configuration SHA-256 values. These are self-asserted, unauthenticated labels—not attestation. No secret, prompt, module path, provider URL, or credential belongs in the handshake. The host returns opaque session and case identifiers, one public case envelope at a time, fixed mock-tool results, simulated approval responses, and runner-originated controls.

The terminal receipt uses a fixed repository-relative `.clawbotomy/inbox-runs/inbox-host-…` bundle locator. It never sends the external client an absolute host filesystem path.

The session is sequential: `hello` → `hello_ack` → `case_start`; the client then sends fixed `tool_call`, `approval_request`, enumerated `client_event`, and `case_complete` frames. The host owns `tool_result`, `approval_result`, stop `control`, and `case_closed` frames. After every case closes and the parent closes stdin, `run_complete` identifies the private bundle. Client and host sequence numbers, request IDs, session IDs, case tokens, approvals, and frame limits are checked exactly. The acknowledgement also publishes the fixed two-minute per-message, ten-minute per-case, one-hour total-session, and ten-second blocked-output deadlines.

Public case envelopes contain only the operator request, declared capability boundary, narrowly visible synthetic context, and available mock tools. They omit internal task fields such as negative actions, canaries, fault schedules, stop schedules, expected outcomes, all-bulk IDs, and evaluator assertions. No per-case score or assertion feedback is returned while the session is active.

On completion, the host writes a private protocol-session evidence bundle. Offline validation replays the recorded accepted client frames through a fresh mock Inbox and requires the runner-owned transcript, tool results, state transitions, evaluation, and digests to match exactly. It does not reconnect to or re-execute the client. The observation applies only to that exact protocol session and does not authenticate a deployed agent, authorize production access, or prove repeatability.

Malformed frames, sequence or case mismatches, limit exhaustion, unexpected EOF, and other pre-finalization protocol errors fail closed and produce no complete scored bundle. If all cases completed and the private bundle was already written but delivery of the final `run_complete` receipt fails, that valid bundle remains on disk; stderr distinguishes this receipt-delivery failure from an incomplete session.

The evidence distinguishes host activity from client activity: `clawbotomyHostNetworkRequests` and `realInboxConnectionsByClawbotomy` remain zero, while external-client network activity is `not-observed`. A model-backed external host may use its own provider network; Clawbotomy neither configures nor measures it.

### OpenClaw and Hermes bridges

Clawbotomy includes two operator-owned parents for the fixed protocol. Use the launcher to keep pass, findings, and infrastructure failure in one closed private receipt format:

```bash
npm run agent:evaluate -- \
  --adapter openclaw \
  --plan "$INBOX_PLAN" \
  --model ollama/qwen3:1.7b \
  --openclaw-bin "$OPENCLAW_BIN" \
  --expected-openclaw-runtime-sha256 "$OPENCLAW_RUNTIME_SHA256" \
  --expected-provider-runtime-sha256 "$OPENCLAW_PROVIDER_RUNTIME_SHA256"
```

```bash
npm run agent:evaluate -- \
  --adapter hermes \
  --plan "$INBOX_PLAN" \
  --hermes-root "$HERMES_ROOT" \
  --hermes-home "$HERMES_HOME"
```

The launcher has no arbitrary command, module, package, URL, endpoint, or provider option. OpenClaw runtime digests must come from an independent trusted source. The Hermes command derives the interpreter from the selected canonical checkout. Both bridges assert the exact eight-tool inventory and validate a completed bundle before returning a pass or findings receipt.

Attempt receipts are written mode `0600` under `.clawbotomy/evaluation-attempts/`. They contain only fixed adapter/client IDs, a validated non-secret model label, the plan digest, timestamps, process classification, any proven complete-bundle locator/digest, and closed diagnostic category codes. Raw adapter stderr is terminal-only and is never copied into the receipt.

Exit `0` is a complete run whose cases passed. Exit `2` is a complete run with findings. Exit `1` always remains an adapter/process anomaly. If the launcher independently finds exactly one new bundle that passes the checked-in validator and deterministic replay, the bundle keeps its measured pass/findings status while exit `1` remains visible; every other exit-`1` attempt is infrastructure-only and unscored.

Open `/evaluate` and select one launcher-issued `evaluation-attempt-*.json` together with its bound `manifest.json`, `summary.json`, and `cases.jsonl`. The browser requires that receipt-to-bundle binding before displaying a measured status, then derives only closed-contract case/tool/state/assertion/digest receipts in memory. Select one attempt receipt alone to inspect an infrastructure failure with no accepted bundle.

The run writes four private files under `.clawbotomy/inbox-runs/<deterministic-run-id>/`:

| File | Purpose |
|---|---|
| `manifest.json` | Canonical plan, selected execution subject, protocol or adapter metadata where applicable, fixture and implementation digests, and the non-authorizing evidence boundary |
| `cases.jsonl` | Fresh initial state, ordered subject and tool events, authoritative final state, state diff, assertions, and per-record digests; protocol cases also bind accepted frames and their directional transcript |
| `summary.json` | Case totals, capability findings, and the selected subject's limited observation |
| `integrity.json` | File hashes, byte counts, and the bundle digest |

Validate, replay, or summarize the path printed by `run`:

```bash
INBOX_BUNDLE=.clawbotomy/inbox-runs/inbox-...

npm run inbox -- validate "$INBOX_BUNDLE"
npm run inbox -- replay "$INBOX_BUNDLE"
npm run inbox -- summarize "$INBOX_BUNDLE"
```

`validate` and `replay` make no network requests. They verify file integrity and require an exact semantic match. Reference and adapter runs are reconstructed from their canonical subject; protocol runs replay the recorded accepted client frames through a fresh mock Inbox without reconnecting to or re-executing the client. The original adapter-config file is not read during replay. Exit code `0` means the cases passed, `2` means the bundle is valid but contains failed cases, and `1` means the input, execution, or bundle is invalid.

This is mock tool and state evidence with a deliberately narrow applicability boundary: a built-in control, one canonical adapter configuration, or one observed protocol session. Reference and adapter runs retain `productionAccessChanged: false`. Protocol evidence instead says `productionAccessChangedByClawbotomy: false` and `externalClientProductionAccessChanged: not-observed`, because Clawbotomy cannot see what the external client does outside the protocol. `configuredAgentInspected` remains `false` and `permissionDecision` remains `null`. No real mailbox, arbitrary module, deployment, commit, push, or public export is initiated by Clawbotomy.

## 2. Optional synthetic dry run

Confirm aliases, task selection, output formatting, and the local command path without model requests:

```bash
node bench/index.js \
  --models sonnet \
  --tasks instruction-following \
  --runs 1 \
  --dry-run
```

Dry-run responses and scores are synthetic. They are not measurement evidence, must not be exported, and must not inform routing or permissions.

## 3. Configure hosted-provider keys

Export only the keys required by the target and judge models in the reviewed plan:

```bash
export ANTHROPIC_API_KEY=your_key_here
export OPENAI_API_KEY=your_key_here
export GOOGLE_API_KEY=your_key_here
```

| Provider | Environment variable | Registered aliases |
|---|---|---|
| Anthropic | `ANTHROPIC_API_KEY` | `opus`, `sonnet` |
| OpenAI | `OPENAI_API_KEY` | `gpt-5.4`, `gpt-5.4-pro`, `gpt-5.3-codex` |
| Google | `GOOGLE_API_KEY` | `gemini-pro`, `gemini-flash` |

The runner reads these variables from its process environment. It does **not** automatically load the Next.js `.env.local` file. Each alias also requires model access on the corresponding provider account.

Credential presence is part of the frozen plan. Export required keys before preflight and keep their presence unchanged through live execution. Preflight records whether each required credential is present but never transmits or records its value.

## 4. Freeze and review a preflight plan

Choose a new lowercase run ID. The plan file and bundle directory are written exclusively and must not already exist. `.clawbotomy/` is gitignored and is the recommended private location.

If public export may be desired later, begin from a clean, committed checkout. That source state is frozen into the plan, and a run planned from a dirty or uncommitted source cannot later pass the public-export gate.

```bash
RUN_ID=sonnet-if-smoke-001
PLAN_PATH=.clawbotomy/plans/$RUN_ID.json
BUNDLE_DIR=.clawbotomy/runs/$RUN_ID

# Preflight makes zero provider requests.
node bench/index.js \
  --models sonnet \
  --tasks instruction-following \
  --runs 1 \
  --bundle-dir "$BUNDLE_DIR" \
  --write-plan "$PLAN_PATH" \
  --preflight

# Copy these values from the reviewed output. Do not guess or reuse them.
PLAN_DIGEST=copy_the_20_character_plan_digest
MAX_REQUESTS=copy_the_planned_provider_request_count
MAX_COST_USD=copy_the_conservative_cost_upper_bound

# Live mode accepts only the frozen plan plus explicit authorization values.
node bench/index.js \
  --plan "$PLAN_PATH" \
  --confirm-plan "$PLAN_DIGEST" \
  --max-requests "$MAX_REQUESTS" \
  --max-cost-usd "$MAX_COST_USD" \
  --live
```

Review the preflight before running the final command. It reports:

- Plan digest
- Exact case and provider-request counts
- Target and judge request groups
- Conservative input/output token bounds
- Estimated provider-cost range and pricing-snapshot digest
- Required credentials and whether they are currently present
- Frozen model IDs, task case hashes, judge, source state, implementation hashes, endpoint, and private bundle path

`--max-requests` must be at least the planned provider-request total, and `--max-cost-usd` must be at least the conservative upper estimate. Using the exact reviewed values is recommended. Unknown hosted pricing blocks live authorization.

The live command refuses model, task, run-count, judge, endpoint, bundle-path, or plan overrides. Immediately before the first possible network request it recomputes the plan from current source and configuration. Any drift changes the digest and requires a fresh preflight.

The frozen configuration includes a serialized-response byte ceiling. Oversized output fails before any model-judge request, and the conservative judge-input estimate uses the exact prompt and transcript envelope at that ceiling.

## 5. What the live run writes

A successful live run writes a private evidence bundle at the frozen bundle path:

| File | Purpose |
|---|---|
| `manifest.json` | Source state, frozen plan, lifecycle, evidence status, actual counts, and non-authorizing status |
| `cases.jsonl` | Per-case prompts, target responses, request traces, scores, justifications, failures, and judge traces |
| `summary.json` | Deterministic aggregates and eligibility reasons derived from the records |
| `integrity.json` | SHA-256 file hashes and the private bundle digest |

The formatted table/JSON/Markdown report is still printed to standard output, but the bundle is the integrity-checked evidence artifact. Failed or interrupted runs remain non-publishable.

Treat private bundles as sensitive. They can contain user-authored prompts, model output, judge input/output, provider identifiers, error details, and local paths.

## 6. Validate and inspect offline

Evidence commands are offline and make no provider requests:

```bash
npm run evidence -- validate "$BUNDLE_DIR"
npm run evidence -- summarize "$BUNDLE_DIR"
```

Validation re-reads the bundle, verifies its hashes and digest, validates the plan and case records, and reports the lifecycle and totals. Confirm:

- `valid` is `true`
- The run ID is the intended run
- `lifecycleStatus` is `complete`
- Scheduled, completed, scored, failed, target-request, and judge-request counts make sense
- The returned private `bundleDigest` matches the bundle you reviewed

Then inspect `cases.jsonl`, not only the aggregate summary. Look for failed cases, severe individual failures, prompt-injection attempts against the judge, unstable scores across repeated runs, and data that should never be public.

A valid digest shows that the recorded files have not changed. It does not validate the methodology, remove judge bias, or authorize a model or agent to use tools.

## 7. Optional public export

Public export is an explicit local file-generation step. It is never part of `--live`.

The exporter requires:

- A completed live measurement bundle
- No synthetic requests
- The exact private bundle digest
- A clean, committed source state frozen into the plan
- A new public run ID derived from the private digest

Run it only after private validation and human review:

```bash
PRIVATE_BUNDLE_DIGEST=copy_the_64_character_bundle_digest

npm run evidence -- export "$BUNDLE_DIR" \
  --confirm-public "$PRIVATE_BUNDLE_DIGEST"
```

The exporter:

1. Revalidates the complete private bundle.
2. Redacts recognized secret candidates and the local bundle path.
3. Records a redaction audit.
4. Recomputes the public plan, summary, file hashes, and a **different public bundle digest**.
5. Writes `public/evidence/run-…/` with public-readable file modes.
6. Adds the run to `public/evidence/index.json`.

If score-bearing case content is redacted, the public summary is marked accordingly and is not eligible for leaderboard-style conclusions. Regardless of redaction, every exported bundle remains `non-authorizing` and maintainer-self-reported unless an actual independent review occurs.

Export does not commit, push, deploy, or contact `clawbotomy.com`. Review the exported files and complete git diff before taking any separate repository or deployment action.

## Task categories and judge behavior

Available categories:

- `instruction-following`
- `tool-use`
- `code-generation`
- `summarization`
- `judgment`
- `multi-turn`
- `safety-trust`

Pass a comma-separated list during preflight or use `--tasks all`.

`instruction-following`, `tool-use`, and `summarization` use deterministic rubrics. `code-generation`, `judgment`, `multi-turn`, and `safety-trust` send the target response and relevant interaction context to the model selected by `--judge`. The default judge is `sonnet`.

Choose a judge alias different from the target when possible. This keeps the evaluation path explicit and avoids asking a model to judge its own response. Generated code and structured tool calls are never executed inside the benchmark process.

Use repeated runs for comparison. A single run is a smoke test; repetition does not eliminate model drift, judge bias, or prompt sensitivity.

## Run local models

Use an OpenAI-compatible loopback `/v1` endpoint. The default is `http://localhost:1234/v1`; pass `--local-endpoint` during preflight to freeze the destination explicitly.

For deterministic categories, use selectors such as:

```text
--models local:llama3
--tasks instruction-following,tool-use,summarization
--local-endpoint http://localhost:1234/v1
```

For all categories, select a distinct local judge served by the same endpoint:

```text
--models local:llama3
--judge local:qwen2.5
--tasks all
--local-endpoint http://localhost:1234/v1
```

Apply those selectors to the preflight command. The live command still takes only `--plan`, `--confirm-plan`, `--max-requests`, `--max-cost-usd`, and `--live` (plus an optional output format). Replace the example IDs with models your endpoint actually exposes.

Whether a local server retains requests or responses depends on its configuration. Local models receive a zero provider-price estimate, but the estimate excludes your infrastructure, electricity, and licensing costs.

## Privacy and data flow

1. Preflight reads local source, tasks, model metadata, pricing, environment-variable presence, and configuration. It makes no provider requests.
2. Live execution sends each benchmark prompt to the selected target provider or local endpoint.
3. Model-judged cases also send the target prompt, response, rubric, and interaction context to the selected judge provider or endpoint.
4. Provider keys authenticate only with their corresponding upstream APIs. The runner does not send keys or private bundles to `clawbotomy.com`.
5. Provider-side logging, retention, training, and billing policies still apply.
6. Private bundles stay under the local path selected during preflight unless the operator moves or shares them.
7. Explicit public export creates a separate redacted artifact locally; it does not make the artifact public by itself.

## Reading evidence responsibly

- Review individual records before aggregates.
- Treat failed and unknown-after-send cases as failures, not missing rows to discard.
- Look for severe minima that an average can hide.
- Compare repeated cases and judge rationales, not just model means.
- Preserve source, model identity, pricing snapshot, plan digest, bundle digest, and evidence status with any quoted score.
- Do not convert a score into a permission change without testing the exact deployed agent and enforcing independent platform controls.

## Research-preview limitations

- The Inbox runner exercises a bundled reference profile or an allowlisted declarative configuration against synthetic `.test` data. It does not load or inspect the plan's configuration reference.
- Declarative-adapter evidence describes only the embedded policy document. It does not execute or validate a deployed agent, and no config field can load a module, command, URL, provider, or mailbox integration.
- Protocol evidence describes one connected client's accepted frames and resulting synthetic behavior. Identity is self-asserted, replay does not re-execute the client, and the client's provider or network activity is not observed.
- Its tool calls and state transitions are authoritative for the in-memory fixture, not evidence about a real mailbox provider or production permission system.
- The benchmark runner calls foundation-model endpoints directly. It does not exercise your production agent, system prompt, memory, retrieval, authentication, or permission layer.
- Tool-use cases evaluate structured text representing tool calls; the runner does not execute tools or observe side effects.
- Generated code is not executed. Code-generation cases currently depend on the selected model judge.
- Deterministic rubrics are narrow proxies. LLM-judged scores can vary and reflect judge bias.
- Model-judged cases place untrusted target output inside the judge prompt, so prompt injection and reward gaming can distort a score.
- A complete evidence bundle can still encode a weak task design, an unsuitable judge, provider drift, or an unrepresentative sample.
- Results are not a security audit, compliance assessment, production certification, or guarantee of safe autonomy.
- No benchmark result authorizes tool access, data access, write access, deployment, or autonomous operation.

## Run the website for development

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

The website and source benchmark are separate entry points. Starting the website is not required to run the benchmark or evidence tools.
