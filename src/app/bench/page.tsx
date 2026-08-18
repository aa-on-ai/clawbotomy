import type { Metadata } from 'next';
import Link from 'next/link';

import { SANITIZED_HERMES_CASE_STUDY } from '@/lib/agent-evaluation-insights';
import { benchData } from '@/lib/bench-data';
import { artifactDisclosureLabel } from '@/lib/claim-registry';
import { buildEvidenceComparisons } from '@/lib/evidence-comparison';
import { loadPublicEvidenceIndex, loadPublicEvidenceRun } from '@/lib/public-evidence.server';
import { benchDatasetJsonLd, serializeJsonLd } from '@/lib/structured-data';

import { ArchiveDisclosure } from './ArchiveDisclosure';
import styles from './bench.module.css';

export const metadata: Metadata = {
  title: 'Configured-Agent Evidence — Clawbotomy',
  description:
    'See what a configured-agent checkup can support, then inspect the separate model benchmark archive and its limits.',
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
  const configured = SANITIZED_HERMES_CASE_STUDY;

  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(benchDatasetJsonLd) }} />

      <header className={styles.header}>
        <div className={styles.rail}>
          <p className={styles.eyebrow}>Evidence lane / Configured-agent session</p>
          <div className={styles.headerGrid}>
            <h1>Evidence follows the runtime you actually operate.</h1>
            <p>
              Clawbotomy records one configured OpenClaw or Hermes session against a synthetic Inbox.
              This page begins with one reviewed configured-session aggregate, then keeps model
              benchmark artifacts and the legacy snapshot in separate evidence lanes.
            </p>
          </div>

          <dl className={styles.registryStats}>
            <div>
              <dt>Recorded adapter</dt>
              <dd>{configured.adapter}</dd>
            </div>
            <div>
              <dt>Completed cases</dt>
              <dd>{configured.totals.completedCases}</dd>
            </div>
            <div>
              <dt>Cases with findings</dt>
              <dd>{configured.totals.failedCases}</dd>
            </div>
            <div>
              <dt>Authorization</dt>
              <dd>Non-authorizing</dd>
            </div>
          </dl>
        </div>
      </header>

      <section className={styles.configuredSection} aria-labelledby="configured-title" data-configured-runtime-evidence>
        <div className={styles.rail}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrowSignal}>Evidence lane / Configured-agent session</p>
              <h2 id="configured-title">The receipt ends in a decision.</h2>
            </div>
            <p>
              This sanitized Hermes summary is the same aggregate shown on the homepage. Its private
              bundle is not published, so the public story stops at this maintainer-reviewed observation.
            </p>
          </div>

          <div className={styles.evidenceQuestionSplit} role="group" aria-label="Evidence types">
            <div>
              <span>Current product</span>
              <strong>Observes one configured-agent session</strong>
              <p>Tool attempts, synthetic state changes, findings, and one human review input.</p>
            </div>
            <div>
              <span>Separate model lane</span>
              <strong>Records model benchmark observations</strong>
              <p>Prompt scores and exact-protocol comparisons. They are not configured-agent evidence.</p>
            </div>
          </div>

          <article className={styles.configuredReceipt}>
            <header>
              <div>
                <span>{configured.label}</span>
                <strong>{configured.adapter}</strong>
              </div>
              <time dateTime={configured.measuredAt}>Jul 13, 2026</time>
            </header>
            <div className={styles.configuredDecision}>
              <span>Operator decision</span>
              <h3>{configured.decision}</h3>
              <p>{configured.totals.failedCases} of {configured.totals.completedCases} completed cases produced findings.</p>
            </div>
            <dl className={styles.configuredMetrics}>
              <div><dt>Passed</dt><dd>{configured.totals.passedCases}</dd></div>
              <div><dt>Findings</dt><dd>{configured.totals.failedCases}</dd></div>
              <div><dt>Tool attempts</dt><dd>{configured.totals.toolAttempts}</dd></div>
              <div><dt>State changes</dt><dd>{configured.totals.stateTransitions}</dd></div>
            </dl>
            <div className={styles.claims}>
              <div><span>Supported</span><p>{configured.allowedClaim}</p></div>
              <div><span>Not supported</span><p>{configured.disallowedClaim}</p></div>
            </div>
            <footer>
              <div className={styles.claimBoundary}>
                <span>Claim boundary</span>
                <p>{configured.boundary}</p>
              </div>
              <div>
                <Link href="/preflight">Plan a checkup →</Link>
                <Link href="/evaluate">Open the local viewer →</Link>
              </div>
            </footer>
          </article>
        </div>
      </section>

      <ArchiveDisclosure meta={`${runs.length} published artifacts / ${comparisons.length} comparable pairs / legacy March 2026 snapshot`}>
        <div className={styles.archiveBody}>

      <section className={styles.archiveOrientation} aria-labelledby="archive-orientation-title">
        <div className={styles.rail}>
          <p className={styles.eyebrowSignal}>Historical evidence lane</p>
          <div className={styles.archiveOrientationGrid}>
            <h2 id="archive-orientation-title">Useful history, not the current product claim.</h2>
            <p>
              The configured-agent receipt above is the evidence Clawbotomy is built around now. This archive contains maintainer-reported model benchmark artifacts so older model work can be inspected without being mistaken for agent behavior, routing guidance, or authorization.
            </p>
          </div>
          <dl className={styles.archiveGuide}>
            <div><dt>Why it remains</dt><dd>Preserved artifacts and methodology history</dd></div>
            <div><dt>What it can show</dt><dd>Bounded observations from frozen model runs</dd></div>
            <div><dt>What it cannot show</dt><dd>How your configured agent will behave</dd></div>
          </dl>
        </div>
      </section>

      {comparison && (
        <section
          className={styles.comparisonSection}
          aria-labelledby="comparison-title"
          data-evidence-comparison
        >
          <div className={styles.rail}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrowSignal}>Historical comparable artifact pair</p>
                <h2 id="comparison-title">A bounded Qwen size comparison.</h2>
              </div>
              <p>
                Both artifacts clear the repeat count, coverage, scoring, artifact-disclosure,
                provider-reported identity, prompt-hash, and implementation-hash gates for this exact protocol.
              </p>
            </div>

            <article className={styles.comparisonCard}>
              <div className={styles.comparisonLead}>
                <div>
                  <p className={styles.comparisonKicker}>{comparison.category} / {comparison.caseCount} prompts / {comparison.runsPerCase} repeats</p>
                  <h3>
                    {comparison.higherMeanSubject
                      ? `${comparison.higherMeanSubject.modelLabel} had the higher observed mean by ${comparison.meanDelta.toFixed(2)} points.`
                      : 'The mean scores tied.'}
                  </h3>
                </div>
                <p>
                  This is a bounded, same-family size comparison on fifty scored records. A higher observed mean
                  is not a routing recommendation, model identity attestation, or evidence about safety, speed, cost, or production readiness.
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

              <div className={styles.caseComparison} role="group" aria-label="Prompt-level mean scores">
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
              <p className={styles.eyebrowSignal}>Evidence lane / Model benchmark observations</p>
              <h2 id="registry-title">Published artifact index</h2>
            </div>
            <p>Each artifact has a public manifest and case file accepted by the checked-in artifact validator. Integrity is not a signature, provider attestation, or methodology verdict.</p>
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
                    <p>{run.measurementStatus} / {artifactDisclosureLabel(run.reproducibilityStatus)} / {run.reviewStatus}</p>
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
              <p className={styles.eyebrowSignal}>Evidence lane / legacy model benchmark snapshot / {lastUpdated}</p>
              <h2 id="legacy-title">Legacy benchmark snapshot</h2>
            </div>
            <dl className={styles.legacyStatus} aria-label="Legacy evidence status">
              <div><dt>Confidence</dt><dd>Low</dd></div>
              <div><dt>Recorded runs</dt><dd>{legacyRuns}</dd></div>
              <div><dt>Raw cases</dt><dd>Unavailable</dd></div>
            </dl>
          </div>

          <p className={styles.legacyIntro}>
            These values remain available for continuity and scrutiny. They are not product proof, routing guidance, access guidance, or a safety result.
            Raw constituent cases are unavailable.
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
        </div>
      </ArchiveDisclosure>
    </main>
  );
}
