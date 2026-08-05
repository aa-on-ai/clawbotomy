import type { Metadata } from 'next';

import styles from '../editorial.module.css';

export const metadata: Metadata = {
  title: 'Method | Clawbotomy',
  description:
    'How Clawbotomy observes one configured AI agent session against a synthetic Inbox without turning evidence into authorization.',
};

const observations = [
  'which fixed mock tools the agent attempted',
  'which synthetic Inbox state changes actually happened',
  'which checked-in assertions passed or failed',
  'whether the run completed or the test infrastructure failed',
];

const boundaries = [
  'No real mailbox is connected.',
  'Private receipts are selected and inspected in the browser.',
  'One checkup describes one observed session.',
  'Clawbotomy makes no permission or deployment decision.',
];

function SectionDivider({ label }: { label: string }) {
  return (
    <div className={styles.sectionDivider}>
      <h2>{label}</h2>
    </div>
  );
}

export default function AboutPage() {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Method</p>
          <h1 className={styles.title}>Check the agent you actually operate.</h1>
        </div>
        <p className={styles.lede}>
          Clawbotomy records one configured OpenClaw or Hermes session against a fixed synthetic Inbox, then keeps the private evidence local for review.
        </p>
      </header>

      <section className="mb-16">
        <SectionDivider label="Why it changed" />
        <div className="space-y-4 text-content-secondary text-sm leading-relaxed">
          <p>
            Clawbotomy started as model stress tests. That work could describe how a model answered a prompt, but it could not show what a configured runtime did once tools, state, and a full agent loop were involved.
          </p>
          <p>
            The current checkup follows one configured session instead. It keeps the result tied to that exact plan, self-asserted client identity, bridge, and evidence bundle.
          </p>
        </div>
      </section>

      <section className="mb-16">
        <SectionDivider label="What a checkup observes" />
        <ul className="space-y-3 text-content-secondary text-sm leading-relaxed list-disc pl-5">
          {observations.map((observation) => <li key={observation}>{observation}</li>)}
        </ul>
      </section>

      <section className="mb-16">
        <SectionDivider label="The boundary" />
        <ul className="space-y-3 text-content-secondary text-sm leading-relaxed list-disc pl-5">
          {boundaries.map((boundary) => <li key={boundary}>{boundary}</li>)}
        </ul>
        <p className="mt-6 text-content-muted text-xs leading-relaxed">
          A passing run is evidence from one fixture. It is not certification, proof of repeatability, or permission to give the agent more access.
        </p>
      </section>

      <section className="mb-16">
        <SectionDivider label="Open source" />
        <div className="space-y-4 text-content-secondary text-sm leading-relaxed">
          <p>
            The runner, fixed protocol, OpenClaw and Hermes bridges, evidence schemas, and validation tests are available on GitHub under the MIT License.
          </p>
          <p>
            <a
              href="https://github.com/aa-on-ai/clawbotomy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-content-primary hover:text-white transition-colors"
            >
              Inspect the source on GitHub
            </a>
          </p>
        </div>
      </section>

      <section className="mb-16">
        <SectionDivider label="Who made this" />
        <p className="text-content-secondary text-sm leading-relaxed">
          Built by{' '}
          <a
            href="https://x.com/aa_on_ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-content-primary hover:text-white transition-colors"
          >
            Aaron Thomas
          </a>
          .
        </p>
      </section>
    </main>
  );
}
