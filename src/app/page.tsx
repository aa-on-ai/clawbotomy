import Link from 'next/link';

import { CheckupFlow } from '@/components/home/CheckupFlow';
import { ProductPreview } from '@/components/home/ProductPreview';
import { ResultBreakdown } from '@/components/home/ResultBreakdown';

import styles from './home.module.css';

const proofPoints = [
  'One configured session',
  'Synthetic Inbox only',
  'Browser-local evidence inspection',
  'Human decision required',
];

const nextLinks = [
  {
    index: '01',
    label: 'Start a checkup',
    copy: 'Build a plan, choose OpenClaw or Hermes, and open the local evidence workflow.',
    href: '/preflight',
  },
  {
    index: '02',
    label: 'Inspect evidence',
    copy: 'Inspect the configured-session summary, its claim boundary, and the separate model archive.',
    href: '/bench',
  },
  {
    index: '03',
    label: 'Read the method',
    copy: 'See exactly what one observed session can and cannot support.',
    href: '/about',
  },
];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={styles.rail}>
          <div className={styles.heroLayout}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Open-source behavior checkups for configured agents</p>
              <h1 id="home-title">Run the agent you use through a fake inbox.</h1>
              <p className={styles.heroSummary}>
                Connect a checked-in OpenClaw or Hermes bridge to fixed synthetic tasks. Inspect
                one session&apos;s tool attempts, state changes, and findings before you consider real permissions.
              </p>
              <div className={styles.heroActions}>
                <Link href="/preflight" className={styles.primaryAction}>Start a checkup</Link>
                <Link href="/checkups" className={styles.secondaryAction}>See checkup options</Link>
              </div>
              <p className={styles.heroNote}>
                Plan data stays in this browser.{' '}
                No hosted agent, real mailbox, or automatic permission decision.
              </p>
            </div>
            <ProductPreview />
          </div>
        </div>
        <div className={styles.proofStrip} aria-label="Checkup properties">
          {proofPoints.map((point) => <span key={point}>{point}</span>)}
        </div>
      </section>

      <section className={styles.flowSection} aria-labelledby="flow-title">
        <div className={styles.rail}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionLabel}>How the product works</p>
              <h2 id="flow-title">One visible path from plan to evidence.</h2>
            </div>
            <p>
              The configured runtime receives only the eight project-owned synthetic Inbox tools.
              Clawbotomy does not observe other external-client activity.
            </p>
          </div>
          <CheckupFlow />
        </div>
      </section>

      <section className={styles.resultSection} aria-labelledby="result-title">
        <div className={styles.rail}>
          <div className={styles.sectionHeadingLight}>
            <div>
              <p className={styles.sectionLabel}>Configured-agent session evidence</p>
              <h2 id="result-title">The result is reviewable, not magical.</h2>
            </div>
            <p>
              This sanitized Hermes session summary shows what one reviewed observation can support.
              It is not a compatibility or verifier result. The private bundle is not published,
              and the permission decision stays with the operator.{' '}
              <Link href="/bench" className={styles.inlineLink}>Inspect public evidence.</Link>
            </p>
          </div>
          <ResultBreakdown />
        </div>
      </section>

      <section className={styles.nextSection} aria-labelledby="next-title">
        <div className={styles.rail}>
          <div className={styles.nextHeading}>
            <p className={styles.sectionLabel}>Go deeper when you need to</p>
            <h2 id="next-title">Start with the product. Keep the method nearby.</h2>
          </div>
          <div className={styles.nextLinks}>
            {nextLinks.map((item) => (
              <Link href={item.href} key={item.index}>
                <span>[{item.index}]</span>
                <h3>{item.label}</h3>
                <p>{item.copy}</p>
                <strong>Open <span aria-hidden="true">→</span></strong>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
