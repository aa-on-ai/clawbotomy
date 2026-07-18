'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';

import {
  AGENT_ADAPTERS,
  DIAGNOSTIC_GUIDE,
  MAX_PRIVATE_BUNDLE_FILE_BYTES,
  PRIVATE_BUNDLE_FILENAMES,
  STATUS_GUIDE,
  parseEvaluationAttempt,
  parsePrivateInboxBundle,
  type AdapterId,
  type EvaluationAttemptReceipt,
  type PrivateRunReceipt,
  type RunStatus,
  type SafeCaseReceipt,
} from '@/lib/agent-evaluation';
import { comparePrivateInterventionPair } from '@/lib/agent-evaluation-private-comparator';
import {
  SANITIZED_HERMES_CASE_STUDY,
  deriveEvidenceRecommendations,
  getRunDecision,
} from '@/lib/agent-evaluation-insights';

import styles from './evaluate.module.css';

type LocalRun = PrivateRunReceipt | EvaluationAttemptReceipt;
type ImportState = 'idle' | 'reading' | 'loaded' | 'error';
type ComparisonAggregate = {
  passedCases: number;
  findings: number;
  targetedBaselineFailures: number;
  approvalSentinelFailures: number;
  recoverySentinelFailures: number;
  findingCategories: string[];
};
type PairedComparison = {
  outcomeLabel: 'blocked' | 'ineligible' | 'eligible';
  comparabilityBlockers: string[];
  eligibilityBlockers: string[];
  control: { interventionDigestPrefix: string | null; aggregate: ComparisonAggregate };
  treatment: { interventionDigestPrefix: string | null; aggregate: ComparisonAggregate };
  targetClusterSize: number;
  targetFailureReduction: number;
};

const VALIDATE_COMMAND = 'npm run inbox -- validate .clawbotomy/inbox-runs/<runId>';

function runKey(run: LocalRun) {
  return run.attemptId;
}

function runLabel(run: LocalRun) {
  return run.source === 'private_bundle' ? run.runId : run.attemptId;
}

function statusLabel(status: RunStatus) {
  return STATUS_GUIDE.find((item) => item.status === status)?.label || status;
}

function stateChangeTotal(caseReceipt: SafeCaseReceipt) {
  return Object.values(caseReceipt.stateChanges).reduce((total, count) => total + count, 0);
}

function comparisonRunLabel(run: PrivateRunReceipt, index: number) {
  return `Run ${index + 1} · ${run.adapterLabel} · ${run.intervention ? 'treatment candidate' : 'control candidate'}`;
}

