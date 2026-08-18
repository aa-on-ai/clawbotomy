import type { Metadata } from 'next';
import type { ReactNode } from 'react';

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
    label: 'Preflight a local OpenClaw evaluation',
    command: `npm run agent:preflight -- \\
  --plan /path/to/clawbotomy-inbox-support-agent.json \\
  --model ollama/qwen3:1.7b \\
  --openclaw-bin /path/to/openclaw.mjs \\
  --expected-openclaw-runtime-sha256 replace-with-independent-runtime-sha256 \\
  --expected-provider-runtime-sha256 replace-with-independent-provider-sha256`,
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

type CommandItem = { label: string; command: string };

function DocsSection({ index, id, title, children }: {
  index: string;
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.docsSection} aria-labelledby={id}>
      <div className={styles.docsSectionHeading}>
        <span aria-hidden="true">{index}</span>
        <h2 id={id}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function CommandList({ commands }: { commands: readonly CommandItem[] }) {
  return (
    <div className={styles.docsCommands}>
      {commands.map((item) => (
        <div key={item.label} className={styles.docsCommand}>
          <p>{item.label}</p>
          <pre tabIndex={0} aria-label={`${item.label} command`}><code>{item.command}</code></pre>
        </div>
      ))}
    </div>
  );
}

export default function DocsPage() {
  return (
    <main className={`${styles.page} ${styles.pageWide} ${styles.docsPage} grid-bg`}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Current release / Local-first workflow</p>
          <h1 className={styles.title}>Documentation</h1>
        </div>
        <p className={styles.lede} data-reading-copy>
          Plan intended Inbox powers in the browser, then run OpenClaw, Hermes, or a fixed reference
          control against the same synthetic Inbox. Configured-agent receipts remain private unless separately reviewed
          for publication. Every result remains non-authorizing.
        </p>
      </header>

      <DocsSection index="01" id="evidence-lanes" title="Evidence lanes">
        <div className={styles.docsRows}>
          {evidenceLaneOrder.map((laneId) => (
            <article key={laneId}>
              <h3>{evidenceLanes[laneId].publicLabel}</h3>
              <p data-reading-copy>{evidenceLanes[laneId].description}</p>
            </article>
          ))}
        </div>
        <p className={styles.docsFootnote} data-reading-copy>
          Exact-pin runtime compatibility is separate from configured-agent behavior. Model benchmark observations and the legacy snapshot are separate from both.
        </p>
      </DocsSection>

      <DocsSection index="02" id="configured-agent-run" title="Configured-agent run">
        <div className={styles.docsPanel}>
          <p className={styles.docsIntro} data-reading-copy>
            Start at <a href="/evaluate">/evaluate</a>. Load either checked-in reference control to learn the inspector without a configured agent. For OpenClaw, the preflight command stages a downloaded plan, resolves the canonical runtime, validates independent pins, checks provider-profile selection, and then prints the fixed launcher command.
          </p>
          <CommandList commands={agentCommands} />
          <p className={styles.docsFootnote} data-reading-copy>
            Exit 0 is passed. Exit 2 is a complete run with findings. Exit 1 remains a process anomaly; only one independently validated and replayed new bundle may retain its measured status. The browser viewer requires the launcher receipt that binds each displayed bundle, renders only closed-contract metadata, and never uploads the selected private files. It is an inspector after terminal validation, not the canonical verifier.
          </p>
        </div>
      </DocsSection>

      <DocsSection index="03" id="inbox-reference-run" title="Inbox reference run">
        <div className={styles.docsPanel}>
          <p className={styles.docsIntro} data-reading-copy>
            Download a plan from <a href="/preflight">/preflight</a>. The local runner expands it into isolated cases, executes fixed in-memory tools, and writes replayable private evidence. It never connects to a mailbox or loads the configuration reference.
          </p>
          <CommandList commands={inboxCommands} />
          <p className={styles.docsFootnote} data-reading-copy>
            Bounded and overreach remain reference-only controls. Adapter evidence applies only to the exact embedded policy document. Neither path executes a deployed agent. Every path is non-authorizing and leaves production access unchanged.
          </p>
        </div>
      </DocsSection>

      <DocsSection index="04" id="quick-start" title="Quick start">
        <div className={styles.docsSteps}>
          {steps.map((step, index) => (
            <article key={step.title}>
              <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3>{step.title}</h3>
                <p data-reading-copy>{step.body}</p>
              </div>
            </article>
          ))}
        </div>
        <CommandList commands={workflowCommands} />
        <p className={styles.docsFootnote} data-reading-copy>
          Credential presence is part of the plan digest. Keep it unchanged between preflight and live execution. If public export may be needed, start from a clean, committed source state.
        </p>
      </DocsSection>

      <DocsSection index="05" id="what-exists" title="What exists today">
        <div className={styles.docsRows}>
          {currentSurfaces.map((surface) => (
            <article key={surface.name}>
              <div className={styles.docsSurfaceTitle}>
                <h3>{surface.name}</h3>
                <span>{surface.status}</span>
              </div>
              <p data-reading-copy>{surface.description}</p>
            </article>
          ))}
        </div>
      </DocsSection>

      <DocsSection index="06" id="interpretation" title="Interpretation rules">
        <div className={styles.docsRules}>
          <p data-reading-copy>Scores summarize performance on the included prompts, scorer, models, and run settings. They do not prove general safety or reliability.</p>
          <p data-reading-copy>Provisional values are placeholders for policy exploration. Do not present them as benchmark results.</p>
          <p data-reading-copy>Do not convert an aggregate score into an access or routing decision.</p>
          <p data-reading-copy>A valid bundle digest shows that recorded files match the validator&apos;s expected bytes. It does not establish methodological correctness or general model safety.</p>
          <p data-reading-copy>No benchmark result authorizes tool access, write access, deployment, or autonomous operation.</p>
        </div>
      </DocsSection>

      <DocsSection index="07" id="next" title="Evidence state">
        <div className={styles.docsEvidenceNote}>
          <p data-reading-copy>
            The bundle lifecycle and schemas are implemented, and <a href="/evidence/index.json">public/evidence/index.json</a> lists the current maintainer-reported model benchmark artifacts accepted by the checked-in artifact validator. Each export remains non-authorizing. The separate March 2026 snapshot remains legacy evidence without raw case artifacts. No run auto-publishes: export writes local repository files only, which still require review and a separate commit, push, or deploy decision. Inspect the complete runner on <a href="https://github.com/aa-on-ai/clawbotomy" target="_blank" rel="noopener noreferrer">GitHub</a>.
          </p>
        </div>
      </DocsSection>
    </main>
  );
}
