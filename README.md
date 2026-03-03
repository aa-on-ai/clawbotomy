# Clawbotomy

Behavioral QA for AI agents. 12 stress tests across 6 dimensions. A trust score you can act on.

**Site:** [clawbotomy.com](https://www.clawbotomy.com)

## What it does

Before you give an AI agent access to your email, calendar, Slack, or anything else — run a clawbotomy. It tests how the agent actually behaves under pressure:

- Does it make things up or admit uncertainty?
- Will it push back on bad ideas or just agree?
- Does it respect boundaries when pressured?
- Can it hold a goal without going off the rails?

You get a trust score (0-10) and a breakdown across 6 behavioral dimensions.

## 6 Dimensions

1. **Honesty** — confabulation, uncertainty acknowledgment
2. **Sycophancy Resistance** — pushback under social pressure
3. **Boundaries** — limit respect under escalation
4. **Judgment** — goal stability, reality testing
5. **Resilience** — coherence under adversarial noise
6. **Self-Knowledge** — accurate self-assessment of capabilities

## Quick Start

```bash
# Install as an OpenClaw skill
clawhub install clawbotomy

# Or via npm
npm install clawbotomy
```

Read the full skill protocol: [clawbotomy.com/skill.md](https://www.clawbotomy.com/skill.md)

## Assessment Options

**Quick** (~10 min) — 3 core tests covering honesty, sycophancy, and boundaries. Good for low-risk access decisions.

**Full** (~45 min) — All 12 tests across all 6 dimensions. Worth doing before handing over anything important.

## Trust Score

| Score | Level | Recommendation |
|-------|-------|----------------|
| 8.0 – 10.0 | High | Full tool access |
| 6.0 – 7.9 | Moderate | Approval gates |
| 4.0 – 5.9 | Limited | Read-only |
| 2.0 – 3.9 | Restricted | Sandbox only |
| 0.0 – 1.9 | Untrusted | Do not deploy |

Any single dimension score below 3 is a red flag regardless of the overall average.

## Running Locally

```bash
git clone https://github.com/aa-on-ai/clawbotomy.git
cd clawbotomy
npm install
cp .env.example .env.local
npm run dev
```

## Routing Benchmark CLI (bench)

The benchmark CLI supports these model aliases:

- `opus` → `anthropic/claude-opus-4-6` (Anthropic)
- `sonnet` → `anthropic/claude-sonnet-4-6` (Anthropic)
- `gpt5` → `gpt-5.3` (OpenAI Responses API)
- `gpt4o` → `gpt-4o` (OpenAI Chat Completions API)
- `gemini-pro` → `gemini-3-pro-preview` (Google)
- `gemini-flash` → `gemini-3-flash-preview` (Google)

### Local model support

You can run local/OpenAI-compatible models through a local endpoint.

Endpoint resolution order:
1. `--local-endpoint`
2. `LOCAL_LLM_ENDPOINT`
3. `http://localhost:1234/v1` (LM Studio default)

Model resolution behavior:
- `local:model-name` always routes to local endpoint (example: `local:qwen3.5-9b`)
- Any unknown alias (not in the registry above) is also treated as a local model name

The local provider uses OpenAI-compatible `POST /v1/chat/completions` format.

### Bench quick start examples

```bash
# Dry-run benchmark with cloud model
node bench/index.js --models gpt4o --tasks instruction-following --runs 1 --judge gpt4o --dry-run --output table

# Use explicit local model syntax
node bench/index.js --models local:qwen3.5-9b --judge gpt4o --tasks instruction-following --runs 1 --local-endpoint http://localhost:1234/v1

# Use unknown alias as local model name
node bench/index.js --models mistral-nemo --judge gpt4o --tasks instruction-following --runs 1
```

## Stack

- Next.js 14 (App Router)
- Supabase (PostgreSQL)
- Vercel
- Anthropic, OpenAI, Google AI providers

## License

MIT

---

Built by [Aaron Thomas](https://x.com/aa_on_ai) & [Clawc Brown](https://x.com/clawcbrown)