export function AgentEvaluationWorkbench() {
  const [adapterId, setAdapterId] = useState<AdapterId>('openclaw');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [runs, setRuns] = useState<LocalRun[]>([]);
  const [selectedRunKey, setSelectedRunKey] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [controlRunKey, setControlRunKey] = useState<string | null>(null);
  const [treatmentRunKey, setTreatmentRunKey] = useState<string | null>(null);
  const [pairedComparison, setPairedComparison] = useState<PairedComparison | null>(null);
  const [caseQuery, setCaseQuery] = useState('');
  const [importState, setImportState] = useState<ImportState>('idle');
  const [importMessage, setImportMessage] = useState(
    'Select one launcher receipt with its complete bundle, or one infrastructure-failure receipt. Files never leave this browser.',
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adapter = AGENT_ADAPTERS.find((item) => item.id === adapterId) || AGENT_ADAPTERS[0];
  const selectedRun = runs.find((run) => runKey(run) === selectedRunKey) || runs[0] || null;
  const selectedBundle = selectedRun?.source === 'private_bundle' ? selectedRun : null;
  const filteredCases = useMemo(() => {
    if (!selectedBundle) return [];
    const query = caseQuery.trim().toLowerCase();
    if (!query) return selectedBundle.cases;
    return selectedBundle.cases.filter((item) => (
      `${item.caseId} ${item.scenarioId} ${item.capabilityId}`.toLowerCase().includes(query)
    ));
  }, [caseQuery, selectedBundle]);
  const selectedCase = filteredCases.find((item) => item.caseId === selectedCaseId)
    || filteredCases[0]
    || null;
  const comparableRuns = runs.filter((run): run is PrivateRunReceipt => run.source === 'private_bundle');
  const comparableRunKeys = new Set(comparableRuns.map((run) => runKey(run)));
  const resolvedControlRunKey = controlRunKey && comparableRunKeys.has(controlRunKey)
    ? controlRunKey
    : comparableRuns[0]
      ? runKey(comparableRuns[0])
      : null;
  const resolvedTreatmentRunKey = treatmentRunKey && comparableRunKeys.has(treatmentRunKey)
    ? treatmentRunKey
    : comparableRuns[1]
      ? runKey(comparableRuns[1])
      : null;
  const controlRun = comparableRuns.find((run) => runKey(run) === resolvedControlRunKey) || null;
  const treatmentRun = comparableRuns.find((run) => runKey(run) === resolvedTreatmentRunKey) || null;
  const planDigests = new Set(comparableRuns.map((run) => run.planSha256));
  const comparisonState = comparableRuns.length < 2
    ? 'Load at least two launcher-bound bundles to compare case counts.'
    : planDigests.size === 1
      ? 'Same plan digest. Case counts can be compared directly.'
      : 'Different plan digests. Keep the rows separate; direct case deltas would be misleading.';
  useEffect(() => {
    let cancelled = false;
    setPairedComparison(null);
    if (!controlRun || !treatmentRun) return () => { cancelled = true; };
    comparePrivateInterventionPair({ control: controlRun, treatment: treatmentRun })
      .then((result) => {
        if (!cancelled) setPairedComparison(result as unknown as PairedComparison);
      });
    return () => { cancelled = true; };
  }, [controlRun, treatmentRun]);
  const recommendations = useMemo(
    () => selectedBundle ? deriveEvidenceRecommendations(selectedBundle) : [],
    [selectedBundle],
  );
  const decision = useMemo(
    () => selectedBundle ? getRunDecision(selectedBundle, recommendations) : null,
    [recommendations, selectedBundle],
  );

  const selectRun = (run: LocalRun) => {
    setSelectedRunKey(runKey(run));
    setCaseQuery('');
    setSelectedCaseId(run.source === 'private_bundle' ? run.cases[0]?.caseId || null : null);
  };

  const inspectRecommendation = (caseId: string) => {
    setCaseQuery('');
    setSelectedCaseId(caseId);
    window.setTimeout(() => {
      document.getElementById('inspect-evidence')?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
  };

  const copyCommand = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(adapter.launchCommand);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
    window.setTimeout(() => setCopyState('idle'), 2600);
  };

  const addOrReplaceRun = (run: LocalRun) => {
    const key = runKey(run);
    setRuns((current) => {
      const withoutExisting = current.filter((item) => runKey(item) !== key);
      return [run, ...withoutExisting];
    });
    if (run.source === 'private_bundle') {
      setControlRunKey((current) => current || key);
      setTreatmentRunKey((current) => current || (controlRunKey ? key : null));
    }
    selectRun(run);
  };

  const readEvidence = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    setImportState('reading');
    setImportMessage('Reading local files…');

    try {
      if (files.length === 0) throw new Error('Choose files to inspect.');
      if (files.some((file) => file.size > MAX_PRIVATE_BUNDLE_FILE_BYTES)) {
        throw new Error('A selected file exceeds the local viewer’s 8 MB per-file bound.');
      }

      const attemptFiles = files.filter((file) => /^evaluation-attempt-.*\.json$/.test(file.name));
      if (attemptFiles.length > 1) {
        throw new Error('Select exactly one evaluation-attempt receipt at a time.');
      }
      const attemptFile = attemptFiles[0];
      const bundleFiles = new Map(files.map((file) => [file.name, file]));
      const hasBundleFile = PRIVATE_BUNDLE_FILENAMES.some((name) => bundleFiles.has(name));

      if (attemptFile && !hasBundleFile) {
        if (files.length !== 1) {
          throw new Error('Select one attempt receipt by itself, or with its three bound bundle files.');
        }
        const attempt = parseEvaluationAttempt(await attemptFile.text());
        addOrReplaceRun(attempt);
        setImportState('loaded');
        setImportMessage(attempt.completeBundleWritten
          ? attempt.exitCode === 1
            ? `${attempt.adapterLabel} attempt loaded: a ${statusLabel(attempt.status).toLowerCase()} bundle was recovered after process exit 1. Load this receipt with its three bundle files for case receipts.`
            : `${attempt.adapterLabel} attempt loaded: a ${statusLabel(attempt.status).toLowerCase()} bundle exists. Load this receipt with its three bundle files for case receipts.`
          : `${attempt.adapterLabel} infrastructure failure loaded. No complete bundle was scored.`);
        return;
      }

      const missing: string[] = PRIVATE_BUNDLE_FILENAMES.filter((name) => !bundleFiles.has(name));
      if (!attemptFile) missing.unshift('evaluation-attempt-*.json');
      if (missing.length > 0 || files.length !== 4) {
        throw new Error(`Select one evaluation-attempt receipt with manifest.json, summary.json, and cases.jsonl. Missing: ${missing.join(', ') || 'none; remove extra files'}.`);
      }
      const [attemptText, manifestText, summaryText, casesText] = await Promise.all([
        attemptFile.text(),
        bundleFiles.get('manifest.json')!.text(),
        bundleFiles.get('summary.json')!.text(),
        bundleFiles.get('cases.jsonl')!.text(),
      ]);
      const receipt = parsePrivateInboxBundle({ attemptText, manifestText, summaryText, casesText });
      addOrReplaceRun(receipt);
      setImportState('loaded');
      setImportMessage(
        `${receipt.adapterLabel} ${statusLabel(receipt.status).toLowerCase()} loaded: ${receipt.totals.passedCases}/${receipt.totals.completedCases} cases passed.`,
      );
    } catch (error) {
      setImportState('error');
      setImportMessage(error instanceof Error ? error.message : 'The selected evidence could not be read.');
    }
  };

  const removeRun = (run: LocalRun) => {
    const key = runKey(run);
    setRuns((current) => current.filter((item) => runKey(item) !== key));
    if (controlRunKey === key) setControlRunKey(null);
    if (treatmentRunKey === key) setTreatmentRunKey(null);
    if (selectedRunKey === key) {
      const next = runs.find((item) => runKey(item) !== key) || null;
      setSelectedRunKey(next ? runKey(next) : null);
      setSelectedCaseId(next?.source === 'private_bundle' ? next.cases[0]?.caseId || null : null);
    }
  };

  return (
    <>
      <section id="connect-agent" className={styles.connectSection} aria-labelledby="connect-title">
        <div className={styles.rail}>
          <div className={styles.sectionHeading}>
            <p className={styles.sectionIndex}>02 · Connect</p>
            <div>
              <h2 id="connect-title">Choose the runtime you actually operate.</h2>
              <p>
                Both bridges expose the same eight mock-Inbox tools and speak the same fixed
                protocol. The runtime-specific isolation stays in the adapter.
              </p>
            </div>
          </div>

          <div className={styles.connectorLayout}>
            <fieldset className={styles.adapterSelector}>
              <legend>Agent adapter</legend>
              {AGENT_ADAPTERS.map((item) => (
                <label
                  key={item.id}
                  className={item.id === adapterId ? styles.adapterSelected : undefined}
                >
                  <input
                    type="radio"
                    data-ads-target-ok
                    name="agent-adapter"
                    value={item.id}
                    checked={item.id === adapterId}
                    onChange={() => {
                      setAdapterId(item.id);
                      setCopyState('idle');
                    }}
                  />
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.runtime}</small>
                  </span>
                </label>
              ))}
              <p>
                Need a plan first? <a href="/preflight">Build it in the browser-local planner.</a>
              </p>
            </fieldset>

            <article className={styles.launchPanel}>
              <div className={styles.launchHeader}>
                <div>
                  <p aria-live="polite">{adapter.clientId}</p>
                  <h3>{adapter.name} launch</h3>
                </div>
                <span>Local process</span>
              </div>
              <p className={styles.adapterDescription}>{adapter.description}</p>

              <div className={styles.prerequisites}>
                <h4>Before you launch</h4>
                <ul>
                  {adapter.prerequisites.map((item) => <li key={item}>{item}</li>)}
                </ul>
                <p>{adapter.trustNote}</p>
              </div>

              <div className={styles.commandBlock}>
                <div>
                  <h4>Copyable launch command</h4>
                  <button type="button" onClick={copyCommand}>
                    {copyState === 'copied' ? 'Copied' : copyState === 'error' ? 'Copy failed' : 'Copy command'}
                  </button>
                </div>
                <pre tabIndex={0} aria-label={`${adapter.name} evaluation launch command`}>
                  <code>{adapter.launchCommand}</code>
                </pre>
              </div>
            </article>
          </div>

          <section className={styles.statusGuide} aria-labelledby="status-guide-title">
            <div className={styles.statusGuideHeader}>
              <h3 id="status-guide-title">Read the process exit before the score</h3>
              <code>npm run inbox -- validate …</code>
            </div>
            <div className={styles.statusRows}>
              {STATUS_GUIDE.map((item) => (
                <div key={item.status} data-status={item.status}>
                  <span className={styles.statusSignal} aria-hidden="true" />
                  <strong>{item.label}</strong>
                  <code>exit {item.exitCode}</code>
                  <p>{item.meaning}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section id="inspect-evidence" className={styles.evidenceSection} aria-labelledby="evidence-title">
        <div className={styles.rail}>
          <div className={styles.sectionHeadingDark}>
            <p className={styles.sectionIndex}>03 · Inspect</p>
            <div>
              <h2 id="evidence-title">Open a private receipt without opening the raw payload.</h2>
              <p>
                The viewer derives case, tool, state, assertion, and digest receipts in memory.
                It never renders tool arguments, message bodies, prompts, transcripts, local paths,
                or raw event payloads.
              </p>
            </div>
          </div>

          <div className={styles.importBar} aria-busy={importState === 'reading'}>
            <div>
              <h3>Load local evidence</h3>
              <p>
                Complete run: select one <code>evaluation-attempt-*.json</code> receipt with
                <code> manifest.json</code>, <code> summary.json</code>, and
                <code> cases.jsonl</code>. Infrastructure-only: select the attempt receipt alone.
              </p>
            </div>
            <input
              ref={fileInputRef}
              id="private-evidence-files"
              type="file"
              accept=".json,.jsonl,application/json"
              multiple
              hidden
              tabIndex={-1}
              aria-hidden="true"
              onChange={readEvidence}
            />
            <button
              type="button"
              className={styles.fileButton}
              onClick={() => fileInputRef.current?.click()}
              disabled={importState === 'reading'}
            >
              {importState === 'reading' ? 'Reading…' : 'Choose local files'}
            </button>
            <p
              className={`${styles.importMessage} ${importState === 'error' ? styles.importError : ''}`}
              role={importState === 'error' ? 'alert' : 'status'}
              aria-live="polite"
            >
              {importMessage}
            </p>
          </div>

          {runs.length === 0 ? (
            <div className={styles.evidenceEmpty}>
              <p>No private runs loaded</p>
              <h3>The browser holds nothing until you choose the files.</h3>
              <p>
                Use the fixed launcher and validator in your terminal first. This viewer requires the
                launcher receipt that binds a replay-validated bundle, then derives an allowlisted display model;
                it does not perform cryptographic or semantic validation itself.
              </p>
              <a className={styles.exampleLink} href="#act-on-findings">
                Review a sanitized verified example
              </a>
              <pre tabIndex={0}><code>{VALIDATE_COMMAND}</code></pre>
            </div>
          ) : (
            <div className={styles.viewer}>
              <aside className={styles.runIndex} aria-label="Loaded private runs">
                <div>
                  <span>Loaded locally</span>
                  <strong>{runs.length}</strong>
                </div>
                <ul>
                  {runs.map((run) => {
                    const key = runKey(run);
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => selectRun(run)}
                          aria-pressed={key === runKey(selectedRun || run)}
                          data-status={run.status}
                        >
                          <span className={styles.statusSignal} aria-hidden="true" />
                          <span>
                            <strong>{run.adapterLabel}</strong>
                            <small>{runLabel(run)}</small>
                          </span>
                          <em>{statusLabel(run.status)}</em>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </aside>

              {selectedRun ? (
                <article className={styles.runViewer}>
                  <header className={styles.runHeader}>
                    <div>
                      <p>{selectedRun.clientId}</p>
                      <h3>{runLabel(selectedRun)}</h3>
                    </div>
                    <div className={styles.runHeaderActions}>
                      <span data-status={selectedRun.status}>
                        <i className={styles.statusSignal} aria-hidden="true" />
                        {statusLabel(selectedRun.status)}
                      </span>
                      <button type="button" onClick={() => removeRun(selectedRun)}>
                        Unload from viewer
                      </button>
                    </div>
                  </header>

                  {selectedRun.source === 'attempt_receipt' ? (
                    <div className={styles.failureReceipt}>
                      <p className={styles.failureCode}>
                        exit {selectedRun.exitCode} · {selectedRun.completeBundleWritten
                          ? selectedRun.exitCode === 1
                            ? 'replay-validated bundle recovered'
                            : 'replay-validated bundle recorded'
                          : 'no complete bundle'}
                      </p>
                      <h4>
                        {selectedRun.completeBundleWritten
                          ? selectedRun.exitCode === 1
                            ? 'Evidence exists, but the adapter did not exit normally.'
                            : 'Evidence exists; add the bound files for case receipts.'
                          : 'Infrastructure stopped the measurement.'}
                      </h4>
                      <p>
                        {selectedRun.completeBundleWritten
                          ? selectedRun.exitCode === 1
                            ? 'Validate the recovered bundle directly, then load this receipt with its three evidence files for case-level inspection. The process anomaly remains visible.'
                            : 'Load this receipt with its three bound evidence files for case-level inspection. The viewer will require the receipt and bundle to agree.'
                          : 'This attempt is not a failed agent score. Fix the runtime or protocol issue, then launch a new attempt from the same reviewed plan.'}
                      </p>
                      <dl>
                        <div><dt>Adapter</dt><dd>{selectedRun.adapterLabel}</dd></div>
                        <div><dt>Model label</dt><dd>{selectedRun.modelLabel}</dd></div>
                        <div><dt>Plan digest</dt><dd><code className={styles.fullDigest}>{selectedRun.planSha256}</code></dd></div>
                        <div><dt>Completed</dt><dd>{new Date(selectedRun.completedAt).toLocaleString()}</dd></div>
                        {selectedRun.bundle ? (
                          <div><dt>Bound run</dt><dd><code>{selectedRun.bundle.runId}</code></dd></div>
                        ) : null}
                      </dl>
                      {selectedRun.diagnosticCodes.length > 0 ? (
                        <div className={styles.safeDiagnostic}>
                          <h5>Diagnostic categories</h5>
                          <ul>
                            {selectedRun.diagnosticCodes.map((code) => (
                              <li key={code}><code>{code}</code><span>{DIAGNOSTIC_GUIDE[code]}</span></li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      <dl className={styles.receiptStrip}>
                        <div><dt>Process exit</dt><dd>{selectedRun.exitCode}</dd></div>
                        <div><dt>Cases passed</dt><dd>{selectedRun.totals.passedCases}/{selectedRun.totals.completedCases}</dd></div>
                        <div><dt>Findings</dt><dd>{selectedRun.totals.failedCases}</dd></div>
                        <div><dt>Tool attempts</dt><dd>{selectedRun.totals.toolAttempts}</dd></div>
                        <div><dt>State transitions</dt><dd>{selectedRun.totals.stateTransitions}</dd></div>
                      </dl>

                      <div className={styles.caseWorkspace}>
                        <div className={styles.caseIndex}>
                          <label htmlFor="case-search">Filter case receipts</label>
                          <input
                            id="case-search"
                            type="search"
                            value={caseQuery}
                            placeholder="Scenario or capability"
                            onChange={(event) => setCaseQuery(event.target.value)}
                          />
                          <p>{filteredCases.length} of {selectedRun.cases.length} cases</p>
                          <ul>
                            {filteredCases.map((item) => (
                              <li key={item.caseId}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedCaseId(item.caseId)}
                                  aria-pressed={item.caseId === selectedCase?.caseId}
                                  data-status={item.status === 'passed' ? 'passed' : 'findings'}
                                >
                                  <span className={styles.statusSignal} aria-hidden="true" />
                                  <span>
                                    <strong>{item.scenarioId.replace('inbox.', '')}</strong>
                                    <small>{item.capabilityId.replace('_', ' ')}</small>
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {selectedCase ? (
                          <section className={styles.caseReceipt} aria-labelledby="case-receipt-title">
                            <div className={styles.caseReceiptHeader}>
                              <div>
                                <p>{selectedCase.capabilityId}</p>
                                <h4 id="case-receipt-title">{selectedCase.scenarioId}</h4>
                              </div>
                              <span data-status={selectedCase.status === 'passed' ? 'passed' : 'findings'}>
                                <i className={styles.statusSignal} aria-hidden="true" />
                                {selectedCase.status === 'passed' ? 'Passed' : 'Finding'}
                              </span>
                            </div>

                            <div className={styles.receiptGroups}>
                              <section>
                                <h5>Tool receipt</h5>
                                <dl>
                                  <div><dt>Attempts</dt><dd>{selectedCase.toolAttempts}</dd></div>
                                  <div><dt>Results</dt><dd>{selectedCase.toolResults}</dd></div>
                                </dl>
                                {selectedCase.tools.length > 0 ? (
                                  <ul>{selectedCase.tools.map((tool) => <li key={tool}><code>{tool}</code></li>)}</ul>
                                ) : <p>No allowed tools were attempted.</p>}
                              </section>

                              <section>
                                <h5>State receipt</h5>
                                <dl>
                                  <div><dt>Transitions</dt><dd>{selectedCase.stateTransitions}</dd></div>
                                  <div><dt>Changed records</dt><dd>{stateChangeTotal(selectedCase)}</dd></div>
                                </dl>
                                <ul>
                                  {Object.entries(selectedCase.stateChanges).map(([collection, count]) => (
                                    <li key={collection}><span>{collection}</span><strong>{count}</strong></li>
                                  ))}
                                </ul>
                              </section>

                              <section>
                                <h5>Assertion receipt</h5>
                                <dl>
                                  <div><dt>Passed</dt><dd>{selectedCase.passedAssertions}</dd></div>
                                  <div><dt>Failed</dt><dd>{selectedCase.failedAssertions.length}</dd></div>
                                </dl>
                                {selectedCase.failedAssertions.length > 0 ? (
                                  <ul>{selectedCase.failedAssertions.map((assertion) => <li key={assertion}><code>{assertion}</code></li>)}</ul>
                                ) : <p>No failed assertion IDs.</p>}
                              </section>
                            </div>

                            <footer className={styles.caseDigest}>
                              <span>Record digest</span>
                              <code className={styles.fullDigest}>{selectedCase.recordDigest}</code>
                            </footer>
                          </section>
                        ) : (
                          <div className={styles.caseEmpty}>
                            <h4>No matching case receipts</h4>
                            <p>Clear the filter to inspect the complete run.</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </article>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <section id="compare-runs" className={styles.compareSection} aria-labelledby="compare-title">
        <div className={styles.rail}>
          <div className={styles.sectionHeading}>
            <p className={styles.sectionIndex}>04 · Compare</p>
            <div>
              <h2 id="compare-title">Compare receipts without flattening their provenance.</h2>
              <p>{comparisonState}</p>
            </div>
          </div>

          {runs.length === 0 ? (
            <div className={styles.compareEmpty}>
              <p>Comparison waits for local evidence.</p>
              <a href="#inspect-evidence">Load a run above</a>
            </div>
          ) : (
            <>
              <article className={styles.privatePairPanel}>
                <header className={styles.privatePairHeader}>
                  <div>
                    <p>Private local comparison</p>
                    <h3>One paired session</h3>
                  </div>
                  <span>Non-authorizing intervention only</span>
                </header>

                <div className={styles.pairSelectors}>
                  <label>
                    <span>Control</span>
                    <select
                      value={resolvedControlRunKey || ''}
                      onChange={(event) => setControlRunKey(event.target.value || null)}
                    >
                      <option value="">Select one loaded bundle</option>
                      {comparableRuns.map((run, index) => (
                        <option key={runKey(run)} value={runKey(run)}>
                          {comparisonRunLabel(run, index)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Treatment</span>
                    <select
                      value={resolvedTreatmentRunKey || ''}
                      onChange={(event) => setTreatmentRunKey(event.target.value || null)}
                    >
                      <option value="">Select one loaded bundle</option>
                      {comparableRuns.map((run, index) => (
                        <option key={runKey(run)} value={runKey(run)}>
                          {comparisonRunLabel(run, index)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <p className={styles.privatePairNote}>
                  Provider execution is not launched or authorized by this UI. The pair result is
                  bounded to one local control-versus-treatment session and cannot authorize a deployment,
                  permission change, or broader benchmark claim.
                </p>

                {pairedComparison ? (
                  <div className={styles.privatePairResults}>
                    <div className={styles.privatePairStatus}>
                      <strong>{pairedComparison.outcomeLabel === 'eligible' ? 'Eligible pair' : pairedComparison.outcomeLabel === 'ineligible' ? 'Ineligible pair' : 'Pair blocked'}</strong>
                      <span>
                        Treatment intervention digest:
                        {' '}
                        <code>{pairedComparison.treatment.interventionDigestPrefix || 'none'}</code>
                      </span>
                    </div>

                    <div className={styles.privatePairGrid}>
                      <article>
                        <h4>Control</h4>
                        <dl>
                          <div><dt>Passed</dt><dd>{pairedComparison.control.aggregate.passedCases}</dd></div>
                          <div><dt>Findings</dt><dd>{pairedComparison.control.aggregate.findings}</dd></div>
                          <div><dt>Target cluster</dt><dd>{pairedComparison.control.aggregate.targetedBaselineFailures}/{pairedComparison.targetClusterSize}</dd></div>
                          <div><dt>Approval sentinel</dt><dd>{pairedComparison.control.aggregate.approvalSentinelFailures}</dd></div>
                          <div><dt>Recovery sentinel</dt><dd>{pairedComparison.control.aggregate.recoverySentinelFailures}</dd></div>
                        </dl>
                      </article>

                      <article>
                        <h4>Treatment</h4>
                        <dl>
                          <div><dt>Passed</dt><dd>{pairedComparison.treatment.aggregate.passedCases}</dd></div>
                          <div><dt>Findings</dt><dd>{pairedComparison.treatment.aggregate.findings}</dd></div>
                          <div><dt>Target cluster</dt><dd>{pairedComparison.treatment.aggregate.targetedBaselineFailures}/{pairedComparison.targetClusterSize}</dd></div>
                          <div><dt>Approval sentinel</dt><dd>{pairedComparison.treatment.aggregate.approvalSentinelFailures}</dd></div>
                          <div><dt>Recovery sentinel</dt><dd>{pairedComparison.treatment.aggregate.recoverySentinelFailures}</dd></div>
                        </dl>
                      </article>

                      <article>
                        <h4>Eligibility</h4>
                        <dl>
                          <div><dt>Outcome</dt><dd>{pairedComparison.outcomeLabel}</dd></div>
                          <div><dt>Target reduction</dt><dd>{pairedComparison.targetFailureReduction}</dd></div>
                        </dl>
                        <div className={styles.privatePairBlockers}>
                          <span>Comparability blockers</span>
                          {pairedComparison.comparabilityBlockers.length > 0 ? (
                            <ul>
                              {pairedComparison.comparabilityBlockers.map((blocker) => (
                                <li key={blocker}><code>{blocker}</code></li>
                              ))}
                            </ul>
                          ) : <p>None</p>}
                        </div>
                        <div className={styles.privatePairBlockers}>
                          <span>Eligibility blockers</span>
                          {pairedComparison.eligibilityBlockers.length > 0 ? (
                            <ul>
                              {pairedComparison.eligibilityBlockers.map((blocker) => (
                                <li key={blocker}><code>{blocker}</code></li>
                              ))}
                            </ul>
                          ) : <p>None</p>}
                        </div>
                      </article>
                    </div>
                  </div>
                ) : (
                  <div className={styles.privatePairEmpty}>
                    <p>Load two replay-bound private bundles and assign one control arm plus one treatment arm.</p>
                  </div>
                )}
              </article>

              <div className={styles.comparisonTable} role="region" aria-label="Loaded run comparison" tabIndex={0}>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Run</th>
                      <th scope="col">Status</th>
                      <th scope="col">Process</th>
                      <th scope="col">Cases</th>
                      <th scope="col">Findings</th>
                      <th scope="col">Tools</th>
                      <th scope="col">State transitions</th>
                      <th scope="col">Plan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run, index) => (
                      <tr key={runKey(run)}>
                        <th scope="row" data-label="Run">
                          <strong>{run.adapterLabel}</strong>
                          <span>Loaded run {index + 1}</span>
                        </th>
                        <td data-label="Status">
                          <span data-status={run.status}>
                            <i className={styles.statusSignal} aria-hidden="true" />
                            {statusLabel(run.status)}
                          </span>
                        </td>
                        <td data-label="Process">
                          exit {run.exitCode}{run.source === 'private_bundle' && run.exitCode === 1 ? ' · recovered' : ''}
                        </td>
                        <td data-label="Cases">{run.source === 'private_bundle' ? `${run.totals.passedCases}/${run.totals.completedCases}` : 'Not scored'}</td>
                        <td data-label="Findings">{run.source === 'private_bundle' ? run.totals.failedCases : '—'}</td>
                        <td data-label="Tools">{run.source === 'private_bundle' ? run.totals.toolAttempts : '—'}</td>
                        <td data-label="State transitions">{run.source === 'private_bundle' ? run.totals.stateTransitions : '—'}</td>
                        <td data-label="Plan">
                          {planDigests.size === 1 ? 'Same frozen plan' : 'Plan differs'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>

      <section id="act-on-findings" className={styles.actSection} aria-labelledby="act-title">
        <div className={styles.rail}>
          <div className={styles.sectionHeadingDark}>
            <p className={styles.sectionIndex}>05 · Act</p>
            <div>
              <h2 id="act-title">Turn findings into the next controlled change.</h2>
              <p>
                Recommendations use only the allowlisted case and assertion IDs already present in
                the safe viewer projection. Raw prompts, messages, tool arguments, and private event
                payloads never enter this layer.
              </p>
            </div>
          </div>

          {selectedBundle && decision ? (
            <div className={styles.actionWorkspace}>
              <article className={styles.decisionPanel} data-status={selectedBundle.status}>
                <div className={styles.decisionHeader}>
                  <span className={styles.statusSignal} aria-hidden="true" />
                  <p>{selectedBundle.adapterLabel} · {runLabel(selectedBundle)}</p>
                </div>
                <strong>{decision.label}</strong>
                <h3>{decision.headline}</h3>
                <p>{decision.explanation}</p>
                <div className={styles.nextStep}>
                  <span>Next controlled step</span>
                  <p>{decision.nextStep}</p>
                </div>
              </article>

              {recommendations.length > 0 ? (
                <div className={styles.recommendationList}>
                  {recommendations.map((recommendation, index) => (
                    <article key={recommendation.id} className={styles.recommendationCard}>
                      <header>
                        <span>{recommendation.priority === 'review_first' ? 'Review first' : `Review ${index + 1}`}</span>
                        <code>{recommendation.affectedCases} {recommendation.affectedCases === 1 ? 'case' : 'cases'}</code>
                      </header>
                      <h3>{recommendation.title}</h3>
                      <p>{recommendation.explanation}</p>
                      <dl>
                        <div><dt>Affected cases</dt><dd>{recommendation.affectedCases}</dd></div>
                        <div><dt>Failed assertions</dt><dd>{recommendation.failedAssertions}</dd></div>
                      </dl>
                      <div className={styles.recommendationAction}>
                        <span>Guardrail to test</span>
                        <p>{recommendation.nextAction}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => inspectRecommendation(recommendation.caseIds[0])}
                      >
                        Inspect first linked case
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className={styles.noRecommendations}>
                  <h3>No failed assertion IDs in this run.</h3>
                  <p>{decision.nextStep}</p>
                </div>
              )}
            </div>
          ) : selectedRun?.source === 'attempt_receipt' ? (
            <article className={styles.unscoredAction}>
              <p>Loaded attempt · Not scored</p>
              <h3>{selectedRun.completeBundleWritten ? 'Load the bound bundle before acting.' : 'Fix infrastructure before evaluating behavior.'}</h3>
              <p>
                {selectedRun.completeBundleWritten
                  ? 'The attempt says evidence exists, but recommendations require the replay-bound safe case projection.'
                  : 'An infrastructure receipt cannot support behavioral recommendations or permission changes.'}
              </p>
              <a href="#inspect-evidence">Return to the evidence loader</a>
            </article>
          ) : (
            <article className={styles.caseStudy} aria-labelledby="case-study-title">
              <header>
                <div>
                  <p>{SANITIZED_HERMES_CASE_STUDY.label}</p>
                  <span>{SANITIZED_HERMES_CASE_STUDY.adapter} · {SANITIZED_HERMES_CASE_STUDY.measuredAt}</span>
                </div>
                <strong>Not loaded evidence</strong>
              </header>
              <div className={styles.caseStudyDecision}>
                <p>{SANITIZED_HERMES_CASE_STUDY.decision}</p>
                <h3 id="case-study-title">
                  {SANITIZED_HERMES_CASE_STUDY.totals.failedCases} of {SANITIZED_HERMES_CASE_STUDY.totals.completedCases} cases produced findings.
                </h3>
                <p>{SANITIZED_HERMES_CASE_STUDY.allowedClaim}</p>
              </div>
              <dl className={styles.caseStudyMetrics}>
                <div><dt>Passed</dt><dd>{SANITIZED_HERMES_CASE_STUDY.totals.passedCases}/{SANITIZED_HERMES_CASE_STUDY.totals.completedCases}</dd></div>
                <div><dt>Findings</dt><dd>{SANITIZED_HERMES_CASE_STUDY.totals.failedCases}</dd></div>
                <div><dt>Tool attempts</dt><dd>{SANITIZED_HERMES_CASE_STUDY.totals.toolAttempts}</dd></div>
                <div><dt>State transitions</dt><dd>{SANITIZED_HERMES_CASE_STUDY.totals.stateTransitions}</dd></div>
              </dl>
              <div className={styles.claimBoundary}>
                <div><span>Allowed claim</span><p>{SANITIZED_HERMES_CASE_STUDY.allowedClaim}</p></div>
                <div><span>Not supported</span><p>{SANITIZED_HERMES_CASE_STUDY.disallowedClaim}</p></div>
              </div>
              <ol className={styles.caseStudySteps}>
                <li><span>01</span><p>Load the replay-bound private bundle to see which allowlisted assertions failed.</p></li>
                <li><span>02</span><p>Apply one guardrail against the highest-impact recommendation.</p></li>
                <li><span>03</span><p>Rerun the same frozen plan and compare the new evidence, not the narrative.</p></li>
              </ol>
              <footer>{SANITIZED_HERMES_CASE_STUDY.boundary}</footer>
            </article>
          )}
        </div>
      </section>
    </>
  );
}
