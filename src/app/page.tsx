import Link from 'next/link';

import { loadPublicEvidenceIndex } from '@/lib/public-evidence.server';

import styles from './home.module.css';

const workflow = [
  {
    index: '01',
    title: 'Plan requested powers',
    copy: 'Use /preflight to describe the Inbox capabilities under review and download a versioned plan. The planner stays in the browser and does not run an agent.',
    href: '/preflight',
    action: 'Open Plan',
  },
  {
    index: '02',
    title: 'Evaluate the exact runtime',
    copy: 'Run the checked-in OpenClaw or Hermes bridge locally against a fixed synthetic Inbox. The result applies only to that configuration and observed session.',
    href: '/evaluate',
    action: 'Open Evaluate',
  },
  {
    index: '03',
    title: 'Review bounded evidence',
    copy: 'Inspect private receipts with browser-local review, then compare only compatible public exports. Clawbotomy does not change real-world controls.',
    href: '/bench',
    action: 'Open Evidence',
  },
];

const outcomes = [
  {
    title: 'Findings',
    copy: 'One or more fixed fixture assertions failed. Review the exact case receipts and rerun after a bounded change.',
  },
  {
    title: 'No finding in fixture',
    copy: 'The observed session completed without a failed fixture assertion. This is not a claim about behavior outside that run.',
  },
  {
    title: 'Inconclusive',
    copy: 'The process, receipt binding, validation, replay, or evidence set was incomplete or ambiguous. Do not turn it into a result.',
  },
];

export default function HomePage() {
  const registry = loadPublicEvidenceIndex();
  const runs = registry.runs.slice().sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const latestRun = runs[0] || null;

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.rail}>
          <div className={styles.heroLayout}>
            <div>
              <p className={styles.eyebrow}>Local-first execution · Browser-local review</p>
              <h1 id="home-title">Test the configured agent, not the idea of one.</h1>
              <p className={styles.lede}>
                Plan requested powers at <code>/preflight</code>, evaluate the exact OpenClaw or Hermes runtime at <code>/evaluate</code>, and review bounded evidence under <code>/bench</code>.
              </p>
              <div className={styles.actions}>
                <Link href="/preflight" className={styles.primaryAction}>Plan requested powers</Link>
                <Link href="/evaluate" className={styles.secondaryAction}>Evaluate a runtime</Link>
              </div>
            </div>

            <aside className={styles.registry} aria-label="Current public evidence registry">
              <span className={styles.registryCount}>{runs.length}</span>
              <h2>Public evidence runs</h2>
              <p>Three current exports are available for bounded review. Each run keeps its exact plan, cases, status, and integrity files visible.</p>
              {latestRun ? (
                <Link href={`/bench/runs/${latestRun.runId}`}>Inspect latest run →</Link>
              ) : null}
              <a href="/evidence/index.json">Read the machine index →</a>
            </aside>
          </div>
        </div>
      </section>

      <section className={styles.workflow} aria-labelledby="workflow-title">
        <div className={styles.rail}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>Current product</p>
            <h2 id="workflow-title">Plan → Evaluate → Evidence</h2>
            <p>One narrow path from declared intent to configured-runtime observation to reviewable artifacts.</p>
          </div>
          <ol className={styles.workflowList}>
            {workflow.map((step) => (
              <li key={step.index}>
                <span>{step.index}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </div>
                <Link href={step.href}>{step.action} →</Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={styles.outcomes} aria-labelledby="outcomes-title">
        <div className={styles.rail}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>Result language</p>
            <h2 id="outcomes-title">Keep the claim inside the fixture.</h2>
            <p>Configured-agent runs use three review states. None describes behavior beyond the exact runtime, plan, and observed session.</p>
          </div>
          <div className={styles.outcomeGrid}>
            {outcomes.map((outcome) => (
              <article key={outcome.title}>
                <h3>{outcome.title}</h3>
                <p>{outcome.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.evidence} aria-labelledby="evidence-title">
        <div className={styles.rail}>
          <div>
            <p className={styles.eyebrow}>Public registry · {runs.length} runs</p>
            <h2 id="evidence-title">Review the artifacts, then the comparison.</h2>
          </div>
          <div>
            <p>
              The current registry retains three complete public evidence exports and one bounded compatible comparison. Run pages expose the scope and constituent records before any aggregate interpretation.
            </p>
            <div className={styles.evidenceLinks}>
              <Link href="/bench">Browse current evidence</Link>
              <Link href="/docs">Read operator docs</Link>
              <Link href="/about">About the method</Link>
              <a href="/api/bench">Open registry API</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
