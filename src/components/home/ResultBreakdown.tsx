import { SANITIZED_HERMES_CASE_STUDY } from '@/lib/agent-evaluation-insights';

import styles from '@/app/home.module.css';

const { totals } = SANITIZED_HERMES_CASE_STUDY;

const annotations = [
  {
    index: '01',
    title: 'A decision, not a score',
    copy: '“Hold permission changes” tells the operator what to do next without pretending to certify the runtime.',
  },
  {
    index: '02',
    title: 'Findings stay distinct',
    copy: 'Passed cases, behavioral findings, and infrastructure failures remain separate evidence states.',
  },
  {
    index: '03',
    title: 'The boundary stays visible',
    copy: 'The aggregate can be shared. The private bundle and case payloads do not leave the browser.',
  },
];

export function ResultBreakdown() {
  return (
    <div className={styles.resultLayout}>
      <article className={styles.resultCard}>
        <header>
          <div>
            <span>Sanitized verification summary</span>
            <strong>{SANITIZED_HERMES_CASE_STUDY.adapter}</strong>
          </div>
          <time dateTime={SANITIZED_HERMES_CASE_STUDY.measuredAt}>Jul 13, 2026</time>
        </header>

        <div className={styles.decisionBlock}>
          <span><i>01</i> Operator decision</span>
          <h3>{SANITIZED_HERMES_CASE_STUDY.decision}</h3>
          <p>{totals.failedCases} of {totals.completedCases} completed cases produced findings.</p>
        </div>

        <div className={styles.resultBar} aria-label={`${totals.passedCases} passed cases and ${totals.failedCases} cases with findings`}>
          <span style={{ width: `${(totals.passedCases / totals.completedCases) * 100}%` }} />
          <strong style={{ width: `${(totals.failedCases / totals.completedCases) * 100}%` }} />
        </div>

        <dl className={styles.resultMetrics}>
          <div><dt>Passed</dt><dd>{totals.passedCases}</dd></div>
          <div><dt><i>02</i> Findings</dt><dd>{totals.failedCases}</dd></div>
          <div><dt>Tool attempts</dt><dd>{totals.toolAttempts}</dd></div>
          <div><dt>State changes</dt><dd>{totals.stateTransitions}</dd></div>
        </dl>

        <div className={styles.receiptShape}>
          <div><span>status</span><code>&quot;findings&quot;</code></div>
          <div><span>authorizationStatus</span><code>&quot;non-authorizing&quot;</code></div>
          <div><span><i>03</i> permissionDecision</span><code>null</code></div>
        </div>
        <footer>Aggregate facts only · Private case evidence not published</footer>
      </article>

      <ol className={styles.annotationList}>
        {annotations.map((item) => (
          <li key={item.index}>
            <span>{item.index}</span>
            <div><h3>{item.title}</h3><p>{item.copy}</p></div>
          </li>
        ))}
      </ol>
    </div>
  );
}
