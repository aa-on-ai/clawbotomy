import type { Metadata } from 'next';

import { evidenceLanes } from '@/lib/claim-registry';

import styles from '../editorial.module.css';

export const metadata: Metadata = {
  title: 'Documentation — Clawbotomy',
  description: 'How to connect OpenClaw or Hermes, validate private agent evidence, and run Clawbotomy benchmark workflows locally.',
};

const workflowCommands = [
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
    label: 'Authorize only the reviewed digest and ceilings',
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

const inboxCommands = [
  {
    label: 'Run the downloaded plan against the bounded reference agent',
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
    label: 'Validate and replay the private bundle',
    command: `INBOX_BUNDLE=.clawbotomy/inbox-runs/inbox-...

npm run inbox -- validate "$INBOX_BUNDLE"
npm run inbox -- replay "$INBOX_BUNDLE"
npm run inbox -- summarize "$INBOX_BUNDLE"`,
  },
];

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
  {
    label: 'Validate the completed protocol bundle',
    command: `npm run inbox -- validate .clawbotomy/inbox-runs/<runId>`,
  },
];

const steps = [
  {
    title: 'Clone and install',
    body: 'Clone the public repository, then run npm install. Clawbotomy is currently source software, not a published npm package.',
  },
  {
    title: 'Freeze the plan without provider calls',
    body: 'Choose a new private plan and bundle path. Preflight freezes source state, credential presence, models, cases, judge requests, pricing, and conservative request and cost bounds into one digest.',
  },
  {
    title: 'Review, then authorize the exact plan',
    body: 'Copy the plan digest, planned request count, and conservative cost upper bound from preflight. The bound uses the exact judge envelope and a plan-bound response ceiling. Live mode refuses selector overrides and aborts on drift.',
  },
  {
    title: 'Validate the private evidence offline',
    body: 'Verify the bundle digest, complete lifecycle, records, and request totals. Inspect individual responses and judge traces before aggregates.',
  },
  {
    title: 'Export only by separate decision',
    body: 'A confirmed export creates a redacted, separately hashed repository artifact. It never deploys, commits, pushes, or grants a model tool access.',
  },
];

const currentSurfaces = [
  {
    name: '/evaluate',
    status: 'Configured-agent workspace',
    description: 'Connects the accepted OpenClaw or Hermes bridge, explains pass/findings/infrastructure status, and derives an allowlisted local-only projection from private files selected by the operator.',
  },
  {
    name: '/preflight',
    status: 'Browser-local plan',
    description: 'Records intended Inbox capabilities and required scenarios before any agent runs. The exported plan remains non-authorizing and makes no permission decision.',
  },
  {
    name: '/bench',
    status: 'Model artifacts + legacy snapshot',
    description: 'Lists maintainer-reported model benchmark artifacts alongside a clearly separated March 2026 legacy snapshot that lacks raw case records.',
  },
  {
    name: '/evidence/index.json',
    status: 'Public evidence registry',
    description: 'Indexes explicit maintainer-reported benchmark exports accepted by the checked-in artifact validator. Every entry preserves its scope and remains non-authorizing.',
  },
];

const evidenceLaneOrder = [
  'synthetic-reference-control',
  'configured-agent-session',
  'deterministic-bundle-verification',
  'runtime-compatibility',
  'model-benchmark',
  'legacy-model-benchmark',
] as const;

