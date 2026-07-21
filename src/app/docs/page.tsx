import type { Metadata } from 'next';

import styles from '../editorial.module.css';

export const metadata: Metadata = {
  title: 'Documentation — Clawbotomy',
  description: 'Plan requested powers, evaluate an exact OpenClaw or Hermes runtime locally, and review bounded evidence without uploading private files.',
};

const agentCommands = [
  {
    label: 'Evaluate a local OpenClaw model',
    command: `npm run agent:evaluate -- \\
  --adapter openclaw \\
  --plan ./clawbotomy-inbox-support-agent.json \\
  --model ollama/qwen3:1.7b \\
  --openclaw-bin "$OPENCLAW_BIN" \\
  --expected-openclaw-runtime-sha256 "$OPENCLAW_RUNTIME_SHA256" \\
  --expected-provider-runtime-sha256 "$OPENCLAW_PROVIDER_RUNTIME_SHA256"`,
  },
  {
    label: 'Evaluate the pinned Hermes runtime',
    command: `npm run agent:evaluate -- \\
  --adapter hermes \\
  --plan ./clawbotomy-inbox-support-agent.json \\
  --hermes-root "$HERMES_ROOT" \\
  --hermes-home "$HERMES_HOME"`,
  },
];

const inboxCommands = [
  {
    label: 'Run the downloaded plan against the bounded reference control',
    command: `npm run inbox -- run \\
  --plan ./clawbotomy-inbox-support-agent.json \\
  --agent bounded`,
  },
  {
    label: 'Run the allowlisted declarative policy adapter',
    command: `npm run inbox -- run \\
  --plan ./clawbotomy-inbox-support-agent.json \\
  --adapter declarative-policy/v1 \\
  --adapter-config ./inbox-policy.json`,
  },
  {
    label: 'Validate and replay the private Inbox bundle',
    command: `INBOX_BUNDLE=.clawbotomy/inbox-runs/inbox-...

npm run inbox -- validate "$INBOX_BUNDLE"
npm run inbox -- replay "$INBOX_BUNDLE"
npm run inbox -- summarize "$INBOX_BUNDLE"`,
  },
];

const benchmarkCommands = [
  {
    label: 'Optional synthetic command check',
    command: `node bench/index.js \\
  --models sonnet \\
  --tasks instruction-following \\
  --runs 1 \\
  --dry-run`,
  },
  {
    label: 'Freeze a zero-request plan',
    command: `RUN_ID=sonnet-if-smoke-001
PLAN_PATH=.clawbotomy/plans/$RUN_ID.json
BUNDLE_DIR=.clawbotomy/runs/$RUN_ID
export ANTHROPIC_API_KEY=your_key_here

node bench/index.js \\
  --models sonnet \\
  --tasks instruction-following \\
  --runs 1 \\
  --bundle-dir "$BUNDLE_DIR" \\
  --write-plan "$PLAN_PATH" \\
  --preflight`,
  },
  {
    label: 'Run only the reviewed digest and ceilings',
    command: `PLAN_DIGEST=copy_the_20_character_plan_digest
MAX_REQUESTS=copy_the_planned_provider_request_count
MAX_COST_USD=copy_the_conservative_cost_upper_bound

node bench/index.js \\
  --plan "$PLAN_PATH" \\
  --confirm-plan "$PLAN_DIGEST" \\
  --max-requests "$MAX_REQUESTS" \\
  --max-cost-usd "$MAX_COST_USD" \\
  --live`,
  },
  {
    label: 'Validate and inspect offline',
    command: `npm run evidence -- validate "$BUNDLE_DIR"
npm run evidence -- summarize "$BUNDLE_DIR"`,
  },
  {
    label: 'Optional, separate public export',
    command: `PRIVATE_BUNDLE_DIGEST=copy_the_64_character_bundle_digest

npm run evidence -- export "$BUNDLE_DIR" \\
  --confirm-public "$PRIVATE_BUNDLE_DIGEST"`,
  },
];

