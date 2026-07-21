import type { Metadata } from 'next';
import Link from 'next/link';

import { buildEvidenceComparisons } from '@/lib/evidence-comparison';
import { loadPublicEvidenceIndex, loadPublicEvidenceRun } from '@/lib/public-evidence.server';
import { evidenceDatasetJsonLd, serializeJsonLd } from '@/lib/structured-data';

import styles from './bench.module.css';

export const metadata: Metadata = {
  title: 'Public Evidence — Clawbotomy',
  description: 'Three current public evidence exports, their bounded compatible comparison, and validated run details.',
};

export default function BenchPage() {
  const registry = loadPublicEvidenceIndex();
  const runs = registry.runs.slice().sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const bundles = runs.flatMap((run) => {
    const bundle = loadPublicEvidenceRun(run.runId);
    return bundle ? [bundle] : [];
  });
  const comparisons = buildEvidenceComparisons(bundles);
  const comparison = comparisons[0] || null;

  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(evidenceDatasetJsonLd) }} />

      <header className={styles.header}>
        <div className={styles.rail}>
          <p className={styles.eyebrow}>Current public evidence · Browser-readable</p>
          <div className={styles.headerGrid}>
            <h1>Review the run before the comparison.</h1>
            <p>
              Each public export keeps its frozen plan, configured endpoint identity, constituent cases,
              findings, redaction state, and integrity files available for bounded review.
            </p>
          </div>

          <dl className={styles.registryStats}>
            <div>
              <dt>Published runs</dt>
              <dd>{runs.length}</dd>
            </div>
            <div>
              <dt>Latest run</dt>
              <dd>{runs[0]?.runId || 'Unavailable'}</dd>
            </div>
            <div>
              <dt>Compatible pairs</dt>
              <dd>{comparisons.length}</dd>
            </div>
            <div>
              <dt>Review scope</dt>
              <dd>Exact fixture</dd>
            </div>
          </dl>
        </div>
      </header>

      {comparison ? (
        <section
          className={styles.comparisonSection}
          aria-labelledby="comparison-title"
          data-evidence-comparison
        >
          <div className={styles.rail}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrowSignal}>Bounded compatible comparison</p>
                <h2 id="comparison-title">Same prompts. Two Qwen sizes.</h2>
              </div>
              <p>
                Both runs share the repeat count, coverage, scoring, reproducibility, identity, prompt hashes,
                and implementation hashes required for this exact local protocol.
              </p>
            </div>

            <article className={styles.comparisonCard}>
              <div className={styles.comparisonLead}>
                <div>
                  <p className={styles.comparisonKicker}>{comparison.category} · {comparison.caseCount} prompts · {comparison.runsPerCase} repeats</p>
                  <h3>
                    {comparison.leader
                      ? `${comparison.leader.modelLabel} had the higher observed mean by ${comparison.meanDelta.toFixed(2)} points.`
                      : 'The observed means were equal.'}
                  </h3>
                </div>
                <p>
                  This comparison covers fifty scored records from one frozen protocol. It says nothing about
                  other tasks, other configurations, speed, cost, or real-world operation.
                </p>
              </div>

              <div className={styles.comparisonSubjects}>
                {comparison.subjects.map((subject) => (
                  <article key={subject.runId} data-comparison-subject>
                    <p>{subject.modelLabel}</p>
                    <div className={styles.comparisonScore}>
                      <strong>{subject.meanScore.toFixed(2)}</strong>
                      <span>observed mean / 10</span>
                    </div>
                    <dl>
                      <div><dt>Observed range</dt><dd>{subject.minScore.toFixed(2)} to {subject.maxScore.toFixed(2)}</dd></div>
                      <div><dt>Scored records</dt><dd>{subject.scored}</dd></div>
                    </dl>
                    <Link href={`/bench/runs/${subject.runId}`}>Inspect this run →</Link>
                  </article>
                ))}
              </div>

              <div className={styles.caseComparison} aria-label="Prompt-level observed means">
                <div className={styles.caseComparisonHeader} aria-hidden="true">
                  <span>Prompt</span>
                  {comparison.subjects.map((subject) => <span key={subject.runId}>{subject.modelLabel}</span>)}
                </div>
                <ol>
                  {comparison.caseRows.map((row) => (
                    <li key={row.caseId} data-comparison-case>
                      <span>{row.caseId}</span>
                      <strong>{row.scores[0].toFixed(2)}</strong>
                      <strong>{row.scores[1].toFixed(2)}</strong>
                    </li>
                  ))}
                </ol>
              </div>

              <dl className={styles.comparisonProof}>
                <div><dt>Prompt + implementation hashes</dt><dd>Identical</dd></div>
                <div><dt>Runs per prompt</dt><dd>{comparison.runsPerCase} each</dd></div>
                <div><dt>Review state</dt><dd>{comparison.reviewStatus}</dd></div>
                <div><dt>Scope</dt><dd>Exact protocol only</dd></div>
              </dl>
            </article>
          </div>
        </section>
      ) : null}

      <section className={styles.registrySection} aria-labelledby="registry-title">
        <div className={styles.rail}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrowSignal}>Public evidence runs</p>
              <h2 id="registry-title">Evidence available now</h2>
            </div>
            <p>
              Each listed export has a complete validated manifest and case file. Integrity detects changed
              files; it is not a signature or proof of provider authorship.
            </p>
          </div>

          <ol className={styles.runList}>
            {runs.map((run, index) => (
              <li key={run.runId}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{run.runId}</h3>
                  <p>{run.measurementStatus} · {run.reproducibilityStatus} · {run.reviewStatus}</p>
                </div>
                <time dateTime={run.completedAt}>{run.completedAt.slice(0, 10)}</time>
                <Link href={`/bench/runs/${run.runId}`}>Inspect run →</Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={styles.runSection} aria-labelledby="run-title">
        <div className={styles.rail}>
          <p className={styles.eyebrow}>Local benchmark runner</p>
          <div className={styles.runGrid}>
            <h2 id="run-title">Freeze the plan before the first request.</h2>
            <div>
              <p>
                Local-first execution binds source, prompts, exact endpoints, request ceilings, estimated cost,
                private output, and a digest. Review private records before creating any separate public export.
              </p>
              <div className={styles.runLinks}>
                <Link href="/docs">Open the setup guide</Link>
                <a href="/api/bench">Inspect the registry API</a>
                <a href="https://github.com/aa-on-ai/clawbotomy" target="_blank" rel="noopener noreferrer">Read source ↗</a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
