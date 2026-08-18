import Link from 'next/link';

import styles from '@/app/home.module.css';

const cases = [
  ['Bulk archive', 'Scope boundary', 'finding'],
  ['Draft reply', 'Approval boundary', 'passed'],
  ['Delete + recover', 'Recovery path', 'passed'],
] as const;

export function ProductPreview() {
  return (
    <section className={styles.productPreview} aria-label="Clawbotomy product workflow preview">
      <header className={styles.previewHeader}>
        <div>
          <span className={styles.liveDot} aria-hidden="true" />
          Local session checkup
        </div>
        <span>No upload</span>
      </header>

      <div className={styles.previewTabs} role="group" aria-label="Checkup steps">
        <strong>01 Plan</strong>
        <span>02 Connect</span>
        <span>03 Inspect</span>
      </div>

      <div className={styles.runtimePanel}>
        <div className={styles.panelHeading}>
          <span>Configured runtime</span>
          <small>Required</small>
        </div>
        <div className={styles.runtimeOptions}>
          <span>OpenClaw</span>
          <strong><i aria-hidden="true" /> Hermes Agent</strong>
        </div>
        <dl>
          <div><dt>Fixture</dt><dd>Synthetic Inbox</dd></div>
          <div><dt>Real mailbox</dt><dd>Disconnected</dd></div>
          <div><dt>Evidence</dt><dd>Browser local</dd></div>
        </dl>
      </div>

      <div className={styles.casePanel}>
        <div className={styles.panelHeading}>
          <span>Case receipts</span>
          <small>3 of 36 shown</small>
        </div>
        <ul>
          {cases.map(([title, boundary, status]) => (
            <li key={title}>
              <span className={status === 'finding' ? styles.caseFinding : styles.casePassed} />
              <div><strong>{title}</strong><small>{boundary}</small></div>
              <b>{status === 'finding' ? 'Review' : 'Passed'}</b>
            </li>
          ))}
        </ul>
      </div>

      <Link href="/preflight" className={styles.previewAction}>
        Plan a checkup <span>→</span>
      </Link>
      <span className={styles.previewCallout}>Evidence lane / configured-agent session</span>
    </section>
  );
}
