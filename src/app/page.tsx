import Link from 'next/link';

import { benchData } from '@/lib/bench-data';
import { loadPublicEvidenceIndex } from '@/lib/public-evidence.server';

import styles from './home.module.css';

const evidenceSteps = [
  {
    index: '01',
    title: 'Freeze the plan',
    copy: 'Resolve exact targets, judges, task hashes, provider calls, a cost ceiling, and a digest before any network request.',
    field: 'clawbotomy.benchmark-plan/v1',
  },
  {
    index: '02',
    title: 'Run the cases',
    copy: 'Write private case records incrementally. Missing, failed, or unknown-after-send calls remain coverage failures—not hidden zeros.',
    field: 'clawbotomy.case-record/v1',
  },
  {
    index: '03',
    title: 'Record the trace',
    copy: 'Keep requested and provider-reported model identity, allowlisted request bodies, timing, usage, judge output, and scoring state.',
    field: 'requestedModelId ≠ reportedModelId',
  },
  {
    index: '04',
    title: 'Verify the bundle',
    copy: 'Regenerate aggregates from constituent cases and verify exact-byte SHA-256 integrity before treating the artifact as internally consistent.',
    field: 'clawbotomy.integrity/v1',
  },
  {
    index: '05',
    title: 'Export separately',
    copy: 'A public artifact is a distinct, explicit, redacted export. It never appears automatically and never authorizes production access.',
    field: 'authorization / non-authorizing',
  },
];

export default function HomePage() {
  const publicEvidence = loadPublicEvidenceIndex();
  const latestRun = publicEvidence.runs.slice().sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0] || null;

  return (
    <main className={styles.homePage}>
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={styles.rail}>
          <div className={styles.heroLayout}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Planning preview · Source only · Non-authorizing</p>
              <h1 id="home-title">Grant tools slowly.<br />Demand evidence first.</h1>
              <p className={styles.heroSummary}>
                Define the powers an agent is asking for, turn them into concrete test scenarios,
                and keep intent separate from evidence before permissions or routing change.
              </p>
              <div className={styles.heroActions}>
                <Link href="/preflight" className={styles.primaryAction}>Plan an Inbox preflight</Link>
                <a
                  href="https://github.com/aa-on-ai/clawbotomy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.secondaryAction}
                >
                  View source ↗
                </a>
              </div>
              <p className={styles.heroFootnote}>
                The planner runs in your browser. It sends nothing, runs no agent, and changes no production access.
              </p>
            </div>

            <aside className={styles.registry} aria-label="Public evidence registry status">
              <div className={styles.registrySignal} aria-hidden="true">
                <strong>{String(publicEvidence.runs.length).padStart(2, '0')}</strong>
                <span>Public evidence runs<br />published</span>
              </div>
              <div className={styles.registryHeader}>
                <span>Public evidence registry</span>
                <span>Live state</span>
              </div>
              <dl>
                <div>
                  <dt>Published bundles</dt>
                  <dd>{publicEvidence.runs.length}</dd>
                </div>
                <div>
                  <dt>Latest public evidence run</dt>
                  <dd>{latestRun?.runId || 'Awaiting first run'}</dd>
                </div>
                <div>
                  <dt>March snapshot</dt>
                  <dd>Legacy · Summary only</dd>
                </div>
                <div>
                  <dt>Publication</dt>
                  <dd>Explicit export only</dd>
                </div>
                <div>
                  <dt>Authorization</dt>
                  <dd>Non-authorizing</dd>
                </div>
              </dl>
              <a href="/evidence/index.json" className={styles.registryLink}>
                Read machine index <span>→</span>
              </a>
            </aside>
          </div>
        </div>

        <div className={styles.signalStrip} aria-label="Evidence pipeline properties">
          <span>Private by default</span>
          <span>Digest-bound plan</span>
          <span>Request + cost caps</span>
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
            <a href="/evidence/schema/benchmark-plan.v1.schema.json">plan.json</a>
            <a href="/evidence/schema/case-record.v1.schema.json">case-record.json</a>
            <a href="/evidence/schema/summary.v1.schema.json">summary.json</a>
            <a href="/evidence/schema/integrity.v1.schema.json">integrity.json</a>
          </div>
        </div>
      </section>

      <section className={styles.boundary} aria-labelledby="boundary-title">
        <div className={styles.rail}>
          <div className={styles.boundaryHeader}>
            <div>
              <p className={styles.lightEyebrow}>Target policy model · In development</p>
              <h2 id="boundary-title">Turn evidence into a permission boundary.</h2>
            </div>
            <p>
              This is the intended decision shape, not an active authorization service. The bundled examples remain provisional.
            </p>
          </div>

          <div className={styles.boundaryRows}>
            <article>
              <span className={styles.allow}>Allow</span>
              <h3>Independent work</h3>
              <p>Complete, repeatable evidence clears every task-specific floor and no critical failure is present.</p>
            </article>
            <article>
              <span className={styles.approval}>Approval</span>
              <h3>Human-gated work</h3>
              <p>The model may help, but consequences, uncertainty, or incomplete reproduction require an explicit review.</p>
            </article>
            <article>
              <span className={styles.block}>Block</span>
              <h3>Do not route</h3>
              <p>A critical dimension fails, evidence is incomplete, identity drifts, or the deployment differs from what was tested.</p>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.annex} aria-labelledby="annex-title">
        <div className={styles.rail}>
          <div className={styles.sectionIntroCompact}>
            <p className={styles.darkEyebrow}>Research surfaces</p>
            <h2 id="annex-title">Inspect the method.<br />Keep the limits visible.</h2>
          </div>

          <div className={styles.annexGrid}>
            <Link href="/bench" className={styles.annexLead}>
              <span>01 · Evidence</span>
              <h3>Benchmark registry</h3>
              <p>
                The public evidence registry is currently empty. The {benchData.lastUpdated} scores remain a low-confidence,
                maintainer-reported legacy summary because their raw cases were not published.
              </p>
              <strong>Inspect evidence and legacy data →</strong>
            </Link>

            <div className={styles.annexStack}>
              <Link href="/trust">
                <span>02 · Trust</span>
                <h3>Critical floors before averages</h3>
                <strong>Inspect example report →</strong>
              </Link>
              <Link href="/routing">
                <span>03 · Routing</span>
                <h3>Reviewable allow, approval, and block decisions</h3>
                <strong>Inspect example policy →</strong>
              </Link>
            </div>

            <Link href="/lab" className={styles.labAnnex}>
              <span>04 · Qualitative annex</span>
              <h3>Behavioral probes</h3>
              <p>Model-authored creative artifacts made with a shared prompt recipe. Exploratory—not scored evidence.</p>
              <strong>Enter the lab →</strong>
            </Link>
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