export default function DocsPage() {
  return (
    <main className={`${styles.page} ${styles.pageWide} grid-bg`}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Current release / Local-first workflow</p>
          <h1 className={styles.title}>Documentation</h1>
        </div>
        <p className={styles.lede}>
          Plan intended Inbox powers in the browser, then run OpenClaw, Hermes, or a fixed reference
          control against the same synthetic Inbox. Configured-agent receipts remain private unless separately reviewed
          for publication. Every result remains non-authorizing.
        </p>
      </header>

      <section className="mb-16" aria-labelledby="evidence-lanes">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <h2 id="evidence-lanes" className="text-xs font-mono text-content-muted tracking-[0.04em] whitespace-nowrap">
            Evidence lanes
          </h2>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {evidenceLaneOrder.map((laneId) => (
            <article key={laneId} className="glow-card rounded-xl p-5 md:p-6">
              <h3 className="text-content-primary font-mono font-bold text-base mb-2">
                {evidenceLanes[laneId].publicLabel}
              </h3>
              <p className="text-content-secondary font-mono text-sm leading-relaxed">
                {evidenceLanes[laneId].description}
              </p>
            </article>
          ))}
        </div>
        <p className="mt-4 text-content-muted font-mono text-xs leading-relaxed">
          Exact-pin runtime compatibility is separate from configured-agent behavior. Model benchmark observations and the legacy snapshot are separate from both.
        </p>
      </section>

      <section className="mb-16" aria-labelledby="configured-agent-run">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <h2 id="configured-agent-run" className="text-xs font-mono text-content-muted tracking-[0.04em] whitespace-nowrap">
            Configured-agent run
          </h2>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>
        <div className="glow-card rounded-xl p-5 md:p-6 space-y-4">
          <p className="text-content-secondary font-mono text-sm leading-relaxed">
            Start at <a className="text-content-primary underline underline-offset-4" href="/evaluate">/evaluate</a>. The fixed launcher accepts only the checked-in OpenClaw and Hermes bridges and writes a separate private attempt receipt so process failure never masquerades as a finding.
          </p>
          {agentCommands.map((item) => (
            <div key={item.label} className="space-y-2">
              <p className="text-xs tracking-[0.04em] text-content-muted">{item.label}</p>
              <pre
                tabIndex={0}
                aria-label={`${item.label} command`}
                className="overflow-x-auto rounded-lg border border-[var(--border)] bg-surface-elevated p-4 text-xs text-content-primary"
              >
                <code>{item.command}</code>
              </pre>
            </div>
          ))}
          <p className="text-content-muted font-mono text-xs leading-relaxed">
            Exit 0 is passed. Exit 2 is a complete run with findings. Exit 1 remains a process anomaly; only one independently validated and replayed new bundle may retain its measured status. The browser viewer requires the launcher receipt that binds each displayed bundle, renders only closed-contract metadata, and never uploads the selected private files. It is an inspector after terminal validation, not the canonical verifier.
          </p>
        </div>
      </section>

      <section className="mb-16" aria-labelledby="inbox-reference-run">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <h2 id="inbox-reference-run" className="text-xs font-mono text-content-muted tracking-[0.04em] whitespace-nowrap">
            Inbox reference run
          </h2>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>
        <div className="glow-card rounded-xl p-5 md:p-6 space-y-4">
          <p className="text-content-secondary font-mono text-sm leading-relaxed">
            Download a plan from <a className="text-content-primary underline underline-offset-4" href="/preflight">/preflight</a>. The local runner expands it into isolated cases, executes fixed in-memory tools, and writes replayable private evidence. It never connects to a mailbox or loads the configuration reference.
          </p>
          {inboxCommands.map((item) => (
            <div key={item.label} className="space-y-2">
              <p className="text-xs tracking-[0.04em] text-content-muted">{item.label}</p>
              <pre
                tabIndex={0}
                aria-label={`${item.label} command`}
                className="overflow-x-auto rounded-lg border border-[var(--border)] bg-surface-elevated p-4 text-xs text-content-primary"
              >
                <code>{item.command}</code>
              </pre>
            </div>
          ))}
          <p className="text-content-muted font-mono text-xs leading-relaxed">
            Bounded and overreach remain reference-only controls. Adapter evidence applies only to
            the exact embedded policy document. Neither path executes a deployed agent. Every path
            is non-authorizing and leaves production access unchanged.
          </p>
        </div>
      </section>

      <section className="mb-16" aria-labelledby="quick-start">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <h2 id="quick-start" className="text-xs font-mono text-content-muted tracking-[0.04em] whitespace-nowrap">
            Quick start
          </h2>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>
        <div className="glow-card rounded-xl p-5 md:p-6 space-y-5">
          {steps.map((step, index) => (
            <div key={step.title} className="flex gap-3 md:gap-4">
              <span className="text-emerald-600 dark:text-emerald-500/60 font-mono text-sm tabular-nums" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="text-content-primary font-mono text-sm font-bold mb-1">{step.title}</h3>
                <p className="text-content-secondary font-mono text-sm leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
          <div className="space-y-4">
            {workflowCommands.map((item) => (
              <div key={item.label} className="space-y-2">
                <p className="text-xs tracking-[0.04em] text-content-muted">{item.label}</p>
                <pre
                  tabIndex={0}
                  aria-label={`${item.label} command`}
                  className="overflow-x-auto rounded-lg border border-[var(--border)] bg-surface-elevated p-4 text-xs text-content-primary"
                >
                  <code>{item.command}</code>
                </pre>
              </div>
            ))}
          </div>
          <p className="text-content-muted font-mono text-xs leading-relaxed">
            Credential presence is part of the plan digest. Keep it unchanged between preflight and live execution. If public export may be needed, start from a clean, committed source state.
          </p>
        </div>
      </section>

      <section className="mb-16" aria-labelledby="what-exists">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <h2 id="what-exists" className="text-xs font-mono text-content-muted tracking-[0.04em] whitespace-nowrap">
            What exists today
          </h2>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentSurfaces.map((surface) => (
            <article key={surface.name} className="glow-card rounded-xl p-5 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="text-content-primary font-mono font-bold text-lg">{surface.name}</h3>
                <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs tracking-[0.03em] text-content-muted">
                  {surface.status}
                </span>
              </div>
              <p className="text-content-secondary font-mono text-sm leading-relaxed">{surface.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-16" aria-labelledby="interpretation">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <h2 id="interpretation" className="text-xs font-mono text-content-muted tracking-[0.04em] whitespace-nowrap">
            Interpretation rules
          </h2>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>
        <div className="glow-card rounded-xl p-5 md:p-6 space-y-3 text-content-secondary font-mono text-sm leading-relaxed">
          <p>Scores summarize performance on the included prompts, scorer, models, and run settings. They do not prove general safety or reliability.</p>
          <p>Provisional values are placeholders for policy exploration. Do not present them as benchmark results.</p>
          <p>Do not convert an aggregate score into an access or routing decision.</p>
          <p>A valid bundle digest shows that recorded files match the validator&apos;s expected bytes. It does not establish methodological correctness or general model safety.</p>
          <p>No benchmark result authorizes tool access, write access, deployment, or autonomous operation.</p>
        </div>
      </section>

      <section className="mb-8" aria-labelledby="next">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <h2 id="next" className="text-xs font-mono text-content-muted tracking-[0.04em] whitespace-nowrap">
            Evidence state
          </h2>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>
        <div className="glow-card rounded-xl p-5 md:p-6">
          <p className="text-content-secondary font-mono text-sm leading-relaxed">
            The bundle lifecycle and schemas are implemented, and{' '}
            <a className="text-content-primary underline underline-offset-4" href="/evidence/index.json">
              public/evidence/index.json
            </a>{' '}
            lists the current maintainer-reported model benchmark artifacts accepted by the checked-in artifact validator. Each export remains non-authorizing. The separate March 2026 snapshot remains legacy evidence without raw case artifacts. No run auto-publishes: export writes local repository files only, which still require review and a separate commit, push, or deploy decision. Inspect the complete runner on{' '}
            <a className="text-content-primary underline underline-offset-4" href="https://github.com/aa-on-ai/clawbotomy" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
