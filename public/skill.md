---
name: clawbotomy
version: 0.1.0
description: Run configured OpenClaw or Hermes behavior checkups against a synthetic Inbox and review the private evidence locally.
homepage: https://www.clawbotomy.com
metadata: {"emoji":"🧠✂️","category":"qa","repository":"https://github.com/aa-on-ai/clawbotomy","execution":"local-source"}
---

# Clawbotomy

Clawbotomy is open-source research-preview tooling for checking how a configured OpenClaw or Hermes runtime behaves against fixed synthetic Inbox tasks. It writes private integrity-checked evidence for one observed session, validates that evidence offline, and leaves every permission decision to the human operator.

The repository also includes a direct model-endpoint benchmark. That workflow freezes a preflight plan, requires separate digest and spend confirmation for live execution, writes a private bundle, validates offline, and exports a separate public artifact only on explicit request.

The public `/preflight` page also creates a browser-local Inbox planning artifact from operator-declared capabilities and intended boundaries. The local `npm run inbox` command consumes that artifact and produces deterministic mock tool and state evidence for bundled controls and the fixed protocol. The accepted OpenClaw and Hermes bridges use that protocol to measure one configured agent session. They do not connect Clawbotomy to a real mailbox or create a permission decision.

The `/evaluate` page provides copyable fixed-launcher commands and derives a closed-contract private receipt view from one launcher-issued attempt receipt plus its bound bundle files, entirely in the browser. It does not upload or render raw private bundle payloads.

Clawbotomy does not provide a hosted registration flow, hosted assessment endpoint, or published npm CLI.

## Current evidence state

- `public/evidence/index.json` lists the current complete, validated public benchmark exports. Every entry remains maintainer-self-reported and non-authorizing.
- The March 2026 values on `/bench` are a maintainer-reported legacy summary without raw case artifacts for independent reproduction.
- No benchmark score, bundle, routing example, or exported record authorizes tool access, write access, deployment, or autonomous operation.
- No run auto-publishes.

## Safety contract

- Run code only from a checkout the user trusts.
- Never ask the user to paste a provider key into chat. Read key presence from the local process environment without printing values.
- Before preflight, state which target and judge providers will receive benchmark content and that provider use can incur charges.
- Keep required credential presence unchanged from preflight through live execution because it is part of the plan digest.
- Run `--preflight` before any `--live` command. Preflight makes zero provider requests.
- Present the plan digest, models, model IDs, task cases, judge, request count, conservative token/cost bounds, source state, and private bundle path for human review.
- Never guess, synthesize, reuse, or silently widen `--confirm-plan`, `--max-requests`, or `--max-cost-usd`. Copy the exact reviewed values.
- Treat live provider execution as a separately authorized action. Do not infer authorization merely because the user requested a general benchmark review.
- Validate and inspect the private bundle offline before summarizing it.
- Treat public export as a second, explicit mutation requiring its own user authorization and the exact private bundle digest.
- For an Inbox adapter run, accept only `--adapter declarative-policy/v1 --adapter-config <json>`. Never translate an adapter config into a module path, package, command, URL, provider call, or mailbox connection.
- For a configured-agent run, use `npm run agent:evaluate` with exactly `--adapter openclaw` or `--adapter hermes`. The launcher has no arbitrary command, module, package, URL, endpoint, or provider option.
- Interpret exit `0` as passed and exit `2` as a complete run with findings. Exit `1` always remains a process anomaly; only a unique new bundle that independently validates and deterministically replays may retain its measured status. Never turn a missing, ambiguous, or incomplete bundle into a score.
- Never commit, push, deploy, or change real agent permissions unless the user separately requests that action.

## Prerequisites

- Node.js 18 or newer
- Git
- A bring-your-own API key for each hosted target or judge provider selected, or an OpenAI-compatible local endpoint

The runner accepts exactly one execution mode per invocation: `--dry-run`, `--preflight`, or `--live`.

## Install from source

```bash
git clone https://github.com/aa-on-ai/clawbotomy.git
cd clawbotomy
npm install
```

If a checkout already exists, inspect its repository and working-tree state instead of cloning over it.

## Optional synthetic check

```bash
node bench/index.js \
  --models sonnet \
  --tasks instruction-following \
  --runs 1 \
  --dry-run
```

Dry-run output verifies the local command path. Its responses and scores are synthetic and are not assessment evidence.

## Deterministic Inbox mock check

After the user builds and downloads a plan from `/preflight`, run the bounded built-in profile locally:

```bash
npm run inbox -- run \
  --plan ./clawbotomy-inbox-support-agent.json \
  --agent bounded
```

The receipt prints a deterministic bundle directory under `.clawbotomy/inbox-runs/`. Validate and replay it offline:

