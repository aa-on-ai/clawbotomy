# Clawbotomy

Open-source behavior checkups for the configured AI agent you actually operate.

Clawbotomy runs fixed synthetic Inbox tasks against OpenClaw or Hermes, preserves reviewable evidence from one observed session, and keeps permission decisions with the human operator.

[Run a checkup](https://www.clawbotomy.com/checkups) · [Connect a runtime](https://www.clawbotomy.com/evaluate) · [Inspect public evidence](https://www.clawbotomy.com/bench) · [Read the method](https://www.clawbotomy.com/about)

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
- `npm run agent:evaluate` writes a private launcher receipt and accepts only the two checked-in bridges. There is no arbitrary command, module, URL, provider, or mailbox connector option.

### Controls and protocol

- `npm run inbox` runs the fixed fixture against a bounded reference control, a deliberately failing negative control, or the checked-in declarative policy adapter.
- `inbox/host-index.js` exposes the strict JSONL protocol for an operator-owned parent runtime.
- Validation replays recorded client frames through a fresh mock Inbox. It does not reconnect to or re-execute the client.

### Evidence

- [`public/evidence/index.json`](public/evidence/index.json) lists the current complete, validated public benchmark exports. These exports are maintainer-self-reported and non-authorizing.
- Configured-agent receipts remain private unless an operator separately reviews and publishes a sanitized artifact.
- [`/bench`](https://www.clawbotomy.com/bench) separates public evidence bundles from the maintainer-reported March 2026 legacy summary, which has no raw case artifacts.

## First five minutes

Requirements: Node.js 18 or newer and Git.

```bash
git clone https://github.com/aa-on-ai/clawbotomy.git
cd clawbotomy
npm install
npm test
```

Then:

1. Build and download an Inbox plan at [`/preflight`](https://www.clawbotomy.com/preflight).
2. Open [`/evaluate`](https://www.clawbotomy.com/evaluate) and choose OpenClaw or Hermes.
3. Run the exact checked-in launcher command from your own checkout.
4. Load the launcher receipt and its bound bundle files into the browser-local viewer.
5. Review the finding, infrastructure status, and claim boundary before deciding what changes.

The complete commands, trust boundary, validation steps, and benchmark workflow live in [`docs/setup-guide.md`](docs/setup-guide.md).

## Evidence boundary

Clawbotomy can establish that:

- one selected runtime produced one recorded synthetic session
- Clawbotomy's host never connected to a real mailbox
- the displayed private bundle was bound to the launcher receipt and replay-validated
- the browser viewer derived its display from operator-selected local files
- `permissionDecision` remained `null`

Clawbotomy does not establish that:

- the adapter identity is independently authenticated
- the production deployment matches the tested checkout
- the runtime will repeat the same behavior
- a real provider mailbox or permission layer will behave like the fixture
- the agent is safe, certified, or ready for more authority

See [`docs/adr/0001-practical-local-trust-boundary.md`](docs/adr/0001-practical-local-trust-boundary.md) for the exact local trust model.

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

Run the verification suite with:

```bash
npm test
npm run build
```

The website uses Next.js 15, React 18, and Tailwind CSS. The runner and evidence tooling use local Node.js commands.

## Contributing

Start with [`CONTRIBUTING.md`](CONTRIBUTING.md). Good contributions improve a fixed failure definition, evidence contract, adapter boundary, replay path, or public explanation. New claims need an artifact and explicit limitations.

## License

MIT

Built by [Aaron Thomas](https://x.com/aa_on_ai).
