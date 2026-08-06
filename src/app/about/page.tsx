import type { Metadata } from 'next';

import styles from '../editorial.module.css';

export const metadata: Metadata = {
  title: 'Method | Clawbotomy',
  description:
    'How Clawbotomy observes one configured AI agent session against a synthetic Inbox without turning evidence into authorization.',
};

const methodSteps = [
  {
    index: '01',
    title: 'Freeze the plan',
    copy: 'Name the intended powers, runtime, fixed cases, and approval boundary before the agent runs.',
  },
  {
    index: '02',
    title: 'Observe the run',
    copy: 'Record tool attempts, synthetic state changes, checked assertions, and infrastructure failures from one configured session.',
  },
  {
    index: '03',
    title: 'Keep the decision human',
    copy: 'Turn the bounded receipt into a review input without treating one observation as certification or authorization.',
  },
];

const observations = [
  'Fixed mock tools the agent attempted',
  'Synthetic Inbox state changes that actually happened',
  'Checked-in assertions that passed or failed',
  'Whether the run completed or the test infrastructure failed',
];

const boundaries = [
  'No real mailbox is connected',
  'Private receipts stay local to the operator',
  'One checkup describes one observed session',
  'Permission and deployment decisions remain human',
];

export default function AboutPage() {
  return (
    <main className={`${styles.page} ${styles.pageWide} ${styles.methodPage}`}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Method</p>
          <h1 className={styles.title}>Check the agent you actually operate.</h1>
        </div>
        <p className={styles.lede}>
          Clawbotomy records one configured OpenClaw or Hermes session against a fixed synthetic Inbox, then keeps the private evidence local for review.
        </p>
      </header>

      <section className={styles.methodSection} aria-labelledby="method-loop-title">
        <div className={styles.methodSectionHeading}>
          <p>How it works</p>
          <div>
            <h2 id="method-loop-title">A small loop with a hard boundary.</h2>
            <p>The method keeps observation, interpretation, and authority separate from the start.</p>
          </div>
        </div>
        <div className={styles.methodSteps}>
          {methodSteps.map((step) => (
            <article key={step.index}>
              <span>{step.index}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.methodSplit} aria-label="Observation and boundary">
        <article>
          <p className={styles.methodLabel}>What a checkup observes</p>
          <h2>Evidence tied to what happened.</h2>
          <div className={styles.methodRows}>
            {observations.map((observation, index) => (
              <div key={observation}><span>{String(index + 1).padStart(2, '0')}</span><p>{observation}</p></div>
            ))}
          </div>
        </article>
        <article>
          <p className={styles.methodLabel}>What stays outside</p>
          <h2>A receipt that cannot grant power.</h2>
          <div className={styles.methodRows}>
            {boundaries.map((boundary, index) => (
              <div key={boundary}><span>{String(index + 1).padStart(2, '0')}</span><p>{boundary}</p></div>
            ))}
          </div>
        </article>
      </section>

      <aside className={styles.methodPrinciple}>
        <p>One run can tell you what happened.</p>
        <strong>It cannot authorize what happens next.</strong>
      </aside>

      <section className={styles.sourceSection} aria-labelledby="source-title">
        <div>
          <p className={styles.methodLabel}>Open source</p>
          <h2 id="source-title">Inspect the method, not just the claim.</h2>
        </div>
        <div>
          <p>
            The runner, fixed protocol, OpenClaw and Hermes bridges, evidence schemas, and validation tests are available under the MIT License.
          </p>
          <a href="https://github.com/aa-on-ai/clawbotomy" target="_blank" rel="noopener noreferrer">
            Inspect the source on GitHub ↗
          </a>
          <p className={styles.byline}>Built by <a href="https://x.com/aa_on_ai" target="_blank" rel="noopener noreferrer">Aaron Thomas</a>.</p>
        </div>
      </section>
    </main>
  );
}
