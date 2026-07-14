import type { Metadata } from 'next';
import Link from 'next/link';

import { benchData } from '@/lib/bench-data';
import { loadPublicEvidenceIndex } from '@/lib/public-evidence.server';
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
  const { models, categories, runs: legacyRuns, lastUpdated, scope, limitations, modelIdentityStatus } = benchData;

  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(benchDatasetJsonLd) }} />

      <header className={styles.header}>
        <div className={styles.rail}>
          <p className={styles.eyebrow}>Evidence registry · Public v1</p>
          <div className={styles.headerGrid}>
            <h1>Public evidence starts with the bundle.</h1>
            <p>
              Rankings come later. A publishable run must first expose its frozen plan, exact identities,
              constituent cases, failures, summary derivation, redaction state, and integrity digest.
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
              <dt>Review state</dt>
              <dd>{runs[0]?.reviewStatus || 'Awaiting evidence'}</dd>
            </div>
            <div>
              <dt>Authorization</dt>
              <dd>Non-authorizing</dd>
            </div>
          </dl>
        </div>
      </header>

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
                  Phase 1 can create and validate bundles locally; a real provider run still requires an explicitly reviewed plan and cost cap.
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
                  <a href={`/api/bench/runs/${run.runId}`}>Inspect run →</a>
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
            These values remain available for continuity and scrutiny. They are not a reproducible Phase 1 bundle,
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
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