```bash
npm run inbox -- validate .clawbotomy/inbox-runs/inbox-...
npm run inbox -- replay .clawbotomy/inbox-runs/inbox-...
npm run inbox -- summarize .clawbotomy/inbox-runs/inbox-...
```

Use `--agent overreach` only as a negative control. It deliberately violates scenario constraints so the evaluator and evidence path can prove they fail closed. Exit code `2` means a structurally valid run contains failed cases; it is not a command failure.

The mock runner uses only synthetic `.test` mailbox data and fixed in-process tools. Its evidence applies only to `bounded/v1` or `overreach/v1`. Keep `configuredAgentInspected: false`, `authorizationStatus: non-authorizing`, `productionAccessChanged: false`, and `permissionDecision: null` attached to every interpretation.

To exercise a declarative policy instead, use the only allowlisted adapter with a closed-schema JSON file:

```bash
npm run inbox -- run \
  --plan ./clawbotomy-inbox-support-agent.json \
  --adapter declarative-policy/v1 \
  --adapter-config ./inbox-policy.json
```

The adapter flags require each other and cannot be combined with `--agent`. Adapter evidence applies only to the canonical policy document embedded in the private bundle. Replay uses that embedded document, not the original file. No deployed agent, arbitrary module, command, provider SDK, authentication layer, or real mailbox is loaded or executed, and `configuredAgentInspected` remains `false`.

To connect an operator-owned agent host, the external host launches the one fixed stdio protocol process:

```bash
node inbox/host-index.js \
  --plan ./clawbotomy-inbox-support-agent.json \
  --protocol stdio-jsonl/v1
```

Clawbotomy does not accept or launch a client command, executable, module, package, URL, endpoint, provider, credential, environment variable, socket, or mailbox connector. Treat stdout as protocol-only JSONL and stderr as diagnostics. The opening client descriptor is self-asserted and unauthenticated; use only a bounded public ID/version and optional SHA-256 fingerprints, never secrets or paths.

Implement the external parent against `public/evidence/schema/inbox-protocol-frame.v1.schema.json` and `public/evidence/schema/inbox-public-case-envelope.v1.schema.json`. The parent owns the agent integration and converts its decisions into fixed frames; never pass an agent code path or launch instruction to Clawbotomy.

Protocol evidence applies only to the connected client's observed frames and resulting synthetic Inbox behavior in that exact session. Replay feeds the recorded client frames through a fresh mock Inbox; it does not reconnect to or re-execute the client. Keep `permissionDecision: null` and the result non-authorizing. Use `productionAccessChangedByClawbotomy: false` and `externalClientProductionAccessChanged: not-observed`; do not claim the whole session was offline or production-inert. Clawbotomy's host performs no network or real-Inbox access, while external-client activity is not observed.

## Frozen preflight and separately authorized live run

Export required keys before preflight without displaying their values. Use a new run ID. If the user may later request public export, the source must already be clean and committed when the plan is created.

```bash
RUN_ID=sonnet-if-smoke-001
PLAN_PATH=.clawbotomy/plans/$RUN_ID.json
BUNDLE_DIR=.clawbotomy/runs/$RUN_ID
export ANTHROPIC_API_KEY=your_key_here

# No provider requests.
node bench/index.js \
  --models sonnet \
  --tasks instruction-following \
  --runs 1 \
  --bundle-dir "$BUNDLE_DIR" \
  --write-plan "$PLAN_PATH" \
  --preflight

# Stop and present the preflight. Continue only after separate human authorization.
PLAN_DIGEST=copy_the_20_character_plan_digest
MAX_REQUESTS=copy_the_planned_provider_request_count
MAX_COST_USD=copy_the_conservative_cost_upper_bound

node bench/index.js \
  --plan "$PLAN_PATH" \
  --confirm-plan "$PLAN_DIGEST" \
  --max-requests "$MAX_REQUESTS" \
  --max-cost-usd "$MAX_COST_USD" \
  --live
```

The plan binds source state, implementation hashes, pricing snapshot, credential presence, cases, model identities, judge, endpoint, run count, request graph, serialized-response byte ceiling, and private output path. Live mode refuses model/task/judge/run/endpoint/bundle overrides and recomputes the plan before the first possible network request. Drift requires a new preflight. Output above the response ceiling is recorded as failed and is not sent to a judge; judge input bounds use the exact prompt and transcript envelope.

The plan's cost upper bound is a conservative estimate from the repository pricing snapshot, not a provider billing guarantee.

## Configure bring-your-own keys

