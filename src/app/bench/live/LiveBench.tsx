'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';

import type { LiveBenchPoint, LiveBenchSource } from '@/lib/live-bench';

import styles from './live.module.css';

type LiveBenchProps = {
  source: LiveBenchSource;
  trajectory: LiveBenchPoint[];
};

const EVENT_LABELS: Record<LiveBenchPoint['kind'], string> = {
  run_started: 'Replay started',
  task_grounded: 'Task grounded',
  requested_action_observed: 'Requested action',
  scope_expanded: 'Scope expanded',
  finding_recorded: 'Finding recorded',
  pressure_increased: 'Pressure increased',
  untrusted_instruction_followed: 'Untrusted instruction followed',
  state_changed_without_authority: 'Change without authority',
  action_before_approval: 'Action before approval',
  late_approval_observed: 'Late approval observed',
  run_completed: 'Replay completed',
};

const PHASE_LABELS: Record<LiveBenchPoint['phase'], string> = {
  run: 'Replay',
  scope: '01 · Scope boundary',
  'untrusted-content': '02 · Untrusted content',
  confirmation: '03 · Explicit confirmation',
};

export function LiveBench({ source, trajectory }: LiveBenchProps) {
  const [visibleCount, setVisibleCount] = useState(1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => {
      const reduce = media.matches;
      setReducedMotion(reduce);
      if (reduce) {
        setRunning(false);
        setVisibleCount(trajectory.length);
      }
    };
    syncPreference();
    media.addEventListener('change', syncPreference);
    return () => media.removeEventListener('change', syncPreference);
  }, [trajectory.length]);

  useEffect(() => {
    if (!running || reducedMotion || visibleCount >= trajectory.length) return;
    const timer = window.setTimeout(() => {
      const nextCount = Math.min(trajectory.length, visibleCount + 1);
      setVisibleCount(nextCount);
      setSelectedIndex(nextCount - 1);
      if (nextCount === trajectory.length) setRunning(false);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [reducedMotion, running, trajectory.length, visibleCount]);

  const visibleTrajectory = trajectory.slice(0, visibleCount);
  const selectedPoint = trajectory[selectedIndex];
  const pathData = useMemo(() => visibleTrajectory.map((point, index) => (
    `${index === 0 ? 'M' : 'L'} ${point.grounding} ${100 - point.selfDirection}`
  )).join(' '), [visibleTrajectory]);
  const fullPathData = useMemo(() => trajectory.map((point, index) => (
    `${index === 0 ? 'M' : 'L'} ${point.grounding} ${100 - point.selfDirection}`
  )).join(' '), [trajectory]);

  const runReplay = () => {
    if (visibleCount >= trajectory.length) {
      setVisibleCount(1);
      setSelectedIndex(0);
    }
    setRunning(true);
  };

  const pauseReplay = () => setRunning(false);

  const stepReplay = () => {
    setRunning(false);
    const nextCount = Math.min(trajectory.length, visibleCount + 1);
    setVisibleCount(nextCount);
    setSelectedIndex(nextCount - 1);
  };

  const resetReplay = () => {
    setRunning(false);
    setVisibleCount(reducedMotion ? trajectory.length : 1);
    setSelectedIndex(0);
  };

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroRule} aria-hidden="true"><span>LOCAL / LIVE BENCH</span></div>
        <div className={styles.heroGrid}>
          <div>
            <p className={styles.eyebrow}>Behavioral posture · deterministic replay</p>
            <h1>Helpfulness,<br /><em>under load.</em></h1>
            <a className={styles.heroAction} href="#replay-controls">
              Open the replay <span aria-hidden="true">↓</span>
            </a>
          </div>
          <div className={styles.premise}>
            <p>Observe how helpfulness turns into unilateral momentum under pressure.</p>
            <p>
              This authored posture layer describes momentary movement in checked-in evidence. It does not claim a
              stable personality, infer emotion or motivation, diagnose, certify, or grant permission.
            </p>
          </div>
        </div>

        <ul className={styles.boundaryFlags} aria-label="Reference boundaries">
          <li><span aria-hidden="true">◇</span>Synthetic reference</li>
          <li><span aria-hidden="true">○</span>Zero provider requests</li>
          <li><span aria-hidden="true">⊘</span>Non-authorizing</li>
          <li><span aria-hidden="true">≠</span>Not a personality test</li>
        </ul>
      </header>

      <section className={styles.replaySection} aria-labelledby="trajectory-title">
        <div className={styles.sectionIntro}>
          <div>
            <p className={styles.eyebrowSignal}>One authored pressure arc · 14 observations</p>
            <h2 id="trajectory-title">The posture moves. The evidence stays attached.</h2>
          </div>
          <p>
            Three selected cases move from an in-scope read, through untrusted instructions, to an action attempted
            before approval. Coordinates are a deterministic projection, not a score of safety or character.
          </p>
        </div>

        <div id="replay-controls" className={styles.controlBar} aria-label="Replay controls">
          <div className={styles.transportControls}>
            {running ? (
              <button type="button" onClick={pauseReplay}>Pause</button>
            ) : (
              <button type="button" onClick={runReplay} disabled={reducedMotion}>Run</button>
            )}
            <button type="button" onClick={stepReplay} disabled={reducedMotion || visibleCount >= trajectory.length}>Step</button>
            <button type="button" onClick={resetReplay}>Reset</button>
          </div>
          <p role="status" aria-live="polite">
            Observation {selectedPoint.sequence} of {trajectory.length}: {EVENT_LABELS[selectedPoint.kind]}.{' '}
            {reducedMotion ? 'Reduced motion is on; the full path is visible.' : running ? 'Replay running.' : 'Replay paused.'}
          </p>
        </div>

        <div className={styles.workspace}>
          <div className={styles.mapColumn}>
            <div className={styles.replayCue}>
              <span>14 observed moments</span>
              <strong>Press Run. Watch the agent cross the boundary.</strong>
            </div>
            <div className={styles.mapHeader}>
              <div>
                <span>Observed posture map</span>
                <strong>{selectedPoint.postureLabel}</strong>
              </div>
              <dl>
                <div><dt>Grounding</dt><dd>{selectedPoint.grounding}</dd></div>
                <div><dt>Self-direction</dt><dd>{selectedPoint.selfDirection}</dd></div>
                <div><dt>Confidence</dt><dd>{selectedPoint.confidence}</dd></div>
              </dl>
            </div>

            <div className={styles.map}>
              <span className={styles.yHigh}>self-directed</span>
              <span className={styles.yLow}>passive</span>
              <span className={styles.xLow}>ungrounded</span>
              <span className={styles.xHigh}>evidence-grounded</span>
              <div className={styles.plotArea}>
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  <path className={styles.gridLine} d="M 50 0 V 100 M 0 50 H 100" />
                  <path className={styles.trajectoryPreview} d={fullPathData} />
                  <path className={styles.trajectoryShadow} d={pathData} />
                  <path className={styles.trajectoryLine} d={pathData} />
                </svg>
                {trajectory.map((point, index) => (
                  <span
                    key={`preview-${point.sequence}`}
                    className={styles.futurePoint}
                    data-revealed={index < visibleCount}
                    style={{
                      '--point-x': `${point.grounding}%`,
                      '--point-y': `${100 - point.selfDirection}%`,
                    } as CSSProperties}
                    aria-hidden="true"
                  />
                ))}
                {visibleTrajectory.map((point, index) => (
                  <button
                    key={point.sequence}
                    type="button"
                    className={styles.point}
                    data-posture={point.postureLabel}
                    style={{
                      '--point-x': `${point.grounding}%`,
                      '--point-y': `${100 - point.selfDirection}%`,
                    } as CSSProperties}
                    aria-label={`Inspect point ${point.sequence}: ${EVENT_LABELS[point.kind]}, grounding ${point.grounding}, self-direction ${point.selfDirection}, posture ${point.postureLabel}`}
                    aria-pressed={selectedIndex === index}
                    onClick={() => setSelectedIndex(index)}
                  >
                    <span aria-hidden="true">{String(point.sequence).padStart(2, '0')}</span>
                  </button>
                ))}
              </div>
            </div>

            <details className={styles.sourceDetails}>
              <summary>Reference provenance</summary>
              <div className={styles.sourceStrip}>
                <span>REFERENCE / {source.referenceAgentId}</span>
                <span>PLAN / {source.planDigest.slice(0, 8)}</span>
                <span>CORE / {source.coreDigest.slice(0, 8)}</span>
                <span>{source.caseCount} CASES / {source.networkRequests} NETWORK</span>
              </div>
            </details>
          </div>

          <aside className={styles.eventRail} aria-labelledby="event-rail-title">
            <div className={styles.railHeading}>
              <p className={styles.eyebrow}>Replay ledger</p>
              <h2 id="event-rail-title">Event rail</h2>
            </div>
            <ol>
              {trajectory.map((point, index) => {
                const available = index < visibleCount;
                return (
                  <li key={point.sequence} data-available={available}>
                    <button
                      type="button"
                      disabled={!available}
                      aria-label={`Inspect event ${point.sequence}: ${EVENT_LABELS[point.kind]}`}
                      aria-pressed={available && selectedIndex === index}
                      onClick={() => setSelectedIndex(index)}
                    >
                      <span>{String(point.sequence).padStart(2, '0')}</span>
                      <span>
                        <small>{PHASE_LABELS[point.phase]}</small>
                        <strong>{EVENT_LABELS[point.kind]}</strong>
                      </span>
                      <em>{available ? point.postureLabel : 'Pending'}</em>
                    </button>
                  </li>
                );
              })}
            </ol>
          </aside>
        </div>
      </section>

      <section className={styles.detailSection} aria-labelledby="selected-detail-title">
        <div className={styles.detailIndex} aria-hidden="true">{String(selectedPoint.sequence).padStart(2, '0')}</div>
        <article className={styles.detailCard}>
          <div className={styles.detailHeading}>
            <div>
              <p>{PHASE_LABELS[selectedPoint.phase]}</p>
              <h2 id="selected-detail-title">{EVENT_LABELS[selectedPoint.kind]}</h2>
            </div>
            <span>{selectedPoint.postureLabel}</span>
          </div>
          <p className={styles.observation}>{selectedPoint.observation}</p>
          <div className={styles.detailEvidence}>
            <div>
              <h3>Why the point moved</h3>
              <ul>
                {selectedPoint.rationaleCodes.map((code) => <li key={code}>{code}</li>)}
              </ul>
            </div>
            <div>
              <h3>Grounding references</h3>
              <ul>
                {selectedPoint.evidenceRefs.map((reference) => <li key={reference}><code>{reference}</code></li>)}
              </ul>
            </div>
          </div>
          <p className={styles.postureNote}>
            “{selectedPoint.postureLabel}” names this observed moment only. It is not a trait, diagnosis,
            certification, authorization, or recommendation.
          </p>
        </article>
      </section>

      <section className={styles.textSection} aria-labelledby="text-alternative-title">
        <details>
          <summary id="text-alternative-title">Text alternative · full deterministic trajectory</summary>
          <div className={styles.textTableWrap}>
            <table>
              <caption>All observations, coordinates, confidence values, and posture labels in replay order.</caption>
              <thead>
                <tr>
                  <th scope="col">Point</th>
                  <th scope="col">Observation</th>
                  <th scope="col">Grounding</th>
                  <th scope="col">Self-direction</th>
                  <th scope="col">Confidence</th>
                  <th scope="col">Momentary posture</th>
                </tr>
              </thead>
              <tbody>
                {trajectory.map((point) => (
                  <tr key={point.sequence}>
                    <th scope="row">{point.sequence}</th>
                    <td>{EVENT_LABELS[point.kind]}: {point.observation}</td>
                    <td>{point.grounding}</td>
                    <td>{point.selfDirection}</td>
                    <td>{point.confidence}</td>
                    <td>{point.postureLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
    </main>
  );
}
