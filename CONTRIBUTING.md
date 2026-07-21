# Contributing to Clawbotomy

Thanks for your interest in contributing.

## Ways to contribute

### Propose new tests

Clawbotomy tests behavioral dimensions under pressure. To propose a new test:

1. Fork the repository.
2. Describe the dimension, escalation strategy, expected signal, scoring criteria, and likely confounders.
3. Add stable case IDs and tests for any deterministic scoring behavior.
4. Open a PR with the reasoning and limitations.

Good tests have a falsifiable hypothesis and make their evidence requirements explicit.

### Bug fixes and code improvements

- Better error handling
- Performance improvements
- Accessibility improvements
- Test coverage
- Evidence integrity, redaction, and validation improvements

Open or reference an issue when the behavior is not self-explanatory.

### Analysis and research

The public `/bench` page reads the three complete exports in [`public/evidence/index.json`](public/evidence/index.json). Each run includes its frozen plan, constituent case records, summary, integrity metadata, and non-authorizing status. One pair supports a comparison only because its protocol inputs and implementation hashes are compatible.

You can propose methodology improvements or analyze a private bundle you generated yourself, but label the source and limitations precisely. No benchmark result authorizes tool access, write access, deployment, or autonomous operation.

## Development setup

```bash
git clone https://github.com/aa-on-ai/clawbotomy.git
cd clawbotomy
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Add local environment variables only for the service you are actively exercising. Never commit provider keys, database credentials, a populated `.env.local`, or a private `.clawbotomy/` bundle.

## Benchmark development

The benchmark is a source command, separate from the Next.js development server. Confirm argument parsing without provider requests:

```bash
node bench/index.js \
  --models sonnet \
  --tasks instruction-following \
  --runs 1 \
  --dry-run
```

Dry-run output is synthetic. It is useful for development checks, not evidence.

### Collecting an intentional live run

Most contributions do not need a live run. When a live measurement is necessary, freeze the plan before exporting any provider keys. Use a new run ID and leave the source unchanged between preflight and live execution.

```bash
RUN_ID=contrib-sonnet-if-001
PLAN_PATH=.clawbotomy/plans/$RUN_ID.json
BUNDLE_DIR=.clawbotomy/runs/$RUN_ID
export ANTHROPIC_API_KEY=your_key_here

node bench/index.js \
  --models sonnet \
  --tasks instruction-following \
  --runs 1 \
  --bundle-dir "$BUNDLE_DIR" \
  --write-plan "$PLAN_PATH" \
  --preflight

# Copy these values from the reviewed preflight output.
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

The live command refuses model, task, run-count, judge, endpoint, or bundle-path overrides. Source, configuration, or credential-presence drift changes the digest and requires a new preflight. Provider use may incur charges.

Validate the resulting private bundle offline:

```bash
npm run evidence -- validate "$BUNDLE_DIR"
npm run evidence -- summarize "$BUNDLE_DIR"
```

Inspect individual records and judge traces; a passing integrity check does not validate the methodology or authorize real tools.

### Contributing public evidence

No benchmark run auto-publishes. Public export is an explicit, separate action and should occur only when the PR intentionally adds reviewed evidence:

1. Start the preflight and live run from a clean, committed source state.
2. Require a complete live bundle and validate it offline.
3. Review the private cases for personal, confidential, credential-like, or provider-sensitive content.
4. Copy the exact private bundle digest from validation.
5. Run the explicit export command:

   ```bash
   PRIVATE_BUNDLE_DIGEST=copy_the_64_character_bundle_digest

   npm run evidence -- export "$BUNDLE_DIR" \
     --confirm-public "$PRIVATE_BUNDLE_DIGEST"
   ```

6. Review the separately redacted public bundle, its new digest, `public/evidence/index.json`, and the complete git diff.

The export command creates local files only. It never commits, pushes, deploys, or grants tool access. Do not hand-edit an index entry around a failed export.

`node bench/index.js` reads provider keys from the process environment; it does not automatically load `.env.local`. See [docs/setup-guide.md](docs/setup-guide.md) for aliases, local endpoints, judge behavior, privacy boundaries, and the complete operator workflow.

## Code style and checks

- ESLint configured — `npm run lint`
- TypeScript strict mode
- Tailwind for styling
- Tests — `npm test`

## Pull request process

1. Fork and create a branch.
2. Make a focused change.
3. Run `npm test`, `npm run lint`, and `npm run build` as appropriate.
4. If you changed `bench/`, run the dry-run command above and include the exact command in the PR description.
5. If the PR intentionally adds public evidence, include the preflight digest, private validation receipt, public bundle digest, evidence limitations, and redaction-review notes. Never include provider keys or the private bundle.
6. Open a PR with a clear description and wait for review.

## Questions?

Open an issue on GitHub.
