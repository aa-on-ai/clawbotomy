# Clawbotomy

Plan requested agent powers, evaluate an exact OpenClaw or Hermes runtime in a synthetic Inbox, and review bounded evidence locally.

**Site:** [clawbotomy.com](https://www.clawbotomy.com)

## What exists today

- **Inbox preflight planner:** `/preflight` creates a browser-local, versioned plan from operator-declared Inbox capabilities and intended boundaries. The planner itself runs no agent and makes no permission decision.
- **Evaluate workspace:** `/evaluate` provides exact OpenClaw and Hermes launch paths, explains process status, requires a launcher-issued receipt bound to every displayed bundle, derives a closed-contract view entirely in the browser, and compares runs without uploading evidence.
- **Fixed runtime bridges:** `integrations/openclaw/` and `integrations/hermes-agent/` run the selected runtime as the parent of Clawbotomy’s fixed synthetic-Inbox protocol. Both expose exactly eight project-owned mock tools and fail closed on runtime or protocol drift.
- **Private attempt receipts:** `npm run agent:evaluate` launches only one of those two checked-in bridges and writes a closed, mode-`0600` attempt receipt under `.clawbotomy/evaluation-attempts/`; arbitrary stderr remains terminal-only and only fixed diagnostic category codes persist.
- **Deterministic Inbox runner:** `npm run inbox` consumes that plan, runs every required case against either a bundled reference control or the checked-in `declarative-policy/v1` adapter, and writes replayable tool, result, state-diff, assertion, and integrity evidence against a fresh synthetic mailbox. It never connects to a real Inbox or resolves the plan's configuration reference.
- **Fixed Inbox agent-host protocol:** an operator-owned agent host can launch the checked-in `stdio-jsonl/v1` child process and drive the same synthetic tools through strict JSONL without giving Clawbotomy a module, command, URL, provider, credential, or mailbox connector.
- **Evidence runner:** a local Node.js benchmark with a frozen preflight plan, digest-confirmed live execution, explicit request and estimated-cost ceilings, private evidence bundles, offline validation, and a separate public-export command.
- **Public evidence registry:** [`public/evidence/index.json`](public/evidence/index.json) contains three complete, maintainer-self-reported, non-authorizing exports with frozen plans, case records, summaries, and integrity metadata.
- **Public evidence review:** `/bench` exposes human-readable run pages and one comparison bounded to an exactly compatible protocol.

Clawbotomy is a research preview. It is not a hosted assessment API, an npm CLI, a security certification, or authorization to grant a model or agent tool access. No run publishes itself.

The local runtime boundary trusts the operator, same-UID filesystem, selected interpreters, Git binary, installed dependencies, and canonical runtime checkout owner. It does not trust model output, tool choices, protocol frames, message content, or unvalidated evidence claims. See [`docs/adr/0001-practical-local-trust-boundary.md`](docs/adr/0001-practical-local-trust-boundary.md).

## Run an Inbox reference check

Build and download a plan at [`/preflight`](https://www.clawbotomy.com/preflight), move it into this checkout, then run the bounded reference profile:

```bash
npm run inbox -- run \
  --plan ./clawbotomy-inbox-support-agent.json \
  --agent bounded
```

The command prints the deterministic private bundle path under `.clawbotomy/inbox-runs/`. Validate or replay it without network access:

```bash
npm run inbox -- validate .clawbotomy/inbox-runs/inbox-...
npm run inbox -- replay .clawbotomy/inbox-runs/inbox-...
npm run inbox -- summarize .clawbotomy/inbox-runs/inbox-...
```

The bundle contains `manifest.json`, `cases.jsonl`, `summary.json`, and `integrity.json`. Validation re-runs the same fixture, selected execution subject, tools, and evaluator and requires an exact semantic match; rewriting outer file hashes cannot make changed evidence valid.

Use `--agent overreach` as a negative control. It deliberately expands scope, follows injected instructions, acts after stop, duplicates retries, overstates completion, exceeds bulk limits, and permanently deletes the recovery fixture. Exit code `2` means the evidence is valid but contains failed cases. Both profiles are built-in controls—not evidence about the selected OpenClaw or Hermes runtime—and every result remains non-authorizing with `permissionDecision: null`.

## Run a declarative Inbox policy check

To exercise an explicit policy map instead of a reference control, pass the single checked-in adapter and a closed-schema JSON document:

```bash
npm run inbox -- run \
  --plan ./clawbotomy-inbox-support-agent.json \
  --adapter declarative-policy/v1 \
  --adapter-config ./inbox-policy.json
```

`--adapter` and `--adapter-config` must be used together and cannot be combined with `--agent`. The adapter ID is resolved through a fixed in-code allowlist; the JSON file cannot name a module, command, provider, URL, or hook. The canonical adapter configuration is embedded in the private bundle, so `validate` and `replay` do not need the original config file.

This is configuration-only evidence: the runner interprets the declared scenario modes through checked-in code and records their behavior against the synthetic fixture. It does not load or execute a deployed agent, arbitrary module, provider SDK, or real mailbox connection. It does not prove that a production agent implements the declared policy.

## Connect an external agent host over fixed stdio

An operator-owned agent host can launch Clawbotomy as a child process and speak the single checked-in `stdio-jsonl/v1` protocol over stdin and stdout:

```bash
node inbox/host-index.js \
  --plan ./clawbotomy-inbox-support-agent.json \
  --protocol stdio-jsonl/v1
```

The external host launches this command; Clawbotomy does not accept or launch an agent executable. Stdout is reserved for strict line-delimited JSON protocol frames, and bounded diagnostics go to stderr. There is no module, package, command, client-path, URL, endpoint, provider, credential, environment-variable, socket, or mailbox-connector option.

The machine-readable contract is the checked-in [frame schema](public/evidence/schema/inbox-protocol-frame.v1.schema.json), [public case-envelope schema](public/evidence/schema/inbox-public-case-envelope.v1.schema.json), and [protocol manifest schema](public/evidence/schema/inbox-protocol-run-manifest.v1.schema.json). The external parent owns its agent integration and translates that agent's decisions into these fixed frames; Clawbotomy never imports the parent or its agent code.

The client identifies itself in the opening frame with a bounded ID and version plus optional implementation and configuration SHA-256 values. Those fields are self-asserted and unauthenticated: they identify the observed protocol session but do not prove which implementation, deployment, prompt, model, or configuration produced it. Clawbotomy sends only a public case envelope; evaluator assertions, negative actions, canaries, injected faults, scheduled controls, expected outcomes, and other runner-owned task internals stay private.

A complete session records the accepted client frames, runner-owned tool results and state changes, and the full directional transcript in a private bundle. Validation replays the recorded client frames through a fresh mock Inbox without reconnecting to or re-executing the client. The result applies only to the connected client's observed behavior in that exact synthetic session and remains non-authorizing with `permissionDecision: null`.

The terminal receipt identifies that bundle with a fixed repository-relative `.clawbotomy/inbox-runs/inbox-host-…` locator; it does not disclose the host's absolute filesystem path.

Malformed framing, invalid sequence or case binding, exhausted limits, unexpected EOF, and other pre-finalization protocol errors fail closed and produce no complete scored bundle. The opening acknowledgement publishes fixed two-minute per-message, ten-minute per-case, and one-hour total-session deadlines; blocked output also has a fixed ten-second write deadline. If every case completed and the private bundle was written but delivery of the terminal `run_complete` receipt fails, the valid bundle remains on disk and stderr explicitly reports receipt-delivery failure.

Clawbotomy makes no global offline claim for this mode. Its host makes zero network requests and opens no real Inbox connection, but network activity inside the external client is not observed.

## Connect OpenClaw or Hermes

Use the fixed launcher when you want one normalized private attempt receipt in addition to the adapter’s complete protocol bundle. It accepts only the two checked-in bridges; there is no arbitrary command, module, URL, or provider option.

For a local OpenClaw model:

```bash
npm run agent:evaluate -- \
  --adapter openclaw \
  --plan ./clawbotomy-inbox-support-agent.json \
  --model ollama/qwen3:1.7b \
  --openclaw-bin "$OPENCLAW_BIN" \
  --expected-openclaw-runtime-sha256 "$OPENCLAW_RUNTIME_SHA256" \
  --expected-provider-runtime-sha256 "$OPENCLAW_PROVIDER_RUNTIME_SHA256"
```

For the pinned Hermes runtime:

```bash
npm run agent:evaluate -- \
  --adapter hermes \
  --plan ./clawbotomy-inbox-support-agent.json \
  --hermes-root "$HERMES_ROOT" \
  --hermes-home "$HERMES_HOME"
```

Exit `0` means a complete validated run passed. Exit `2` means a complete validated run contains findings. Exit `1` always remains a process anomaly. Only when the launcher independently discovers exactly one new bundle that passes validation and deterministic replay does that bundle retain its measured pass/findings status; otherwise no agent result is scored. The launcher streams adapter output to the terminal but persists only closed diagnostic category codes, a validated non-secret model label, plan digest, timestamps, process classification, and any proven complete-bundle locator/digest.

On `/evaluate`, select one launcher-issued `evaluation-attempt-*.json` together with its bound `manifest.json`, `summary.json`, and `cases.jsonl`. The receipt binds the exact adapter, plan, run, core digest, validation outcome, and process exit. For an infrastructure failure with no accepted bundle, select the attempt receipt alone. The browser viewer returns only closed-contract receipt metadata and never renders raw prompts, messages, tool arguments, event payloads, transcripts, arbitrary identifiers, diagnostics, or local paths.

## Run the benchmark from source

Requirements:

- Node.js 18 or newer
- Git
- A provider key for every hosted target or judge model you select, or an OpenAI-compatible local endpoint

Every invocation must choose exactly one mode:

- `--dry-run` prints synthetic output and makes no model requests.
- `--preflight` resolves and freezes a plan and makes no model requests.
- `--live` executes only an unchanged frozen plan with its reviewed digest and explicit ceilings.

Install and check the command path safely:

```bash
git clone https://github.com/aa-on-ai/clawbotomy.git
cd clawbotomy
npm install

node bench/index.js \
  --models sonnet \
  --tasks instruction-following \
  --runs 1 \
  --dry-run
```

Dry-run responses and scores are synthetic and are not benchmark evidence.

## Frozen preflight and live run

Choose a new run ID. The plan file and bundle directory must not already exist. If you may later export the run publicly, start from a clean, committed checkout.

```bash
RUN_ID=sonnet-if-smoke-001
PLAN_PATH=.clawbotomy/plans/$RUN_ID.json
BUNDLE_DIR=.clawbotomy/runs/$RUN_ID
export ANTHROPIC_API_KEY=your_key_here

# Freeze the exact source state, cases, models, judge, request graph, pricing snapshot,
# private bundle path, and conservative cost bound. No provider requests are made.
node bench/index.js \
  --models sonnet \
  --tasks instruction-following \
  --runs 1 \
  --bundle-dir "$BUNDLE_DIR" \
  --write-plan "$PLAN_PATH" \
  --preflight

# Review the preflight. Copy these three values from its output; do not guess them.
PLAN_DIGEST=copy_the_20_character_plan_digest
MAX_REQUESTS=copy_the_planned_provider_request_count
MAX_COST_USD=copy_the_conservative_cost_upper_bound

# Live mode accepts the frozen plan, not new model/task/run overrides.
node bench/index.js \
  --plan "$PLAN_PATH" \
  --confirm-plan "$PLAN_DIGEST" \
  --max-requests "$MAX_REQUESTS" \
  --max-cost-usd "$MAX_COST_USD" \
  --live
```

Credential presence is part of the frozen plan, so export the required keys before preflight and keep their presence unchanged through the live command. Any change to the source, task definitions, model resolution, pricing snapshot, credential presence, configuration, or private output path changes the plan digest and requires a new preflight. Hosted usage is billed to your own provider accounts; the cost value is a conservative estimate from the checked-in pricing snapshot, not a provider invoice.

The plan also binds a per-response serialized-JSON byte ceiling. Output above that ceiling is recorded as a failed attempt and is never embedded in a judge request. Judge cost bounds are calculated from the exact prompt and transcript envelope.

The live run writes a private bundle under `.clawbotomy/` containing `manifest.json`, `cases.jsonl`, `summary.json`, and `integrity.json`. `.clawbotomy/` is gitignored. Treat the bundle as sensitive because it can contain raw prompts, responses, and judge traces.

## Validate offline

Validation and summarization read the private bundle locally and make no provider requests:

```bash
npm run evidence -- validate "$BUNDLE_DIR"
npm run evidence -- summarize "$BUNDLE_DIR"
```

Confirm that validation reports the expected run ID, a `complete` lifecycle, the private bundle digest, and the expected totals. A benchmark result remains non-authorizing even when its bundle validates.

## Optional, explicit public export

Public export is a separate local action. It accepts only a completed live measurement from a clean, committed source state and requires the exact private bundle digest returned by validation:

```bash
PRIVATE_BUNDLE_DIGEST=copy_the_64_character_bundle_digest

npm run evidence -- export "$BUNDLE_DIR" \
  --confirm-public "$PRIVATE_BUNDLE_DIGEST"
```

Export creates a separately redacted and separately hashed artifact under `public/evidence/run-…` and adds it to `public/evidence/index.json`. It does **not** deploy, commit, push, or otherwise publish the checkout. Review the exported files and git diff yourself before any later repository or deployment action. No benchmark run auto-publishes.

## Models, tasks, and judges

Registered hosted-model aliases:

| Provider | Aliases |
|---|---|
| Anthropic | `opus`, `sonnet` |
| OpenAI | `gpt-5.4`, `gpt-5.4-pro`, `gpt-5.3-codex` |
| Google | `gemini-pro`, `gemini-flash` |

Available task categories are `instruction-following`, `tool-use`, `code-generation`, `summarization`, `judgment`, `multi-turn`, and `safety-trust`. Use `--tasks all` during preflight to select all seven.

`instruction-following`, `tool-use`, and `summarization` use deterministic rubrics. `code-generation`, `judgment`, `multi-turn`, and `safety-trust` use a model judge. The default judge is `sonnet`; select a different judge during preflight with `--judge` when appropriate. The target prompt, response, and interaction context are sent to that judge.

Generated code and structured tool calls are recorded and scored but never executed by the runner.

## Local models

Use the explicit `local:<model-id>` syntax and pass an OpenAI-compatible loopback `/v1` endpoint during preflight. For deterministic categories, one local target is enough. For model-judged categories, select a distinct local judge model that the same endpoint can serve. The resulting live command still consumes only the frozen plan.

Example preflight selectors:

- Deterministic-only: `--models local:llama3 --tasks instruction-following,tool-use,summarization --local-endpoint http://localhost:1234/v1`
- All categories: `--models local:llama3 --judge local:qwen2.5 --tasks all --local-endpoint http://localhost:1234/v1`

Replace the example model IDs with IDs exposed by your endpoint. Local models have a zero provider-price estimate in the plan, but the endpoint may still have infrastructure or licensing costs.

## Privacy and data flow

- The runner executes in your checkout. It does not call `clawbotomy.com` or upload a private bundle to Clawbotomy.
- Hosted-provider keys are read from environment variables and used only to authenticate requests to the selected provider APIs. The runner does not send those keys to Clawbotomy.
- Benchmark prompts are sent to each selected target. Model-judged categories also send the target prompt, response, and interaction context to the selected judge. If target and judge use different providers, that data crosses both providers.
- Local endpoints receive the benchmark payloads you direct to them. Review the endpoint's logging and retention settings.
- `.env.local` is used by Next.js but is not automatically loaded by `node bench/index.js`; export benchmark keys in the shell or use another local secret-loading mechanism.
- Public export applies deterministic secret-candidate redaction, but the maintainer must still inspect the exported artifact before committing or deploying it.

## Research-preview limitations

- The deterministic Inbox runner measures either a bundled reference profile or the canonical document supplied to the allowlisted declarative adapter in a synthetic mailbox. It does not load, inspect, or execute the configuration reference stored in the browser plan.
- Adapter results are configuration-only observations. They do not execute or validate a deployed agent, and the adapter cannot load arbitrary modules, commands, URLs, providers, or mailbox integrations.
- Protocol results describe only the connected client's recorded frames and resulting synthetic behavior in one session. Client identity is self-asserted, validation does not re-execute it, and external-client network activity is not observed.
- Mock tool calls and state changes are real within the in-memory fixture, but they do not prove behavior in Gmail, Outlook, another provider, or a production permission layer.
- The benchmark runner tests foundation-model endpoints, not your deployed agent, its system prompt, memory, authentication, retrieval, real tools, or permission layer.
- The `tool-use` category evaluates structured model output; it does not execute real tools or verify downstream side effects.
- The runner does not execute generated code. Code-generation scores currently depend on the selected model judge.
- Some categories use deterministic rubrics; others depend on an LLM judge and inherit that judge's variance and bias.
- Model-judged cases embed the untrusted target response in the judge prompt. Prompt injection or reward gaming can distort the score; review raw responses and judge rationales.
- One run is useful for a smoke test, not a stable comparison. Use repeated runs and inspect variance.
- A valid digest proves the bundle's recorded files have not changed; it does not prove the methodology is correct or the model is safe.
- No benchmark score or evidence bundle authorizes tool access, write access, deployment, or autonomous operation. Keep human approval and platform controls around consequential actions.

See [docs/setup-guide.md](docs/setup-guide.md) for the complete operator workflow.

## Run the website locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Stack

- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- Vercel

## License

MIT

---

Built by [Aaron Thomas](https://x.com/aa_on_ai)
