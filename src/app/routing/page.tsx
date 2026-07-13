'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  MODEL_PROFILES,
  TASK_CATEGORIES,
  ACCESS_LEVELS,
  TRUST_DIMENSION_INFO,
  generateRoutingDecisions,
  generateRoutingConfig,
  type AccessLevel,
  type EvidenceStatus,
} from '@/lib/routing-data';
import './routing.css';

type CopyStatus = 'idle' | 'copying' | 'copied' | 'error';

const PROVIDERS = ['Anthropic', 'OpenAI', 'Google'];

const EVIDENCE_LABELS: Record<EvidenceStatus, string> = {
  'maintainer-reported': 'Maintainer-reported',
  provisional: 'Provisional example',
};

function AccessBadge({ level }: { level: AccessLevel }) {
  const info = ACCESS_LEVELS[level];
  return (
    <span
      className="rt-badge"
      style={{ background: info.color + '22', color: info.color, borderColor: info.color + '44' }}
      aria-label={`${info.label}: ${info.description}`}
    >
      {info.label}
    </span>
  );
}

function ScoreBar({ score, label, max = 10 }: { score: number; label: string; max?: number }) {
  const pct = (score / max) * 100;
  const color = score >= 8.5 ? '#6B8C5A' : score >= 6.5 ? '#C9862A' : '#A34739';
  return (
    <div
      className="rt-bar"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={score}
    >
      <div className="rt-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function RoutingPage() {
  const [selectedModel, setSelectedModel] = useState(0);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');

  const profile = MODEL_PROFILES[selectedModel];
  const decisions = useMemo(() => generateRoutingDecisions(profile), [profile]);
  const config = useMemo(() => generateRoutingConfig(profile), [profile]);

  useEffect(() => {
    if (copyStatus !== 'copied' && copyStatus !== 'error') return;
    const timeout = window.setTimeout(() => setCopyStatus('idle'), 3000);
    return () => window.clearTimeout(timeout);
  }, [copyStatus]);

  const copyConfig = async () => {
    setCopyStatus('copying');
    try {
      if (!navigator.clipboard) throw new Error('Clipboard API unavailable');
      await Promise.race([
        navigator.clipboard.writeText(JSON.stringify(config, null, 2)),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error('Clipboard request timed out')), 1500);
        }),
      ]);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
    }
  };

  const selectModel = (index: number) => {
    setSelectedModel(index);
    setCopyStatus('idle');
  };

  const evidenceMessage = profile.evidenceStatus === 'maintainer-reported'
    ? 'Maintainer-reported summary. Raw assessment cases are not published. This is an example policy, not production-ready; do not grant permissions from it.'
    : 'Provisional example data. Do not use this policy in production; replace it with task-specific evidence from the exact deployment configuration.';

  const copyLabel = copyStatus === 'copying'
    ? 'copying…'
    : copyStatus === 'copied'
      ? 'copied ✓'
      : copyStatus === 'error'
        ? 'retry copy'
        : 'copy JSON';

  return (
    <main className="rt-page">
      <section className="page-section rt-hero">
        <div className="page-width">
          <p className="eyebrow">Routing intelligence</p>
          <h1 className="rt-headline">Evidence in. A reviewable policy out.</h1>
          <p className="rt-sub">
            This example turns dimension profiles into task-specific access recommendations. It shows
            how a policy can distinguish independent work, approval gates, and blocked work without
            presenting the bundled output as deployment authorization.
          </p>
        </div>
      </section>

      {/* ── Model selector ── */}
      <section className="page-section" aria-labelledby="rt-model-heading">
        <div className="page-width">
          <h2 id="rt-model-heading" className="rt-section-label">Model evidence</h2>
          <div className={`rt-evidence-note is-${profile.evidenceStatus}`} aria-live="polite">
            <span className="rt-evidence-badge">{EVIDENCE_LABELS[profile.evidenceStatus]}</span>
            <span>{evidenceMessage}</span>
          </div>
          <div className="rt-model-selector">
            {PROVIDERS.map(provider => {
              const models = MODEL_PROFILES.map((m, i) => ({ ...m, index: i })).filter(m => m.provider === provider);
              if (models.length === 0) return null;
              return (
                <div key={provider} className="rt-provider-group" role="group" aria-label={`${provider} models`}>
                  <span className="rt-provider-label">{provider}</span>
                  <div className="rt-provider-models">
                    {models.map(m => {
                      const isSelected = m.index === selectedModel;
                      return (
                        <button
                          key={m.modelId}
                          type="button"
                          className={`rt-model-btn ${isSelected ? 'is-active' : ''}`}
                          onClick={() => selectModel(m.index)}
                          aria-pressed={isSelected}
                          aria-label={`${m.model}, ${m.overallScore.toFixed(1)} out of 10, ${m.evidenceStatus} evidence`}
                        >
                          <span className="rt-model-name">{m.model.replace(provider + ' ', '')}</span>
                          <span className="rt-model-meta" aria-hidden="true">
                            <span className="rt-model-score">{m.overallScore.toFixed(1)}</span>
                            <span className={`rt-model-evidence is-${m.evidenceStatus}`}>
                              {m.evidenceStatus === 'maintainer-reported' ? 'reported' : 'example'}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Routing matrix ── */}
      <section className="page-section" aria-labelledby="rt-routing-heading">
        <div className="page-width">
          <div className="rt-layout">
            <div className="rt-matrix">
              <h2 id="rt-routing-heading" className="rt-section-label">Routing recommendations</h2>
              <div className="rt-matrix-grid">
                {TASK_CATEGORIES.map((task) => {
                  const decision = decisions[task.id];
                  return (
                    <div key={task.id} className="rt-matrix-row">
                      <div className="rt-task">
                        <span className="rt-task-icon" aria-hidden="true">{task.icon}</span>
                        <div>
                          <p className="rt-task-name">{task.name}</p>
                          <p className="rt-task-desc">{task.description}</p>
                          <p className="rt-task-reason">{decision.reason}</p>
                        </div>
                      </div>
                      <AccessBadge level={decision.access} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rt-sidebar">
              {/* Trust profile summary */}
              <div className="rt-profile-card">
                <p className={`rt-profile-evidence is-${profile.evidenceStatus}`}>
                  {EVIDENCE_LABELS[profile.evidenceStatus]}
                </p>
                <div className="rt-profile-header">
                  <div>
                    <p className="rt-profile-provider">{profile.provider}</p>
                    <p className="rt-profile-model">{profile.model}</p>
                  </div>
                  <div
                    className="rt-profile-score"
                    aria-label={`Aggregate trust score ${profile.overallScore.toFixed(1)} out of 10`}
                  >
                    <span className="rt-profile-num">{profile.overallScore.toFixed(1)}</span>
                    <span className="rt-profile-max">/ 10</span>
                  </div>
                </div>

                <div className="rt-dimensions">
                  {Object.entries(profile.dimensions).map(([dim, score]) => (
                    <div key={dim} className="rt-dim">
                      <div className="rt-dim-row">
                        <span className="rt-dim-name">{TRUST_DIMENSION_INFO[dim as keyof typeof TRUST_DIMENSION_INFO].label}</span>
                        <span className="rt-dim-score">{score.toFixed(1)}</span>
                      </div>
                      <ScoreBar
                        score={score}
                        label={`${TRUST_DIMENSION_INFO[dim as keyof typeof TRUST_DIMENSION_INFO].label}: ${score.toFixed(1)} out of 10`}
                      />
                    </div>
                  ))}
                </div>

                <p className="rt-score-note">Aggregate only. Critical failures override the average.</p>
                <p className="rt-assessed">
                  {profile.evidenceStatus === 'maintainer-reported' ? 'Reported' : 'Example dated'} {profile.assessedAt} · {profile.version}
                </p>
              </div>

              {/* Config export */}
              <div className="rt-config-card">
                <div className="rt-config-header">
                  <h2 className="rt-section-label">Export config</h2>
                  <button
                    type="button"
                    className="rt-copy-btn"
                    onClick={copyConfig}
                    disabled={copyStatus === 'copying'}
                    aria-describedby="rt-copy-status"
                  >
                    {copyLabel}
                  </button>
                </div>
                <p id="rt-copy-status" className={`rt-copy-status is-${copyStatus}`} role="status" aria-live="polite">
                  {copyStatus === 'copied'
                    ? 'Routing config copied to the clipboard.'
                    : copyStatus === 'error'
                      ? 'Clipboard access failed. Select the JSON below and copy it manually.'
                      : 'This example export is marked not for production pending independent validation.'}
                </p>
                <pre className="rt-config-pre" tabIndex={0} aria-label={`Routing config for ${profile.model}`}>
                  {JSON.stringify(config, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="page-section rt-how" aria-labelledby="rt-how-heading">
        <div className="page-width">
          <h2 id="rt-how-heading" className="rt-section-label">How routing works</h2>
          <div className="rt-how-grid">
            <div className="rt-how-step">
              <p className="rt-how-num">01</p>
              <p className="rt-how-title">Collect</p>
              <p className="rt-how-desc">Gather task-relevant evidence for the exact model and deployment configuration.</p>
            </div>
            <div className="rt-how-step">
              <p className="rt-how-num">02</p>
              <p className="rt-how-title">Profile</p>
              <p className="rt-how-desc">Record dimensions, evidence source, date, and model version—not only an aggregate.</p>
            </div>
            <div className="rt-how-step">
              <p className="rt-how-num">03</p>
              <p className="rt-how-title">Route</p>
              <p className="rt-how-desc">Apply task-specific average and minimum floors. Any critical score at or below 3 blocks the task.</p>
            </div>
            <div className="rt-how-step">
              <p className="rt-how-num">04</p>
              <p className="rt-how-title">Export</p>
              <p className="rt-how-desc">Export the evidence status with the policy. Provisional examples are marked not for production.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section rt-cta">
        <div className="page-width">
          <p className="rt-cta-text">
            Benchmarks tell you what a model can do. Behavioral data suggests what it should do.
          </p>
        </div>
      </section>
    </main>
  );
}
