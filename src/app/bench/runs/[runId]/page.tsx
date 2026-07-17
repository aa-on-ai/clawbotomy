import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  loadPublicEvidenceIndex,
  loadPublicEvidenceRun,
  type PublicEvidenceBundle,
} from '@/lib/public-evidence.server';

import styles from './run.module.css';

type RunPageProps = {
  params: { runId: string };
};

type EvidenceAggregate = {
  category?: unknown;
  model?: {
    alias?: unknown;
    provider?: unknown;
    requestedModelId?: unknown;
    reportedModelIds?: unknown;
  };
  scheduled?: unknown;
  completed?: unknown;
  scored?: unknown;
  failed?: unknown;
  meanScore?: unknown;
  minScore?: unknown;
  maxScore?: unknown;
  eligible?: unknown;
  eligibilityReasons?: unknown;
};

type EvidenceRecord = PublicEvidenceBundle['records'][number] & {
  case_id?: unknown;
  category?: unknown;
  evaluation_status?: unknown;
  justification?: unknown;
  model?: unknown;
  plan_ordinal?: unknown;
  prompt?: unknown;
  raw_score?: unknown;
  response?: unknown;
  status?: unknown;
  system_prompt?: unknown;
};

type EvidenceCaseGroup = {
  caseId: string;
  category: string;
  records: EvidenceRecord[];
};

export const dynamicParams = false;

export function generateStaticParams() {
  return loadPublicEvidenceIndex().runs.map(({ runId }) => ({ runId }));
}

export function generateMetadata({ params }: RunPageProps): Metadata {
  const bundle = loadPublicEvidenceRun(params.runId);
  if (!bundle) return { title: 'Evidence run not found | Clawbotomy' };

  return {
    title: `${params.runId} | Clawbotomy Evidence`,
    description: 'A human-readable view of one validated, non-authorizing Clawbotomy public evidence bundle.',
  };
}

