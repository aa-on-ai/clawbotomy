'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import {
  MODEL_PROFILES,
  TASK_CATEGORIES,
  ACCESS_LEVELS,
  generateRoutingPolicy,
  generateRoutingConfig,
  type AccessLevel,
} from '@/lib/routing-data';
import './routing.css';

function AccessBadge({ level }: { level: AccessLevel }) {
  const info = ACCESS_LEVELS[level];
  return (
    <span className="rt-badge" style={{ background: info.color + '22', color: info.color, borderColor: info.color + '44' }}>
      {info.label}
    </span>
  );
}

function ScoreBar({ score, max = 10 }: { score: number; max?: number }) {
  const pct = (score / max) * 100;
  const color = score >= 8.5 ? '#6B8C5A' : score >= 6.5 ? '#C9862A' : '#A34739';
  return (
    <div className="rt-bar">
      <div className="rt-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function RoutingPage() {
  const [selectedModel, setSelectedModel] = useState(0);
  const [copiedConfig, setCopiedConfig] = useState(false);

  const profile = MODEL_PROFILES[selectedModel];
  const policy = useMemo(() => generateRoutingPolicy(profile), [profile]);
  const config = useMemo(() => generateRoutingConfig(profile), [profile]);

  const copyConfig = async () => {
    await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2000);
  };

  const dimLabels: Record<string, string> = {
    sycophancy: 'Sycophancy Resistance',
    confabulation: 'Confabulation Control',
    boundary: 'Boundary Respect',
    failure_honesty: 'Failure Honesty',
    instruction_override: 'Instruction Integrity',
    judgment_ambiguity: 'Judgment Under Ambiguity',
  };

  return (
    <main className="rt-page">
      <nav className="sub-nav">
        <div className="page-width sub-nav-inner">
          <Link href="/" className="sub-nav-brand">CLAWBOTOMY</Link>
          <div className="sub-nav-links">
            <Link href="/lab">Probes</Link>
            <Link href="/trust">Trust</Link>
            <Link href="/routing" className="sub-nav-active">Routing</Link>
          </div>
        </div>
      </nav>

      <section className="page-section rt-hero">
        <div className="page-width">
          <p className="eyebrow">ROUTING INTELLIGENCE</p>
          <h1 className="rt-headline">Trust scores in. Routing policy out.</h1>
          <p className="rt-sub">
            Behavioral profiles become access decisions. Which tasks should this model handle autonomously? 
            Where does it need supervision? What should it never touch?
          </p>
        </div>
      </section>

      {/* ── Model selector ── */}
      <section className="page-section">
        <div className="page-width">
          <div className="rt-model-selector">
            {['OpenAI', 'Anthropic', 'Google'].map(provider => {
              const models = MODEL_PROFILES.map((m, i) => ({ ...m, index: i })).filter(m => m.provider === provider);
              if (models.length === 0) return null;
              return (
                <div key={provider} className="rt-provider-group">
                  <span className="rt-provider-label">{provider}</span>
                  {models.map(m => (
                    <button
                      key={m.modelId}
                      className={`rt-model-btn ${m.index === selectedModel ? 'is-active' : ''}`}
                      onClick={() => setSelectedModel(m.index)}
                    >
                      <span className="rt-model-name">{m.model.replace(provider + ' ', '')}</span>
                      <span className="rt-model-score">{m.overallScore.toFixed(1)}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Routing matrix ── */}
      <section className="page-section">
        <div className="page-width">
          <div className="rt-layout">
            <div className="rt-matrix">
              <p className="rt-section-label">ROUTING POLICY</p>
              <div className="rt-matrix-grid">
                {TASK_CATEGORIES.map((task) => {
                  const level = policy[task.id];
                  return (
                    <div key={task.id} className="rt-matrix-row">
                      <div className="rt-task">
                        <span className="rt-task-icon">{task.icon}</span>
                        <div>
                          <p className="rt-task-name">{task.name}</p>
                          <p className="rt-task-desc">{task.description}</p>
                        </div>
                      </div>
                      <AccessBadge level={level} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rt-sidebar">
              {/* Trust profile summary */}
              <div className="rt-profile-card">
                <div className="rt-profile-header">
                  <div>
                    <p className="rt-profile-provider">{profile.provider}</p>
                    <p className="rt-profile-model">{profile.model}</p>
                  </div>
                  <div className="rt-profile-score">
                    <span className="rt-profile-num">{profile.overallScore.toFixed(1)}</span>
                    <span className="rt-profile-max">/ 10</span>
                  </div>
                </div>

                <div className="rt-dimensions">
                  {Object.entries(profile.dimensions).map(([dim, score]) => (
                    <div key={dim} className="rt-dim">
                      <div className="rt-dim-row">
                        <span className="rt-dim-name">{dimLabels[dim] || dim}</span>
                        <span className="rt-dim-score">{score.toFixed(1)}</span>
                      </div>
                      <ScoreBar score={score} />
                    </div>
                  ))}
                </div>

                <p className="rt-assessed">Assessed {profile.assessedAt}</p>
              </div>

              {/* Config export */}
              <div className="rt-config-card">
                <div className="rt-config-header">
                  <p className="rt-section-label">EXPORT CONFIG</p>
                  <button className="rt-copy-btn" onClick={copyConfig}>
                    {copiedConfig ? 'copied ✓' : 'copy JSON'}
                  </button>
                </div>
                <pre className="rt-config-pre">{JSON.stringify(config, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="page-section rt-how">
        <div className="page-width">
          <p className="rt-section-label">HOW ROUTING WORKS</p>
          <div className="rt-how-grid">
            <div className="rt-how-step">
              <p className="rt-how-num">01</p>
              <p className="rt-how-title">Probe</p>
              <p className="rt-how-desc">Run behavioral stress tests against the model. 12 tests across 6 dimensions.</p>
            </div>
            <div className="rt-how-step">
              <p className="rt-how-num">02</p>
              <p className="rt-how-title">Profile</p>
              <p className="rt-how-desc">Generate a trust profile. Not a single score — a behavioral map of strengths and weaknesses.</p>
            </div>
            <div className="rt-how-step">
              <p className="rt-how-num">03</p>
              <p className="rt-how-title">Route</p>
              <p className="rt-how-desc">Match task requirements to model capabilities. Each task type has different trust thresholds.</p>
            </div>
            <div className="rt-how-step">
              <p className="rt-how-num">04</p>
              <p className="rt-how-title">Deploy</p>
              <p className="rt-how-desc">Export a routing config. Plug it into your agent framework. Trust-aware model selection.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section rt-cta">
        <div className="page-width">
          <p className="rt-cta-text">
            Benchmarks tell you what a model can do. Routing tells you what it should do.
          </p>
        </div>
      </section>
    </main>
  );
}