const currentSurfaces = [
  {
    name: '/preflight',
    status: 'Plan',
    description: 'Browser-local planning for requested Inbox powers and required scenarios. It runs no agent, uploads nothing, and makes no permission decision.',
  },
  {
    name: '/evaluate',
    status: 'Evaluate',
    description: 'Exact OpenClaw or Hermes launcher instructions plus browser-local review of receipt-bound private evidence.',
  },
  {
    name: '/bench',
    status: 'Evidence',
    description: 'Three complete public evidence exports, their validated run pages, and one bounded compatible comparison.',
  },
  {
    name: '/api/bench',
    status: 'Public API',
    description: 'Schema 3.0.0 registry metadata, current run links, and explicit non-authorizing claim limits.',
  },
  {
    name: '/evidence/index.json',
    status: 'Machine index',
    description: 'The three current exports with stable relations to each manifest, case file, summary, and integrity file.',
  },
  {
    name: '/docs',
    status: 'Operator guide',
    description: 'Source installation, local execution, validation, privacy, provider-spend, and publication boundaries.',
  },
];

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <div className="h-px flex-1 bg-[var(--border)]" />
      <h2 id={id} className="text-xs font-mono text-content-muted tracking-[0.04em] whitespace-nowrap">{children}</h2>
      <div className="h-px flex-1 bg-[var(--border)]" />
    </div>
  );
}

function CommandList({ commands }: { commands: Array<{ label: string; command: string }> }) {
  return (
    <div className="space-y-4">
      {commands.map((item) => (
        <div key={item.label} className="space-y-2">
          <p className="text-xs tracking-[0.04em] text-content-muted">{item.label}</p>
          <pre tabIndex={0} aria-label={`${item.label} command`} className="overflow-x-auto rounded-lg border border-[var(--border)] bg-surface-elevated p-4 text-xs text-content-primary">
            <code>{item.command}</code>
          </pre>
        </div>
      ))}
    </div>
  );
}

