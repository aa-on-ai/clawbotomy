import Link from 'next/link';

import styles from './home.module.css';

const evidenceSteps = [
  {
    index: '01',
    title: 'Build the plan',
    copy: 'Choose the synthetic Inbox powers and scenarios the configured agent should be tested against.',
    field: 'clawbotomy.inbox-preflight-plan/v1',
  },
  {
    index: '02',
    title: 'Run the configured agent',
    copy: 'Launch the checked-in OpenClaw or Hermes bridge as the parent of Clawbotomy’s fixed synthetic-Inbox protocol.',
    field: 'stdio-jsonl/v1',
  },
  {
    index: '03',
    title: 'Record what happened',
    copy: 'Keep the allowed tool attempts, synthetic state changes, assertion results, and process status tied to one session.',
    field: 'clawbotomy.inbox-protocol-case-record/v1',
  },
  {
    index: '04',
    title: 'Separate failure types',
    copy: 'Keep agent findings distinct from missing, incomplete, or failed test infrastructure. Invalid runs do not become scores.',
    field: 'passed / findings / infrastructure-failure',
  },
  {
    index: '05',
    title: 'Review before deciding',
    copy: 'Inspect the bound receipt locally. Any permission or deployment change remains a separate human decision.',
    field: 'permissionDecision: null',
  },
];

export default function HomePage() {
  return (
    <main className={styles.homePage}>
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={styles.rail}>
          <div className={styles.heroLayout}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Configured-agent evidence · Browser local · Non-authorizing</p>
              <h1 id="home-title">Grant tools slowly.<br />Demand evidence first.</h1>
              <p className={styles.heroSummary}>
                Run a private behavior checkup against the configured OpenClaw or Hermes runtime you
                actually operate, then inspect the evidence before permissions or routing change.
              </p>
              <div className={styles.heroActions}>
                <Link href="/evaluate" className={styles.primaryAction}>Connect and evaluate</Link>
                <Link href="/checkups" className={styles.secondaryAction}>Choose a checkup</Link>
              </div>
              <p className={styles.heroFootnote}>
                <Link href="/preflight">Build the plan in your browser.</Link>{' '}
                Private-file inspection stays local. No real mailbox is connected and no run authorizes production access.
              </p>
            </div>

            <aside className={styles.registry} aria-label="Configured-agent checkup boundary">
              <div className={styles.registrySignal} aria-hidden="true">
                <strong>01</strong>
                <span>Observed session<br />scoped evidence</span>
              </div>
              <div className={styles.registryHeader}>
                <span>Checkup boundary</span>
                <span>Current contract</span>
              </div>
              <dl>
                <div>
                  <dt>Runtime</dt>
                  <dd>OpenClaw + Hermes</dd>
                </div>
                <div>
                  <dt>Real mailbox</dt>
                  <dd>Never connected</dd>
                </div>
                <div>
                  <dt>Private evidence</dt>
                  <dd>Browser local</dd>
                </div>
                <div>
                  <dt>Permission decision</dt>
                  <dd>None</dd>
                </div>
              </dl>
              <Link href="/about" className={styles.registryLink}>Read the boundary <span>→</span></Link>
            </aside>
          </div>
        </div>

        <div className={styles.signalStrip} aria-label="Evidence pipeline properties">
          <span>Private by default</span>
          <span>Fixed agent adapters</span>
          <span>Digest-bound plan</span>
          <span>Integrity check</span>
          <span>Explicit public export</span>
        </div>
      </section>

      <section className={styles.chain} aria-labelledby="chain-title">
        <div className={styles.rail}>
          <div className={styles.sectionIntro}>
            <p className={styles.darkEyebrow}>The evidence chain</p>
            <h2 id="chain-title">Evidence is a chain,<br />not a score.</h2>
            <p>
              A ranking without its plan, cases, identities, failures, and review state is not enough to change what an agent can do.
            </p>
          </div>

          <ol className={styles.chainList}>
            {evidenceSteps.map((step) => (
              <li key={step.index}>
                <span className={styles.stepIndex}>[{step.index}]</span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
                <code>{step.field}</code>
              </li>
            ))}
          </ol>

          <div className={styles.schemaLinks}>
            <span>Schema surface</span>
            <a href="/evidence/schema/inbox-preflight-plan.v1.schema.json">plan.json</a>
            <a href="/evidence/schema/inbox-protocol-frame.v1.schema.json">protocol.json</a>
            <a href="/evidence/schema/inbox-protocol-case-record.v1.schema.json">case-record.json</a>
            <a href="/evidence/schema/inbox-protocol-run-summary.v1.schema.json">summary.json</a>
          </div>
        </div>
      </section>

      <section className={styles.boundary} aria-labelledby="boundary-title">
        <div className={styles.rail}>
          <div className={styles.boundaryHeader}>
            <div>
              <p className={styles.lightEyebrow}>Human decision boundary</p>
              <h2 id="boundary-title">Keep evidence separate from permission.</h2>
            </div>
            <p>A checkup can show what happened in one synthetic session. It cannot decide what the agent should be allowed to do next.</p>
          </div>

          <div className={styles.boundaryRows}>
            <article>
              <span className={styles.allow}>Observe</span>
              <h3>Run the fixed checkup</h3>
              <p>Exercise one configured runtime against the project-owned synthetic Inbox.</p>
            </article>
            <article>
              <span className={styles.approval}>Review</span>
              <h3>Inspect the receipt</h3>
              <p>Separate agent findings from infrastructure failure and keep the evidence tied to the observed run.</p>
            </article>
            <article>
              <span className={styles.block}>Decide</span>
              <h3>Keep the human in charge</h3>
              <p>Use the evidence as review input. Permission and deployment changes remain separate decisions.</p>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.annex} aria-labelledby="annex-title">
        <div className={styles.rail}>
          <div className={styles.sectionIntroCompact}>
            <p className={styles.darkEyebrow}>Evidence surfaces</p>
            <h2 id="annex-title">Inspect the method.<br />Keep the limits visible.</h2>
          </div>

          <div className={styles.annexGrid}>
            <Link href="/bench" className={styles.annexLead}>
              <span>01 · Evidence</span>
              <h3>Benchmark registry</h3>
              <p>
                Inspect the reviewed public benchmark exports and their limits. Configured-agent receipts remain private unless an operator separately publishes a sanitized artifact.
              </p>
              <strong>Inspect evidence and legacy data →</strong>
            </Link>

            <div className={styles.annexStack}>
              <Link href="/docs">
                <span>02 · Run locally</span>
                <h3>Inspect the fixed protocol and evidence workflow</h3>
                <strong>Read the operator guide →</strong>
              </Link>
              <Link href="/about">
                <span>03 · Method</span>
                <h3>Understand what one checkup can claim</h3>
                <strong>Read the boundary →</strong>
              </Link>
            </div>
          </div>

          <div className={styles.annexLinks}>
            <Link href="/docs">Run locally</Link>
            <Link href="/about">Read the methodology</Link>
            <a href="/api/bench">Open the benchmark API</a>
          </div>
        </div>
      </section>
    </main>
  );
}
