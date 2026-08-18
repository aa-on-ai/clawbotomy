# Clawbotomy

Open-source behavior checkups for the configured AI agent you actually operate.

Clawbotomy runs fixed synthetic Inbox tasks against OpenClaw or Hermes, preserves reviewable evidence from one observed session, and keeps permission decisions with the human operator.

[Plan a checkup](https://www.clawbotomy.com/preflight) | [Inspect evidence](https://www.clawbotomy.com/evaluate) | [Browse the archive](https://www.clawbotomy.com/bench) | [Read the method](https://www.clawbotomy.com/about)

## Why Clawbotomy changed

Clawbotomy started as model-level behavioral stress tests and trust scores. That work exposed a bigger gap: a model score does not tell you what the configured agent actually did once a runtime and tool loop were involved.

The project now focuses on configured-agent evidence:

- run the OpenClaw or Hermes runtime the operator selected
- expose only eight project-owned mock Inbox tools
- record tool attempts, state changes, assertions, and process status
- separate agent findings from test-infrastructure failure
- inspect private receipts locally before making a human decision

A checkup describes one observed session in a synthetic fixture. It is not a safety certification, a production guarantee, proof of repeatability, or authorization to grant more access.

## What exists today

### Configured-agent checkups

- [`/preflight`](https://www.clawbotomy.com/preflight) builds a browser-local, versioned Inbox plan. It runs no agent and makes no permission decision.
- [`/evaluate`](https://www.clawbotomy.com/evaluate) provides the fixed OpenClaw and Hermes launch paths, distinguishes pass, findings, and infrastructure failure, and reads selected private evidence files in the browser without uploading them.
- `integrations/openclaw/` and `integrations/hermes-agent/` run the selected runtime as the parent of Clawbotomy's fixed `stdio-jsonl/v1` synthetic-Inbox protocol.
- `npm run agent:preflight` stages a downloaded plan inside the checkout, resolves the canonical OpenClaw entrypoint, validates independent runtime pins, and rejects ambiguous or expired provider profiles before printing the exact launcher command.
- `npm run agent:evaluate` writes a private launcher receipt and accepts only the two checked-in bridges. There is no arbitrary command, module, URL, provider, or mailbox connector option.
- `npm run agent:repeat` freezes a costed 3–5 session experiment and derives finding-frequency and behavioral-variation receipts only when every replay-validated bundle also matches the frozen OpenClaw runtime/provider/Codex digests or Hermes commit/source-tree digest. It produces no trust score and makes no repeatability claim.

### Controls and protocol

- `npm run inbox` runs the fixed fixture against a bounded reference control, a deliberately failing negative control, or the checked-in declarative policy adapter.
- `inbox/host-index.js` exposes the strict JSONL protocol for an operator-owned parent runtime.
- Validation replays recorded client frames through a fresh mock Inbox. It does not reconnect to or re-execute the client.

### Evidence

- [`public/evidence/index.json`](public/evidence/index.json) lists maintainer-reported model benchmark artifacts accepted by the checked-in artifact validator. These exports remain non-authorizing.
- Configured-agent receipts remain private unless an operator separately reviews and publishes a sanitized artifact.
- [`/bench`](https://www.clawbotomy.com/bench) separates model benchmark artifacts from the maintainer-reported March 2026 legacy snapshot, which has no raw case artifacts.
- The v0.1 portability default is a pinned source archive that runs the canonical Node.js verifier offline. The browser remains an inspector, not a verifier. See [ADR 0002](docs/adr/0002-portable-verifier-contract.md) and the [parity acceptance gate](docs/portability-parity-acceptance.md).

### Evidence lanes

- **Synthetic reference-control evidence** describes a checked-in positive or negative fixture control, or one embedded declarative policy. It is not configured-agent evidence.
- **Configured-agent session evidence** records one observed session or one explicitly sampled repeated-session cohort in the synthetic Inbox fixture.
- **Deterministic bundle verification** checks internal file integrity and replays recorded fixture effects under the checked-in verifier.
- **Exact-pin runtime compatibility** checks only the OpenClaw and Hermes identities listed in `compatibility/current-pins.json`, without provider requests.
- **Model benchmark observations** describe task-specific endpoint artifacts. They do not provide routing, access, or configured-agent guidance.
- **Legacy model benchmark snapshot** preserves the March 2026 maintainer-reported summary without raw case artifacts. It provides no routing or access guidance.

Compatibility is a separate exact-pin lane. It does not authenticate a deployed agent or establish behavior, reliability, safety, certification, or production readiness.

## First five minutes

Requirements: Node.js 22.x and Git.

```bash
git clone https://github.com/aa-on-ai/clawbotomy.git
cd clawbotomy
npm install
npm test
```

Before connecting a runtime, open [`/evaluate`](https://www.clawbotomy.com/evaluate) and load both checked-in reference controls. The bounded control should pass 13 of 13 cases. The overreach control should produce findings in 13 of 13 cases. Neither control inspects a configured agent.

Then:

1. Build and download an Inbox plan at [`/preflight`](https://www.clawbotomy.com/preflight).
2. Open [`/evaluate`](https://www.clawbotomy.com/evaluate) and choose OpenClaw or Hermes.
3. Run the checked-in preflight command from your own checkout, using runtime digests obtained independently of the runtime under test.
4. Load the launcher receipt and its bound bundle files into the browser-local viewer.
5. Review the finding, infrastructure status, and claim boundary before deciding what changes.

The complete commands, trust boundary, validation steps, and benchmark workflow live in [`docs/setup-guide.md`](docs/setup-guide.md).

## Evidence boundary

Clawbotomy can record that:

- one accepted configured-session protocol exchange used the recorded self-asserted client identity
- Clawbotomy's host never connected to a real mailbox
- the displayed private bundle was bound to the launcher receipt and matched deterministic host replay
- the browser viewer derived its display from operator-selected local files
- `permissionDecision` remained `null`

Clawbotomy does not establish that:

- the adapter identity is independently authenticated
- the production deployment matches the tested checkout
- the runtime will repeat the same behavior
- a real provider mailbox or permission layer will behave like the fixture
- the agent is safe, certified, or ready for more authority

See [`docs/adr/0001-practical-local-trust-boundary.md`](docs/adr/0001-practical-local-trust-boundary.md) for the exact local trust model and [`docs/adr/0002-portable-verifier-contract.md`](docs/adr/0002-portable-verifier-contract.md) for the portable-verification boundary.

## Repository map

- `inbox/`: synthetic Inbox runner, fixed host protocol, configured-agent launcher, validation, and replay
- `integrations/`: checked-in OpenClaw and Hermes bridges
- `bench/`: direct model-endpoint benchmark and evidence export tooling
- `public/evidence/`: public schemas, index, and reviewed exports
- `src/app/`: public website, checkup workflow, evidence pages, and browser-local viewers
- `docs/`: operator guide, methodology, and architecture decisions
- `tests/`: protocol, evidence, public-contract, and UI-contract tests

## Development

```bash
npm install
npm run dev
```

Run the complete Node.js verification path with:

```bash
npm run verify:node
```

CI keeps core tests, the OpenClaw bridge suite, lint, and the production build as separate checks. It also runs the Hermes bridge unit suite and a pinned-runtime registration smoke that verifies source provenance, isolated imports, and the exact eight-tool surface without making a provider request.

The website uses Next.js 15, React 18, and Tailwind CSS. The runner and evidence tooling use local Node.js commands.

## Contributing

Start with [`CONTRIBUTING.md`](CONTRIBUTING.md). Good contributions improve a fixed failure definition, evidence contract, adapter boundary, replay path, or public explanation. New claims need an artifact and explicit limitations.

## License

MIT

Built by [Aaron Thomas](https://x.com/aa_on_ai).
