import type { Metadata } from 'next';
import Link from 'next/link';

import { benchData } from '@/lib/bench-data';
import { buildEvidenceComparisons } from '@/lib/evidence-comparison';
import { isLiveBenchEnabled } from '@/lib/live-bench-access.server';
import { loadPublicEvidenceIndex, loadPublicEvidenceRun } from '@/lib/public-evidence.server';
import { benchDatasetJsonLd, serializeJsonLd } from '@/lib/structured-data';

import styles from './bench.module.css';

export const metadata: Metadata = {
  title: 'Evidence Registry & Legacy Benchmark — Clawbotomy',
  description:
    'Public Clawbotomy evidence bundles when available, plus a clearly separated maintainer-reported March 2026 legacy summary.',
};

const modelLabels: Record<string, string> = {
  'gpt-5.4': 'GPT-5.4',
  'gpt-5.3-instant': 'GPT-5.3 Instant',
  'claude-opus-4.6': 'Claude Opus 4.6',
  'claude-sonnet-4.6': 'Claude Sonnet 4.6',
  'gemini-3.1-pro': 'Gemini 3.1 Pro',
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
  const { models, categories, runs: legacyRuns, lastUpdated, scope, limitations, modelIdentityStatus } = benchData;
  const liveBenchEnabled = isLiveBenchEnabled();

  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(benchDatasetJsonLd) }} />

      <header className={styles.header}>
        <div className={styles.rail}>
          <p className={styles.eyebrow}>Evidence registry · Public v1</p>
          <div className={styles.headerGrid}>
            <h1>Public evidence starts with the bundle.</h1>
            <p>
              Comparison starts only after eligible bundles share the same protocol. Every published run still
              exposes its frozen plan, exact identities, cases, failures, redaction state, and integrity digest.
            </p>
          </div>

          <dl className={styles.registryStats}>
            <div>
              <dt>Published runs</dt>
              <dd>{runs.length}</dd>
            </div>
            <div>
              <dt>Latest run</dt>
              <dd>{runs[0]?.runId || 'None'}</dd>
            </div>
            <div>
              <dt>Compatible pairs</dt>
              <dd>{comparisons.length}</dd>
            </div>
            <div>
              <dt>Authorization</dt>
              <dd>Non-authorizing</dd>
            </div>
          </dl>
        </div>
      </header>

      {comparison && (
        <section
          className={styles.comparisonSection}
          aria-labelledby="comparison-title"
          data-evidence-comparison
        >
          <div className={styles.rail}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrowSignal}>Compatible public comparison</p>
                <h2 id="comparison-title">Same prompts. Two Qwen sizes.</h2>
              </div>
              <p>
                Both runs clear the repeat count, coverage, scoring, reproducibility, identity, prompt-hash,
                and implementation-hash gates for this exact local protocol.
              </p>
            </div>

            <article className={styles.comparisonCard}>
              <div className={styles.comparisonLead}>
                <div>
                  <p className={styles.comparisonKicker}>{comparison.category} · {comparison.caseCount} prompts · {comparison.runsPerCase} repeats</p>
                  <h3>
                    {comparison.leader
                      ? `${comparison.leader.modelLabel} led by ${comparison.meanDelta.toFixed(2)} points.`
                      : 'The mean scores tied.'}
                  </h3>
                </div>
                <p>
                  This is a bounded, same-family size comparison on fifty scored records. It is not a general
                  model leaderboard or evidence about safety, speed, cost, or production readiness.
                </p>
              </div>

              <div className={styles.comparisonSubjects}>
                {comparison.subjects.map((subject) => (
                  <article key={subject.runId} data-comparison-subject>
                    <p>{subject.modelLabel}</p>
                    <div className={styles.comparisonScore}>
                      <strong>{subject.meanScore.toFixed(2)}</strong>
                      <span>mean / 10</span>
                    </div>
                    <dl>
                      <div><dt>Observed range</dt><dd>{subject.minScore.toFixed(2)} to {subject.maxScore.toFixed(2)}</dd></div>
                      <div><dt>Scored records</dt><dd>{subject.scored}</dd></div>
                    </dl>
                    <Link href={`/bench/runs/${subject.runId}`}>Inspect this run →</Link>
                  </article>
                ))}
              </div>

              <div className={styles.caseComparison} aria-label="Prompt-level mean scores">
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
                <div><dt>Authorization</dt><dd>{comparison.authorizationStatus}</dd></div>
              </dl>
            </article>
          </div>
        </section>
      )}

      <section className={styles.registrySection} aria-labelledby="registry-title">
        <div className={styles.rail}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrowSignal}>Public evidence runs</p>
              <h2 id="registry-title">Evidence available now</h2>
            </div>
            <p>Each run listed here has a complete public manifest and case file. Integrity is not a signature or proof of provider authorship.</p>
          </div>

          {runs.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIndex}>00</span>
              <div>
                <h3>No public evidence run yet.</h3>
                <p>
                  The March 2026 summary lacks raw case artifacts and has not been promoted into this evidence system.
                  The current evidence-bundle workflow can create and validate bundles locally; a real provider run still requires an explicitly reviewed plan and cost cap.
                </p>
              </div>
              <div className={styles.emptyLinks}>
                <a href="/evidence/index.json">Open empty index</a>
                <a href="/evidence/schema/evidence-bundle.v1.schema.json">Read bundle schema</a>
                <Link href="/docs">Run the preflight locally</Link>
              </div>
            </div>
          ) : (
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
          )}
        </div>
      </section>

      <section className={styles.legacySection} aria-labelledby="legacy-title">
        <div className={styles.rail}>
          <div className={styles.legacyHeader}>
            <div>
              <p className={styles.eyebrowSignal}>Legacy snapshot · {lastUpdated}</p>
              <h2 id="legacy-title">Maintainer-reported summary</h2>
            </div>
            <div className={styles.statuses} aria-label="Legacy evidence status">
              <span>Low confidence</span>
              <span>{legacyRuns} runs</span>
              <span>Raw cases unavailable</span>
            </div>
          </div>

          <p className={styles.legacyIntro}>
            These values remain available for continuity and scrutiny. They are not a reproducible evidence bundle,
            not universal model grades, and not permission or deployment guidance.
          </p>

          <p className={styles.tableHint}>Swipe horizontally to compare models. Task names stay pinned.</p>
          <div className={styles.tableRegion} role="region" aria-label="Legacy benchmark scores by task and model" tabIndex={0}>
            <table>
              <caption>Legacy March 2026 mean scores out of 10. Raw constituent cases are unavailable.</caption>
              <thead>
                <tr>
                  <th scope="col">Task category</th>
                  {models.map((modelId) => <th scope="col" key={modelId}>{modelLabels[modelId] || modelId}</th>)}
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.slug}>
                    <th scope="row">{category.name}</th>
                    {models.map((modelId) => {
                      const score = category.scores[modelId as keyof typeof category.scores];
                      return <td key={modelId}><span>{score.toFixed(2)}</span><small>/ 10</small></td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.legacyNotes}>
            <div>
              <h3>Scope</h3>
              <p>{scope}</p>
              <p>{modelIdentityStatus}</p>
            </div>
            <div>
              <h3>Known limits</h3>
              <ul>
                {limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.runSection} aria-labelledby="run-title">
        <div className={styles.rail}>
          <p className={styles.eyebrow}>Local workflow</p>
          <div className={styles.runGrid}>
            <h2 id="run-title">Preview spend before the first request.</h2>
            <div>
              <p>
                Preflight resolves the real target and judge call graph, conservative token and cost bounds,
                output directory, source state, and a digest. Live execution accepts only that frozen plan.
              </p>
              <div className={styles.runLinks}>
                <Link href="/docs">Open the setup guide</Link>
                <a href="/api/bench">Inspect the API</a>
                <a href="https://github.com/aa-on-ai/clawbotomy" target="_blank" rel="noopener noreferrer">Read source ↗</a>
                {liveBenchEnabled && (
                  <Link className={styles.liveBenchEntry} href="/bench/live">
                    Open Live Bench →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
