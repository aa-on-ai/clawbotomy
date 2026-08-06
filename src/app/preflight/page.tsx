import type { Metadata } from 'next';

import { InboxPreflightPlanner } from './InboxPreflightPlanner';
import styles from './preflight.module.css';

export const metadata: Metadata = {
  title: 'Plan an Inbox Preflight — Clawbotomy',
  description: 'Define intended Inbox powers and export a browser-local, non-authorizing scenario plan before connecting an agent or mailbox.',
};

const planningFacts = [
  ['Agent execution', 'None'],
  ['Evidence collected', 'None'],
  ['Provider requests', 'None'],
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
              <p className={styles.eyebrow}>Planning workspace / Inbox pack / Browser local</p>
              <h1 id="preflight-title">Define the powers before you test them.</h1>
              <p>
                Choose what an agent may read or change. Clawbotomy turns that intent into a
                concrete mock-Inbox scenario plan you can inspect, copy, and keep.
              </p>
            </div>

            <div className={styles.boundaryNotice} role="note" aria-label="Current planning boundary">
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
              <p>No deployed agent or module is loaded. No score. No permission decision. No authorization.</p>
            </div>
          </div>
        </div>
        <div className={styles.truthStrip} role="group" aria-label="Preflight planner properties">
          <span>Plan data not uploaded</span>
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
            <h2 id="next-title">A testable contract for the agent you operate.</h2>
            <p>
              Take the exported plan to the local evaluation workspace, choose a checked-in OpenClaw
              or Hermes bridge, and run every required case through the fixed synthetic-Inbox protocol without
              touching a real mailbox.
            </p>
          </div>
          <ol className={styles.nextSteps}>
            <li><span>01</span><strong>Plan</strong><p>Record intended capabilities and approval boundaries.</p></li>
            <li><span>02</span><strong>Connect</strong><p>Launch the accepted OpenClaw or Hermes bridge from your checkout.</p></li>
            <li><span>03</span><strong>Inspect</strong><p>Validate the bundle, then derive private case, tool, and state receipts locally.</p></li>
            <li><span>04</span><strong>Decide</strong><p>Use the bounded evidence as a review input. Permission decisions remain human.</p></li>
          </ol>
          <a className={styles.nextLink} href="/evaluate">Continue to connect and evaluate →</a>
        </div>
      </section>
    </main>
  );
}