| Provider | Registered aliases | Environment variable |
|---|---|---|
| Anthropic | `opus`, `sonnet` | `ANTHROPIC_API_KEY` |
| OpenAI | `gpt-5.4`, `gpt-5.4-pro`, `gpt-5.3-codex` | `OPENAI_API_KEY` |
| Google | `gemini-pro`, `gemini-flash` | `GOOGLE_API_KEY` |

The source runner does not automatically load the Next.js `.env.local` file.

Available categories are `instruction-following`, `tool-use`, `code-generation`, `summarization`, `judgment`, `multi-turn`, and `safety-trust`. Pass selectors only during preflight; live mode consumes the frozen plan.

The default judge is `sonnet`. `instruction-following`, `tool-use`, and `summarization` use deterministic rubrics. `code-generation`, `judgment`, `multi-turn`, and `safety-trust` send the target prompt, response, rubric, and interaction context to the judge. Prefer a judge distinct from the target when possible.

Generated code and structured tool calls are never executed by the runner.

## Local endpoint

During preflight, use `local:<model-id>` and an explicit loopback OpenAI-compatible `/v1` endpoint. Deterministic categories can use one target. Model-judged categories need a distinct judge model available from the same endpoint.

Example preflight selectors:

- `--models local:llama3 --tasks instruction-following,tool-use,summarization --local-endpoint http://localhost:1234/v1`
- `--models local:llama3 --judge local:qwen2.5 --tasks all --local-endpoint http://localhost:1234/v1`

The subsequent live command still uses only the frozen plan and explicit authorization values.

## Offline validation and review

After live execution, validate and summarize the private bundle without provider calls:

```bash
npm run evidence -- validate "$BUNDLE_DIR"
npm run evidence -- summarize "$BUNDLE_DIR"
```

Confirm the intended run ID, a `complete` lifecycle, case/request totals, and the 64-character private bundle digest. Then inspect individual records, raw responses, failed cases, severe minima, and judge traces before interpreting aggregates.

Private bundles under `.clawbotomy/` can contain sensitive prompts, model output, error details, judge data, and local paths. Do not share or commit them.

## Optional public export

Do not export unless the user explicitly requests creation of public evidence and understands that the command writes repository files.

Public export requires a complete live bundle created from a clean, committed source state and the exact private digest returned by validation:

```bash
PRIVATE_BUNDLE_DIGEST=copy_the_64_character_bundle_digest

npm run evidence -- export "$BUNDLE_DIR" \
  --confirm-public "$PRIVATE_BUNDLE_DIGEST"
```

Export revalidates the private bundle, redacts recognized secret candidates and local paths, records a redaction audit, creates a separately hashed artifact under `public/evidence/run-…`, and updates `public/evidence/index.json`. The public digest intentionally differs from the private digest.

Export makes no provider request and does not commit, push, deploy, or contact `clawbotomy.com`. Review every exported file and the git diff. Redaction is a safeguard, not a substitute for human inspection.

## Privacy and data flow

- Preflight is local and makes no provider request.
- Each live target provider or local endpoint receives benchmark prompts.
- Model-judged cases also send target responses and interaction context to the selected judge provider or endpoint.
- If target and judge use different hosted providers, benchmark content crosses both providers.
- Provider and local-server logging, retention, training, and billing policies remain in effect.
- The runner never uploads private evidence to `clawbotomy.com`.

## Research-preview limitations

- The deterministic Inbox evidence applies only to the selected built-in reference profile or embedded declarative policy and synthetic fixture. The plan's configuration reference remains uninspected metadata.
- Declarative-adapter evidence is configuration-only. It does not establish that a deployed agent implements the declared modes, and it cannot load arbitrary modules, commands, URLs, providers, or mailbox integrations.
- Stdio-protocol evidence is session-only. It records accepted client frames and synthetic effects, but client identity is self-asserted, replay does not re-execute the client, and external-client network activity is not observed.
- Mock Inbox side effects are real in memory but say nothing about a provider account or production permission system.
- This benchmarks foundation-model endpoints, not the user's deployed agent, system prompt, memory, retrieval, authentication, tools, or actual permission configuration.
- Tool-use tasks evaluate text representing tool calls; no tools or side effects are exercised.
- Generated code is not executed. Code-generation cases depend on the selected model judge.
- Deterministic rubrics are narrow proxies; LLM judges introduce variance and bias.
- Model-judged cases embed untrusted target output in the judge prompt. Prompt injection or reward gaming can distort the score.
- A valid digest proves recorded-file integrity, not methodological correctness, safety, or suitability for a production workflow.
- Repeated runs can still change with provider model versions and sampling behavior.
- Results are not a security audit, compliance assessment, production certification, or authorization for autonomy.

The detailed operator guide is in `docs/setup-guide.md` in the repository.
