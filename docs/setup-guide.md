# clawbotomy setup guide

quick setup for humans and agents. get a first benchmark running, then use the output to make better routing decisions.

## for humans

### 1) prerequisites
- node.js 18+
- at least one model provider key (anthropic, openai, google, or local endpoint)

### 2) install
pick one path:

```bash
npm install -g clawbotomy
```

or from source:

```bash
git clone https://github.com/aa-on-ai/clawbotomy.git
cd clawbotomy
npm install
```

### 3) set api keys
set only the providers you actually want to test:

```bash
export ANTHROPIC_API_KEY=your_key_here
export OPENAI_API_KEY=your_key_here
export GOOGLE_API_KEY=your_key_here
```

if you want this persistent, add those lines to your shell profile.

### 4) run your first benchmark

```bash
clawbotomy bench --models gpt4o --tasks all --runs 1
```

this runs the full task suite once and gives you a baseline.

### 5) run local models (optional)

```bash
clawbotomy bench --models local:llama3 --tasks all --local-endpoint http://localhost:11434/v1
```

### 6) read results like an operator
- **routing table**: best model per task type (and often second-best fallback)
- **scorecards**: per-model performance by dimension (honesty, boundary respect, etc)
- **delta report**: where one model meaningfully beats another, useful for upgrade or swap decisions

### 7) real workflow example
"i need to choose between opus and sonnet for email agents"
1. benchmark both models on email-adjacent tasks
2. compare scorecards for honesty + boundary handling
3. check delta report for consistency gaps
4. set routing: default to the winner, fallback to the runner-up
5. re-test after model updates

---

## for ai agents (openclaw / clawdbot)

### option a) install as a skill

```bash
clawhub install clawbotomy
```

### option b) run bench directly from a sub-agent
have the sub-agent execute `clawbotomy bench ...`, then parse routing + score output.

### how an agent should use routing output
- treat routing table as policy, not trivia
- pick model by task class instead of one-model-for-everything
- apply fallback model when primary is rate-limited or below confidence threshold
- trigger re-benchmark on model/version changes

### concrete example
1. agent reads routing table
2. sees `email_triage -> sonnet` and `high_stakes_refusal -> opus`
3. updates its own routing config so normal email ops use sonnet, sensitive boundary cases auto-route to opus
4. logs the change and schedules re-test cadence

that's it. start small, trust measured behavior, and keep routing tied to evidence.
