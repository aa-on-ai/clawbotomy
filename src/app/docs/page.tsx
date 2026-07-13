import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation — Clawbotomy',
  description: 'How to freeze, authorize, validate, and optionally export a Clawbotomy evidence bundle locally.',
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
    name: '/preflight',
    status: 'Plan + local mock runs',
    description: 'Records intended Inbox capabilities, then feeds deterministic reference controls or one allowlisted policy adapter with real mock tool and state evidence. The deployed agent remains uninspected and no permission decision exists.',
  },
  {
    name: '/bench',
    status: 'Legacy summary',
    description: 'A maintainer-reported March 2026 summary without the raw case artifacts required for independent reproduction. It predates the evidence-bundle workflow.',
  },
  {
    name: '/evidence/index.json',
    status: 'Empty registry',
    description: 'The public evidence index currently contains zero runs. Future entries must be explicit exports of complete live bundles and remain non-authorizing.',
  },
  {
    name: '/routing',
    status: 'Decision example',
    description: 'A transparent routing policy that distinguishes maintainer-reported and provisional inputs and fails closed on critical tasks.',
  },
  {
    name: '/trust',
    status: 'Derived example',
    description: 'A trust-oriented view generated from the same routing evidence. It is not an independent certification.',
  },
  {
    name: '/lab',
    status: 'Prompt library',
    description: 'Creative prompt lenses and recorded outputs for qualitative exploration. These are not scored assessments.',
  },
];

export default function DocsPage() {
  return (
    <main className="grid-bg min-h-screen">
      <header className="mb-12 mt-4 text-center">
        <p className="hero-status-v5 mx-auto mb-5">Current release · research preview</p>
        <h1 className="text-4xl md:text-5xl font-mono font-bold tracking-tighter text-content-primary mb-4">
          Documentation
        </h1>
        <p className="text-content-secondary font-mono text-sm max-w-2xl mx-auto leading-relaxed">
          Plan intended Inbox powers in the browser, then run bundled reference controls or one
          allowlisted declarative policy against the mock Inbox. Neither path executes a deployed agent.
        </p>
      </header>

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
              <pre className="overflow-x-auto rounded-lg border border-[var(--border)] bg-surface-elevated p-4 text-xs text-content-primary">
                <code>{item.command}</code>
              </pre>
            </div>
          ))}
          <p className="text-content-muted font-mono text-xs leading-relaxed">
            Bounded and overreach remain reference-only controls. Adapter evidence applies only to
            the exact embedded policy document. Every path is non-authorizing and leaves production access unchanged.
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
                <pre className="overflow-x-auto rounded-lg border border-[var(--border)] bg-surface-elevated p-4 text-xs text-content-primary">
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
          <p>A critical dimension at or below the routing floor blocks autonomous use even when an average score is high.</p>
          <p>A valid bundle digest proves recorded-file integrity, not methodological correctness or general model safety.</p>
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
            The bundle lifecycle and schemas are implemented, but{' '}
            <a className="text-content-primary underline underline-offset-4" href="/evidence/index.json">
              public/evidence/index.json
            </a>{' '}
            is currently empty. The March 2026 benchmark remains a legacy summary without raw case artifacts. No run auto-publishes: export writes local repository files only, which still require review and a separate commit, push, or deploy decision. Inspect the complete runner on{' '}
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
