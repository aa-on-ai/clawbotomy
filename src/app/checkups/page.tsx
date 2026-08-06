import type { Metadata } from 'next';
import Link from 'next/link';

import styles from './checkups.module.css';

export const metadata: Metadata = {
  title: 'Agent Behavior Checkups — Clawbotomy',
  description:
    'Run a private configured-agent evaluation yourself, or use a guided checkup to inspect failures and plan one controlled retest.',
};

const offers = [
  {
    index: '01',
    status: 'Self-serve',
    title: 'Open-source workflow',
    copy: 'Build the plan in your browser, connect a checked-in OpenClaw or Hermes bridge, validate the bundle in your terminal, and inspect its local projection.',
    includes: ['Browser-local planning', 'Synthetic Inbox tools', 'Private evidence inspection', 'No hosted agent or mailbox'],
    href: '/preflight',
    action: 'Start a checkup',
    external: false,
  },
  {
    index: '02',
    status: 'Guided review',
    title: 'Agent Behavior Checkup',
    copy: 'Work through one configured runtime with a human reviewer. Freeze the scope, run the cases, separate behavior from infrastructure, and leave with a decision packet.',
    includes: ['One frozen runtime and plan', 'Failure-cluster review', 'Evidence and limits packet', 'Recommended next controlled change'],
    href: 'https://x.com/aa_on_ai',
    action: 'Discuss a guided checkup',
    external: true,
  },
] as const;

const workflow = [
  ['01', 'Plan', 'Record intended powers, pin the runtime, and freeze the cases before a provider call.'],
  ['02', 'Connect', 'Run a checked-in OpenClaw or Hermes bridge from your own machine. Exact-pin compatibility is checked separately.'],
  ['03', 'Inspect', 'Validate the private bundle in the terminal, then load its allowlisted browser projection.'],
  ['04', 'Decide', 'Use the bounded evidence as a review input. Permission decisions remain human.'],
] as const;

export default function CheckupsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="checkups-title">
        <div className={styles.grid} aria-hidden="true" />
        <div className={styles.rail}>
          <p className={styles.eyebrow}>Evidence lane / Configured-agent session</p>
          <h1 id="checkups-title">See how your agent behaves before it gets more power.</h1>
          <p className={styles.lede}>
            Clawbotomy records fixed synthetic tasks against one operator-selected runtime. Run the open-source workflow yourself, or add a human reviewer to the same local evidence workflow.
          </p>
          <div className={styles.actions}>
            <Link href="/preflight" className={styles.primaryAction}>Start a checkup</Link>
            <a
              href="https://x.com/aa_on_ai"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.secondaryAction}
            >
              Discuss a guided checkup
            </a>
          </div>
          <p className={styles.boundaryNote}>
            A checkup records one observed session. It is not a certification, production guarantee, or automatic permission decision.
          </p>
        </div>
      </section>

      <section className={styles.proofStrip} aria-label="Checkup properties">
        <span>One observed session</span>
        <span>Synthetic tools only</span>
        <span>Private receipts</span>
        <span>Human decision required</span>
      </section>

      <section className={styles.offers} aria-labelledby="offers-title">
        <div className={styles.rail}>
          <div className={styles.sectionIntro}>
            <div>
              <p className={styles.eyebrow}>Choose the level of help</p>
              <h2 id="offers-title">Two ways to run the same checkup.</h2>
            </div>
            <p>
              Start self-serve. Add guided review when the runtime, failure modes, or permission decision deserve another pair of eyes.
            </p>
          </div>

          <ol className={styles.offerList}>
            {offers.map((offer) => (
              <li key={offer.index}>
                <div className={styles.offerIndex}>[{offer.index}]</div>
                <div className={styles.offerTitle}>
                  <span>{offer.status}</span>
                  <h3>{offer.title}</h3>
                </div>
                <p className={styles.offerCopy}>{offer.copy}</p>
                <div className={styles.offerOutput}>
                  <span>Includes</span>
                  <ul>
                    {offer.includes.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                  {offer.external ? (
                    <a href={offer.href} target="_blank" rel="noopener noreferrer">{offer.action} ↗</a>
                  ) : (
                    <Link href={offer.href}>{offer.action} →</Link>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={styles.workflow} aria-labelledby="workflow-title">
        <div className={styles.rail}>
          <div className={styles.workflowHeader}>
            <div>
              <p className={styles.darkEyebrow}>The checkup loop</p>
              <h2 id="workflow-title">Plan. Connect. Inspect. Decide.</h2>
            </div>
            <p>
              Failed infrastructure is not scored as behavior. An invalid arm ends the comparison instead of quietly becoming a zero.
            </p>
          </div>
          <ol className={styles.workflowList}>
            {workflow.map(([index, title, copy]) => (
              <li key={index}>
                <span>[{index}]</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </li>
            ))}
          </ol>
          <div className={styles.retestGate} role="note" aria-labelledby="retest-title">
            <div>
              <span>Optional next stage</span>
              <h3 id="retest-title">Retest only after a valid baseline.</h3>
            </div>
            <p>
              Change one behavior, keep the plan and comparison contract fixed, then rerun. If either arm is invalid or the evidence cannot be compared honestly, stop as inconclusive.
            </p>
            <Link href="/about">Read the evidence model →</Link>
          </div>
        </div>
      </section>

      <section className={styles.boundaries} aria-labelledby="boundaries-title">
        <div className={styles.rail}>
          <div className={styles.boundaryHeader}>
            <p className={styles.eyebrow}>Claim boundary</p>
            <h2 id="boundaries-title">Useful evidence, kept in its lane.</h2>
          </div>
          <div className={styles.boundaryGrid}>
            <article>
              <span>What you get</span>
              <ul>
                <li>A frozen, reviewable test plan</li>
                <li>Private launcher and bundle receipts</li>
                <li>Observed failures separated from runtime failures</li>
                <li>A bounded next-step recommendation</li>
              </ul>
            </article>
            <article>
              <span>What you do not get</span>
              <ul>
                <li>A universal agent score</li>
                <li>A safety certification</li>
                <li>Hosted access to your production systems</li>
                <li>Automatic permission or deployment changes</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.finalCta} aria-labelledby="final-cta-title">
        <div className={styles.rail}>
          <p className={styles.darkEyebrow}>Start with the smallest honest check</p>
          <h2 id="final-cta-title">Freeze one plan. Observe one runtime.</h2>
          <div className={styles.actions}>
            <Link href="/preflight" className={styles.primaryAction}>Start a checkup</Link>
            <a
              href="https://github.com/aa-on-ai/clawbotomy"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.secondaryAction}
            >
              View source
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
