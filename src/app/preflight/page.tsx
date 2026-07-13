import type { Metadata } from 'next';

import { InboxPreflightPlanner } from './InboxPreflightPlanner';
import styles from './preflight.module.css';

export const metadata: Metadata = {
  title: 'Plan an Inbox Preflight — Clawbotomy',
  description: 'Define intended Inbox powers and export a browser-local, non-authorizing scenario plan before connecting a real agent or mailbox.',
};

const planningFacts = [
  ['Agent execution', 'None'],
  ['Evidence collected', 'None'],
  ['Network requests', 'Zero'],
  ['Production access', 'Unchanged'],
];

export default function PreflightPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="preflight-title">
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={styles.rail}>
          <div className={styles.heroLayout}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Planning preview · Inbox pack · Browser local</p>
              <h1 id="preflight-title">Define the powers before you test them.</h1>
              <p>
                Choose what an agent may read or change. Clawbotomy turns that intent into a
                concrete mock-Inbox scenario plan you can inspect, copy, and keep.
              </p>
            </div>

            <aside className={styles.boundaryNotice} aria-label="Current planning boundary">
              <div className={styles.boundaryTitle}>
                <span>Current state</span>
                <strong>Planning only</strong>
              </div>
              <dl>
                {planningFacts.map(([term, value]) => (
                  <div key={term}>
                    <dt>{term}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <p>No score. No permission decision. No authorization.</p>
            </aside>
          </div>
        </div>
        <div className={styles.truthStrip} aria-label="Preflight planner properties">
          <span>Nothing uploaded</span>
          <span>No mailbox connected</span>
          <span>Operator intent recorded</span>
          <span>Decision remains empty</span>
        </div>
      </section>

      <section className={styles.plannerSection} aria-label="Inbox preflight planner">
        <div className={styles.rail}>
          <InboxPreflightPlanner />
        </div>
      </section>

      <section className={styles.nextSection} aria-labelledby="next-title">
        <div className={styles.rail}>
          <div className={styles.nextIntro}>
            <p className={styles.darkEyebrow}>What this unlocks next</p>
            <h2 id="next-title">A testable contract, not a trust score.</h2>
            <p>
              The exported plan is now input to a deterministic local runner. It records real mock
              tool attempts and state changes for bundled controls or one allowlisted policy adapter
              without touching a real Inbox.
            </p>
          </div>
          <ol className={styles.nextSteps}>
            <li><span>01</span><strong>Plan</strong><p>Record intended capabilities and approval boundaries.</p></li>
            <li><span>02</span><strong>Run</strong><p>Replay every required case against the bundled reference agent in a fresh mock Inbox.</p></li>
            <li><span>03</span><strong>Validate</strong><p>Recompute claims, tool results, state transitions, findings, and bundle digests.</p></li>
            <li><span>04</span><strong>Compare</strong><p>Run a separate declarative policy config through the allowlisted adapter. No deployed agent or module is loaded.</p></li>
          </ol>
        </div>
      </section>
    </main>
  );
}
