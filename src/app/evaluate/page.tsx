import type { Metadata } from 'next';
import Link from 'next/link';

import { AgentEvaluationWorkbench } from './AgentEvaluationWorkbench';
import styles from './evaluate.module.css';

export const metadata: Metadata = {
  title: 'Connect and Evaluate an Agent — Clawbotomy',
  description:
    'Connect OpenClaw or Hermes to a synthetic Inbox, keep private evidence in your browser, and distinguish passed runs, findings, and infrastructure failures.',
};

const boundaryFacts = [
  ['Real mailbox', 'Never connected'],
  ['Private evidence', 'Browser local'],
  ['Client identity', 'Self-asserted'],
  ['Permission decision', 'None'],
];

export default function EvaluatePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="evaluate-title">
        <div className={styles.heroField} aria-hidden="true" />
        <div className={styles.rail}>
          <div className={styles.heroLayout}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Local agent evaluation · Inbox protocol · Private by default</p>
              <h1 id="evaluate-title">Connect the runtime. Keep the evidence local.</h1>
              <p>
                Launch OpenClaw or Hermes against the same synthetic Inbox, inspect only the
                receipts you need, and compare measured runs without uploading a private bundle.
              </p>
              <div className={styles.heroActions}>
                <Link href="/preflight" className={styles.primaryLink}>Build an Inbox plan</Link>
                <a href="#connect-agent" className={styles.secondaryLink}>Choose an adapter</a>
              </div>
            </div>

            <aside className={styles.boundary} aria-labelledby="boundary-title">
              <div className={styles.boundaryHeader}>
                <span aria-hidden="true">[ boundary ]</span>
                <h2 id="boundary-title">What this flow can claim</h2>
              </div>
              <dl>
                {boundaryFacts.map(([term, value]) => (
                  <div key={term}>
                    <dt>{term}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <p>
                The local operator, same-UID filesystem, interpreters, Git, dependencies, and
                canonical runtime checkout are trusted. The model, its tool choices, protocol
                frames, and evidence claims are not.
              </p>
            </aside>
          </div>
        </div>
      </section>

      <nav className={styles.sequence} aria-label="Agent evaluation sequence">
        <div className={styles.rail}>
          <ol>
            <li><span>01</span><Link href="/preflight">Plan</Link></li>
            <li><span>02</span><a href="#connect-agent">Connect</a></li>
            <li><span>03</span><a href="#inspect-evidence">Inspect</a></li>
            <li><span>04</span><a href="#act-on-findings">Decide</a></li>
          </ol>
        </div>
      </nav>

      <AgentEvaluationWorkbench />

      <section className={styles.limitations} aria-labelledby="limitations-title">
        <div className={styles.rail}>
          <p className={styles.sectionIndex}>Before a permission change</p>
          <div className={styles.limitationsLayout}>
            <h2 id="limitations-title">Measurement is a review input, not an authorization.</h2>
            <div>
              <p>
                A complete run describes one observed session in a synthetic fixture. It does not
                attest the production deployment, authenticate the adapter’s client identity, or
                prove repeatability.
              </p>
              <p>
                Keep human approval and platform controls around consequential actions. Review the
                full private bundle and rerun the checked-in validator before acting on any result.
              </p>
              <Link href="/about">Read the evidence boundary</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