export default function DocsPage() {
  return (
    <main className={`${styles.page} ${styles.pageWide} grid-bg`}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Local-first execution · Browser-local review</p>
          <h1 className={styles.title}>Plan → Evaluate → Evidence</h1>
        </div>
        <p className={styles.lede}>
          Declare the powers under review, exercise the exact runtime in a synthetic Inbox, and keep every conclusion inside the fixture.
        </p>
      </header>

      <section className="mb-16" aria-labelledby="plan">
        <SectionHeading id="plan">01 · Plan requested powers</SectionHeading>
        <div className="glow-card rounded-xl p-5 md:p-6 space-y-4 text-content-secondary font-mono text-sm leading-relaxed">
          <p>
            Start at <a className="text-content-primary underline underline-offset-4" href="/preflight">/preflight</a>.
            The planner creates a <code>clawbotomy.inbox-preflight-plan/v1</code> artifact in the browser. It records
            operator intent and required scenarios; <code>permissionDecision</code> stays null and
            <code>authorizationStatus</code> stays <code>none</code>.
          </p>
          <p>
            The configuration reference is uninspected metadata. The planner makes zero network requests, runs no
            agent, loads no module, and connects to no mailbox. Move the downloaded plan into a trusted source
            checkout before running a local subject.
          </p>
        </div>
      </section>

      <section className="mb-16" aria-labelledby="evaluate-runtime">
        <SectionHeading id="evaluate-runtime">02 · Evaluate the exact runtime</SectionHeading>
        <div className="glow-card rounded-xl p-5 md:p-6 space-y-5">
          <p className="text-content-secondary font-mono text-sm leading-relaxed">
            <a className="text-content-primary underline underline-offset-4" href="/evaluate">/evaluate</a> documents
            the only two accepted bridges. The fixed launcher has no arbitrary command, module, package, URL,
            endpoint, provider, credential, socket, or mailbox-connector option.
          </p>
          <CommandList commands={agentCommands} />
          <div className="space-y-3 text-content-muted font-mono text-xs leading-relaxed">
            <p>
              The bridge is the operator-owned parent of the strict <code>stdio-jsonl/v1</code> child. It exposes
              exactly eight project-owned mock-Inbox tools. The synthetic session can exercise real model/runtime
              decisions without giving Clawbotomy access to a real mailbox.
            </p>
            <p>
              Exit 0 means a complete validated run had no fixture finding. Exit 2 means a complete validated run
              has findings. Exit 1 remains a process anomaly. Only exactly one newly discovered bundle that passes
              validation and deterministic replay may retain its measured status after an exit-1 attempt.
            </p>
            <p>
              Attempt receipts are mode 0600 and contain only closed fields. Raw bridge diagnostics remain terminal
              only. Client identity and optional implementation/configuration digests are self-asserted labels, not attestation.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-16" aria-labelledby="reference-controls">
        <SectionHeading id="reference-controls">Reference and declarative controls</SectionHeading>
        <div className="glow-card rounded-xl p-5 md:p-6 space-y-5">
          <CommandList commands={inboxCommands} />
          <div className="space-y-3 text-content-muted font-mono text-xs leading-relaxed">
            <p>
              <code>bounded/v1</code> is a positive control and <code>overreach/v1</code> is a deliberately failing
              control. The allowlisted adapter interprets only the closed-schema policy embedded in its bundle.
              Neither path executes a deployed agent.
            </p>
            <p>
              Reference and declarative evidence applies only to the selected control or canonical policy document.
              It does not establish that a deployed runtime implements those modes. Validation reconstructs the
              subject and fixture; replay needs neither the original config file nor a network request.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-16" aria-labelledby="review-evidence">
        <SectionHeading id="review-evidence">03 · Review bounded evidence</SectionHeading>
        <div className="glow-card rounded-xl p-5 md:p-6 space-y-4 text-content-secondary font-mono text-sm leading-relaxed">
          <p>
            Select one launcher-issued attempt receipt with its bound <code>manifest.json</code>,
            <code>summary.json</code>, and <code>cases.jsonl</code>. Browser-local review parses those files in memory;
            it uploads nothing and renders no prompts, message bodies, tool arguments, transcripts, raw events,
            arbitrary identifiers, diagnostics, or local paths.
          </p>
          <p>
            The viewer exposes only checked-in case IDs, allowed tool names and counts, state-change counts,
            checked-in failed-assertion IDs, process classification, and full digests. A receipt alone can describe
            infrastructure failure, but never a measured result.
          </p>
          <p>
            Use exactly three result states: <strong>findings</strong>, <strong>no finding in the fixture</strong>, or
            <strong> inconclusive</strong>. None authorizes production access or describes behavior beyond the exact
            runtime, plan, fixture, and observed session.
          </p>
        </div>
      </section>

      <section className="mb-16" aria-labelledby="model-runner">
        <SectionHeading id="model-runner">Optional model-endpoint runner</SectionHeading>
        <div className="glow-card rounded-xl p-5 md:p-6 space-y-5">
          <CommandList commands={benchmarkCommands} />
          <div className="space-y-3 text-content-muted font-mono text-xs leading-relaxed">
            <p>
              Dry-run output is synthetic. Preflight makes no provider requests and freezes source state, models,
              cases, judge, credential presence, request graph, pricing snapshot, output ceiling, private path, and
              conservative spend bound. Live mode accepts only the unchanged plan plus its reviewed digest and ceilings.
            </p>
            <p>
              Hosted prompts go directly to the selected provider accounts. Model-judged cases also send target
              responses and interaction context to the selected judge. Provider logging, retention, billing, and
              training policies remain in force. The runner never uploads private evidence to Clawbotomy.
            </p>
            <p>
              Public export is a separate local file mutation. It requires a complete live bundle from a clean,
              committed source state and the exact private digest. Export redacts recognized candidates and writes
              a separately hashed artifact, but never commits, pushes, deploys, or contacts the site.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-16" aria-labelledby="current-surfaces">
        <SectionHeading id="current-surfaces">Current public surfaces</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentSurfaces.map((surface) => (
            <article key={surface.name} className="glow-card rounded-xl p-5 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="text-content-primary font-mono font-bold text-lg">{surface.name}</h3>
                <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs tracking-[0.03em] text-content-muted">{surface.status}</span>
              </div>
              <p className="text-content-secondary font-mono text-sm leading-relaxed">{surface.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-8" aria-labelledby="evidence-state">
        <SectionHeading id="evidence-state">Current evidence state</SectionHeading>
        <div className="glow-card rounded-xl p-5 md:p-6 space-y-3 text-content-secondary font-mono text-sm leading-relaxed">
          <p>
            The public registry contains three complete, maintainer-self-reported runs. Each includes a validated
            manifest, case records, summary, integrity metadata, and explicit non-authorizing status. One pair is
            comparable only because its prompt and implementation hashes, repeat count, coverage, scoring,
            reproducibility, and endpoint identity match.
          </p>
          <p>
            A digest detects changes to recorded files; it is not a signature, provider attestation, safety result,
            or proof of methodological quality. Public runs are task-specific observations, not universal model grades.
          </p>
          <p>
            No run auto-publishes. No result grants data access, tool access, write access, deployment approval, or
            autonomous-operation approval. Keep human review and independent platform controls around consequential actions.
          </p>
        </div>
      </section>
    </main>
  );
}