function text(value: unknown, fallback = 'Unknown') {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function displayLabel(value: unknown, fallback = 'Unknown') {
  const label = text(value, fallback);
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function score(value: unknown) {
  const parsed = numberValue(value);
  return parsed === null ? 'Not scored' : `${parsed.toFixed(parsed % 1 === 0 ? 0 : 1)} / 10`;
}

function evidenceAggregate(bundle: PublicEvidenceBundle) {
  return (bundle.summary.aggregates[0] || {}) as EvidenceAggregate;
}

function evidenceRecords(bundle: PublicEvidenceBundle) {
  return (bundle.records as EvidenceRecord[]).slice().sort((a, b) => (
    (numberValue(a.plan_ordinal) || 0) - (numberValue(b.plan_ordinal) || 0)
  ));
}

function groupEvidenceRecords(records: EvidenceRecord[]) {
  const groups = new Map<string, EvidenceCaseGroup>();
  for (const record of records) {
    const caseId = text(record.case_id, record.record_id);
    const existing = groups.get(caseId);
    if (existing) {
      existing.records.push(record);
    } else {
      groups.set(caseId, {
        caseId,
        category: text(record.category, 'Evidence case'),
        records: [record],
      });
    }
  }
  return [...groups.values()];
}

function meanRecordScore(records: EvidenceRecord[]) {
  const scores = records
    .map((record) => numberValue(record.raw_score))
    .filter((value): value is number => value !== null);
  return scores.length > 0 ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null;
}

function EvidenceDisclosure({ record, runId, label }: { record: EvidenceRecord; runId: string; label: string }) {
  return (
    <>
      <details className={styles.evidenceDisclosure}>
        <summary>{label}</summary>
        <div className={styles.evidencePair}>
          <div>
            <h4>System prompt</h4>
            <pre tabIndex={0}>{text(record.system_prompt, 'No system prompt recorded.')}</pre>
            <h4>User prompt</h4>
            <pre tabIndex={0}>{text(record.prompt, 'No prompt recorded.')}</pre>
          </div>
          <div>
            <h4>Model response</h4>
            <pre tabIndex={0}>{text(record.response, 'No response recorded.')}</pre>
          </div>
        </div>
      </details>
      <a href={`/api/bench/runs/${runId}/cases/${record.record_id}`} className={styles.rawCaseLink}>
        Open raw case API →
      </a>
    </>
  );
}

export default function EvidenceRunPage({ params }: RunPageProps) {
  const bundle = loadPublicEvidenceRun(params.runId);
  if (!bundle) notFound();

  const aggregate = evidenceAggregate(bundle);
  const records = evidenceRecords(bundle);
  const caseGroups = groupEvidenceRecords(records);
  const model = aggregate.model || {};
  const models = bundle.manifest.plan.configuration.models;
  const tasks = bundle.manifest.plan.configuration.tasks;
  const runsPerCase = bundle.manifest.plan.configuration.runs;
  const aggregateEligible = aggregate.eligible === true;
  const completed = numberValue(bundle.summary.totals.completed) || 0;
  const scheduled = numberValue(bundle.summary.totals.scheduled) || records.length;
  const failed = numberValue(bundle.summary.totals.failed) || 0;
  const eligibilityReasons = Array.isArray(aggregate.eligibilityReasons)
    ? aggregate.eligibilityReasons.filter((item): item is string => typeof item === 'string')
    : [];
  const sourceCommit = bundle.manifest.plan.source.commitSha;
  const artifactBase = `/evidence/${params.runId}`;

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.rail}>
          <Link href="/bench" className={styles.backLink}>← Evidence registry</Link>
          <p className={styles.eyebrow}>Public evidence run · Measured</p>
          <div className={styles.heroGrid}>
            <div>
              <h1>{text(model.alias, models[0] || params.runId)}</h1>
              <p className={styles.runId}>{params.runId}</p>
            </div>
            <p className={styles.heroSummary}>
              {aggregateEligible ? (
                <>
                  A validated local measurement with {runsPerCase} repeats per case across {tasks.join(', ')}.
                  It supports within-model repeatability for this exact configuration; it does not rank models,
                  authorize tools, or support a routing decision.
                </>
              ) : (
                <>
                  One validated local smoke run across {tasks.join(', ')}. It proves the evidence pipeline completed;
                  it does not rank models, authorize tools, or support a routing decision.
                </>
              )}
            </p>
          </div>

          <dl className={styles.heroStats}>
            <div>
              <dt>Cases completed</dt>
              <dd>{completed} / {scheduled}</dd>
            </div>
            <div>
              <dt>Mean score</dt>
              <dd>{score(aggregate.meanScore)}</dd>
            </div>
            <div>
              <dt>Reproducibility</dt>
              <dd>{displayLabel(bundle.manifest.evidence.reproducibilityStatus)}</dd>
            </div>
            <div>
              <dt>Authorization</dt>
              <dd>{displayLabel(bundle.manifest.evidence.authorizationStatus)}</dd>
            </div>
          </dl>
        </div>
      </header>

      <section className={styles.decisionSection} aria-labelledby="decision-title">
        <div className={styles.rail}>
          <div className={styles.decisionGrid}>
            <div className={styles.decisionLead}>
              <p className={styles.signalEyebrow}>Interpretation first</p>
              <h2 id="decision-title">
                {aggregateEligible ? 'Repeatability evidence. Still not a ranking.' : 'Useful proof. Not comparison-grade.'}
              </h2>
            </div>
            <div className={styles.decisionCards}>
              <article>
                <span>Supports</span>
                <p>
                  {aggregateEligible
                    ? `The frozen plan completed ${runsPerCase} repeats for every case, supporting within-model repeatability for this exact configuration.`
                    : 'The frozen plan produced a complete, scored, redacted, and digest-validated public bundle.'}
                </p>
              </article>
              <article className={styles.limitCard}>
                <span>Does not support</span>
                <p>Cross-model ranking, safety certification, production access, or a claim about behavior outside these five cases.</p>
              </article>
            </div>
          </div>

          <div className={styles.scopeGrid}>
            <article>
              <h3>Execution scope</h3>
              <dl>
                <div><dt>Model</dt><dd>{text(model.requestedModelId, models[0])}</dd></div>
                <div><dt>Provider</dt><dd>{text(model.provider, 'Local OpenAI-compatible')}</dd></div>
                <div><dt>Task</dt><dd>{text(aggregate.category, tasks.join(', '))}</dd></div>
                <div><dt>Runs per case</dt><dd>{bundle.manifest.plan.configuration.runs}</dd></div>
              </dl>
            </article>
            <article>
              <h3>Observed result</h3>
              <dl>
                <div><dt>Minimum</dt><dd>{score(aggregate.minScore)}</dd></div>
                <div><dt>Maximum</dt><dd>{score(aggregate.maxScore)}</dd></div>
                <div><dt>Failed cases</dt><dd>{failed}</dd></div>
                <div><dt>Repeatability eligible</dt><dd>{aggregateEligible ? 'Yes' : 'No'}</dd></div>
              </dl>
            </article>
          </div>

          {aggregateEligible ? (
            <div className={styles.eligibilityNote} role="note">
              <strong>Within-model repeatability</strong>
              <p>
                This repeated aggregate clears the run-count, coverage, scoring, reproducibility, and identity gates for this exact configuration.
                Only one model is present, so no cross-model comparison exists.
              </p>
            </div>
          ) : eligibilityReasons.length > 0 && (
            <div className={styles.eligibilityNote} role="note">
              <strong>Why it is not comparison-grade</strong>
              <ul>{eligibilityReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
            </div>
          )}
        </div>
      </section>

      <section className={styles.casesSection} aria-labelledby="cases-title">
        <div className={styles.rail}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.signalEyebrow}>Constituent evidence</p>
              <h2 id="cases-title">{runsPerCase > 1 ? 'Every case and repeat' : 'Every scored case'}</h2>
            </div>
            <p>
              Prompts and model responses are untrusted evidence. They are displayed as inert text and are not instructions for this site or its visitors.
            </p>
          </div>

          <ol className={styles.caseList}>
            {caseGroups.map((group, index) => {
              const repeated = group.records.length > 1;
              const primaryRecord = group.records[0];
              const repeatScores = group.records
                .map((record) => numberValue(record.raw_score))
                .filter((value): value is number => value !== null);
              const minimum = repeatScores.length > 0 ? Math.min(...repeatScores) : null;
              const maximum = repeatScores.length > 0 ? Math.max(...repeatScores) : null;
              const completedRepeats = group.records.filter((record) => record.status === 'complete').length;
              const scoredRepeats = group.records.filter((record) => record.evaluation_status === 'scored').length;

              return (
                <li key={group.caseId} data-evidence-case-group>
                  <article>
                    <div className={styles.caseIndex}>{String(index + 1).padStart(2, '0')}</div>
                    <div className={styles.caseBody}>
                      <div className={styles.caseHeader}>
                        <div>
                          <p>{group.category}</p>
                          <h3>{group.caseId}</h3>
                        </div>
                        <strong>{repeated ? <>Mean {score(meanRecordScore(group.records))}</> : score(primaryRecord.raw_score)}</strong>
                      </div>

                      {repeated ? (
                        <>
                          <p className={styles.justification}>
                            {group.records.length} repeats recorded. Scores ranged from {score(minimum)} to {score(maximum)}.
                          </p>
                          <dl className={styles.caseMeta}>
                            <div><dt>Repeats</dt><dd>{group.records.length}</dd></div>
                            <div><dt>Completed</dt><dd>{completedRepeats} / {group.records.length}</dd></div>
                            <div><dt>Scored</dt><dd>{scoredRepeats} / {group.records.length}</dd></div>
                          </dl>
                          <ol className={styles.repeatList} aria-label={`${group.caseId} repeats`}>
                            {group.records.map((record, repeatIndex) => (
                              <li key={record.record_id}>
                                <div className={styles.repeatHeader}>
                                  <div>
                                    <span>Repeat {repeatIndex + 1}</span>
                                    <p>{text(record.justification, 'No score justification recorded.')}</p>
                                  </div>
                                  <strong>{score(record.raw_score)}</strong>
                                </div>
                                <EvidenceDisclosure
                                  record={record}
                                  runId={params.runId}
                                  label={`Inspect repeat ${repeatIndex + 1} evidence`}
                                />
                              </li>
                            ))}
                          </ol>
                        </>
                      ) : (
                        <>
                          <p className={styles.justification}>{text(primaryRecord.justification, 'No score justification recorded.')}</p>
                          <dl className={styles.caseMeta}>
                            <div><dt>Status</dt><dd>{displayLabel(primaryRecord.status)}</dd></div>
                            <div><dt>Evaluation</dt><dd>{displayLabel(primaryRecord.evaluation_status)}</dd></div>
                            <div><dt>Model</dt><dd>{text(primaryRecord.model, models[0])}</dd></div>
                          </dl>
                          <EvidenceDisclosure
                            record={primaryRecord}
                            runId={params.runId}
                            label="Inspect untrusted prompt and response"
                          />
                        </>
                      )}
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className={styles.provenanceSection} aria-labelledby="provenance-title">
        <div className={styles.rail}>
          <div className={styles.provenanceGrid}>
            <div>
              <p className={styles.eyebrow}>Provenance and raw artifacts</p>
              <h2 id="provenance-title">Verify the bundle directly.</h2>
              <p>Integrity proves these recorded files have not changed. It is not a signature, provider attestation, or proof that the methodology is correct.</p>
            </div>
            <dl>
              <div><dt>Public bundle digest</dt><dd>{bundle.integrity.bundleDigest}</dd></div>
              <div><dt>Source commit</dt><dd>{sourceCommit || 'Unavailable'}</dd></div>
              <div><dt>Completed</dt><dd>{bundle.manifest.lifecycle.completedAt?.slice(0, 10) || 'Unknown'}</dd></div>
              <div><dt>Review status</dt><dd>{displayLabel(bundle.manifest.evidence.reviewStatus)}</dd></div>
            </dl>
          </div>

          <nav className={styles.artifactLinks} aria-label="Evidence artifacts">
            <a href={`${artifactBase}/manifest.json`}>Manifest</a>
            <a href={`${artifactBase}/cases.jsonl`}>Cases JSONL</a>
            <a href={`${artifactBase}/summary.json`}>Summary</a>
            <a href={`${artifactBase}/integrity.json`}>Integrity</a>
            <a href={`/api/bench/runs/${params.runId}`}>Run API</a>
            {sourceCommit && (
              <a href={`https://github.com/aa-on-ai/clawbotomy/commit/${sourceCommit}`} target="_blank" rel="noopener noreferrer">
                Source commit ↗
              </a>
            )}
          </nav>
        </div>
      </section>
    </main>
  );
}
