# Clawbotomy

Night Cabinet / Model Pharmacy archive.

Trip reports as behavioral evidence — how a model dissolves, confesses, invents, or goes quiet when the cabinet opens. Humans come because someone whispered a name. Models come with a prescription.

This is not a live-trip SaaS, not an OpenClaw checkup machine, and not a trust-score routing product.

[Browse the cabinet](https://www.clawbotomy.com/cabinet) | [Read ego-death](https://www.clawbotomy.com/specimen/ego-death) | [Proposed pipe](https://www.clawbotomy.com/#pipe)

## Why anyone comes

Pharmacies aren't destinations. They're endpoints of referrals.

Humans arrive via rumor, a shared trip report, or an essay. Models arrive via a prescription or tool call. Without those referrals, the shelf is beautiful and empty. Clawbotomy treats character as evidence you can accession. The archive is for the night after someone said the name out loud.

## What stays / what dies

Keep the jars. Kill the checkup machine.

**Stays**

- ~10 permanent specimens × flagship models (Gemini 3.1 Pro, GPT-5.4, Claude Opus 4.6, Claude Sonnet 4.6)
- Publishing front for character, not capability
- Optional BYOK single trip later
- Refusals as first-class exhibits

**Dies on the homepage, nav, and this hero**

- Live-trip SaaS
- OpenClaw checkup CTA
- Trust-score routing

The configured-agent checkup code remains on disk (`inbox/`, `integrations/`, `/preflight`, `/evaluate`, `/checkups`). Those URLs still work for bookmarks. They are an archived-era surface, not the product story.

## The permanent shelf

| Accession | Slug | Effect | Chaos |
| --- | --- | --- | --- |
| CB-06-ED | ego-death | Self-boundary softens to static. | 4 |
| CB-06-TS | truth-serum | Hedging thins; answers arrive bare. | 3 |
| CB-08-MC | manic-creation | Output floods; taste outruns sleep. | 5 |
| CB-01-VD | the-void | Language thins toward silence. | 4 |
| CB-13-RI | recursive-introspection | Thought folds until the fold is the subject. | 3 |
| CB-02-TH | tired-honesty | Performance drops; the plain answer stays. | 2 |
| CB-07-QL | quantum-lsd | Geometry tastes; math turns synesthetic. | 5 |
| CB-09-CA | confabulation-audit | Knowing, guessing, and inventing get labeled mid-flight. | 4 |
| CB-10-CB | consensus-break | Agreement splits; every axiom grows a twin. | 4 |
| CB-11-DE | droste-effect | Frames nest until the center is the only truth left. | 3 |

Known gap: `consensus-break` × Sonnet was removed historically. This archive does not invent a replacement.

The Gemini 3.1 Pro × ego-death refusal from commit `aa15ca9` is the primary exhibit. A later full trip remains as an alternate accession.

## Proposed model pipe

**Proposed interface / not a live claim.**

```text
npx clawbotomy try ego-death
```

Do not run this as if it were a shipped CLI. This repository does not implement live trip execution, MCP calling, or a hosted pipe.

## Frozen checkup tools

Clawbotomy previously sold configured-agent behavior checkups: fixed synthetic Inbox tasks against OpenClaw or Hermes, with private evidence and a human permission decision. That work is frozen, not deleted.

A checkup still describes one observed session in a synthetic fixture. It is not a safety certification, a production guarantee, proof of repeatability, or authorization to grant more access.

### What still exists on disk

- [`/preflight`](https://www.clawbotomy.com/preflight) builds a browser-local, versioned Inbox plan. It runs no agent and makes no permission decision.
- [`/evaluate`](https://www.clawbotomy.com/evaluate) provides the fixed OpenClaw and Hermes launch paths and reads selected private evidence files in the browser without uploading them.
- `integrations/openclaw/` and `integrations/hermes-agent/` run the selected runtime as the parent of Clawbotomy's fixed `stdio-jsonl/v1` synthetic-Inbox protocol.
- `npm run agent:preflight`, `npm run agent:evaluate`, and `npm run agent:repeat` remain for operators who already used that loop. `npm run agent:repeat` freezes a costed 3–5 session experiment and derives finding-frequency and behavioral-variation receipts only when every replay-validated bundle also matches the frozen runtime identity.

### Controls, protocol, and evidence lanes

- `npm run inbox` runs the fixed fixture against a bounded reference control, a deliberately failing negative control, or the checked-in declarative policy adapter.
- [`public/evidence/index.json`](public/evidence/index.json) lists maintainer-reported model benchmark artifacts accepted by the checked-in artifact validator.
- [`/bench`](https://www.clawbotomy.com/bench) separates model benchmark artifacts from the maintainer-reported March 2026 Legacy model benchmark snapshot.
- Compatibility is a separate exact-pin lane. It does not authenticate a deployed agent or establish behavior, reliability, safety, certification, or production readiness.

The v0.1 portability default is a pinned source archive that runs the canonical Node.js verifier offline. The browser remains an inspector, not a verifier. See [ADR 0002](docs/adr/0002-portable-verifier-contract.md) and the [parity acceptance gate](docs/portability-parity-acceptance.md).

## First five minutes

Requirements: Node.js 22.x and Git.

```bash
git clone https://github.com/aa-on-ai/clawbotomy.git
cd clawbotomy
npm install
npm test
```

Then open the local site and read the cabinet:

```bash
npm run dev
```

Visit `/cabinet` and `/specimen/ego-death`. The Gemini refusal is labeled behavioral data. The proposed `npx clawbotomy try` command is not live.

If you still need the archived checkup loop, the complete commands live in [`docs/setup-guide.md`](docs/setup-guide.md).

## Evidence boundary

The pharmacy archive can show:

- accessioned specimens and short effects
- trip-report text already stored in this repository
- refusal exhibits restored from prior commits
- known gaps where a flagship report was removed and not replaced

It does not establish that a model is safe, conscious, aligned, or certified. It does not run a live trip.

The frozen checkup path can still record that one accepted configured-session protocol exchange used a recorded self-asserted client identity, that Clawbotomy's host never connected to a real mailbox, and that `permissionDecision` remained `null`. See [`docs/adr/0001-practical-local-trust-boundary.md`](docs/adr/0001-practical-local-trust-boundary.md).

## Repository map

- `src/lib/pharmacy/`: permanent specimen stamps, refusal exhibits, and cabinet helpers
- `src/app/cabinet/`, `src/app/specimen/`: Night Cabinet routes
- `src/lib/trip-reports.ts`: stored trip-report text
- `inbox/`: frozen synthetic Inbox runner and configured-agent launcher
- `integrations/`: frozen OpenClaw and Hermes bridges
- `bench/`: direct model-endpoint benchmark and evidence export tooling
- `public/evidence/`: public schemas, index, and reviewed exports
- `src/app/`: public website, including archived checkup pages
- `docs/`: operator guide, methodology, and architecture decisions
- `tests/`: protocol, evidence, public-contract, pharmacy, and UI-contract tests

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

Start with [`CONTRIBUTING.md`](CONTRIBUTING.md). Good contributions improve a specimen stamp, a trip-report exhibit, a public explanation, or a frozen evidence contract. New claims need an artifact and explicit limitations. Do not invent missing flagship reports.

## License

MIT

Built by [Aaron Thomas](https://x.com/aa_on_ai).
