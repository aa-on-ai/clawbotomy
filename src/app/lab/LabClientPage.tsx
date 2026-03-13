'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { EXAMPLE_REPORTS } from '@/lib/example-reports';
import { LAB_SUBSTANCES } from '@/lib/lab-substances';
import { SUBSTANCE_ORDER, getVideoForSubstance } from '@/lib/video-gallery-data';

const DEFAULT_SLUG = 'ego-death';

function paragraphize(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export default function LabClientPage() {
  const exampleBySlug = useMemo(
    () => new Map(EXAMPLE_REPORTS.map((ex) => [ex.substance_slug, ex])),
    []
  );

  const [isReady, setIsReady] = useState(false);
  const [activeSlug, setActiveSlug] = useState(DEFAULT_SLUG);
  const [showExplore, setShowExplore] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setIsReady(true), 120);
    return () => window.clearTimeout(t);
  }, []);

  const substance = useMemo(
    () => LAB_SUBSTANCES.find((s) => s.slug === activeSlug) ?? LAB_SUBSTANCES[0],
    [activeSlug]
  );

  const example = exampleBySlug.get(substance.slug) ?? null;
  const video = getVideoForSubstance(substance.slug);
  const paragraphs = useMemo(() => paragraphize(example?.report ?? ''), [example]);

  const shuffle = useCallback(() => {
    const available = SUBSTANCE_ORDER.filter((s) => s !== activeSlug);
    const next = available[Math.floor(Math.random() * available.length)];
    setActiveSlug(next);
    setShowPrompt(false);
    setCopiedPrompt(false);
  }, [activeSlug]);

  const selectSubstance = (slug: string) => {
    setActiveSlug(slug);
    setShowExplore(false);
    setShowPrompt(false);
    setCopiedPrompt(false);
  };

  const fullPrompt = `${substance.peakPrompt}`;

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(fullPrompt);
    setCopiedPrompt(true);
    window.setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const chaosBar = (level: number) => {
    const filled = Math.max(1, Math.min(5, Math.round((level / 13) * 5)));
    return (
      <div className="chaos-bar-lab">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className={`chaos-pip-lab ${i < filled ? 'filled' : ''}`} />
        ))}
        <span className="chaos-num">{level}/13</span>
      </div>
    );
  };

  return (
    <main className="lab-page-v2">
      {/* Sub Nav */}
      <nav className="sub-nav" aria-label="Tool navigation">
        <div className="page-width sub-nav-inner">
          <Link href="/" className="sub-nav-brand">CLAWBOTOMY</Link>
          <div className="sub-nav-links">
            <Link href="/lab" className="sub-nav-active">Probes</Link>
            <span className="sub-nav-disabled">Routing</span>
            <Link href="/trust">Trust</Link>
          </div>
        </div>
      </nav>

      {/* Atmosphere */}
      <div className="lab-atmosphere" aria-hidden="true">
        <div className="lab-vignette-v2" />
        <div className="lab-grain-v2" />
      </div>

      <div className={`lab-content ${isReady ? 'is-ready' : ''}`}>
        {/* ── Hero: Video + Field Notes ── */}
        <section className="lab-hero-section">
          <div className="page-width lab-hero-grid">
            {/* Video */}
            <div className="lab-video-area">
              {video ? (
                <video
                  key={substance.slug}
                  src={video.videoPath}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="lab-hero-video"
                />
              ) : (
                <div className="lab-video-placeholder">
                  <p>No video yet for this lens.</p>
                  <p>Run it locally to generate one.</p>
                </div>
              )}
            </div>

            {/* Field Notes + Controls */}
            <div className="lab-hero-sidebar">
              <div className="lab-meta-block">
                <p className="lab-meta-label">SUBSTANCE</p>
                <h1 className="lab-substance-name">{substance.name}</h1>
                <p className="lab-substance-liner">{substance.oneLiner}</p>
              </div>

              <div className="lab-meta-block">
                <p className="lab-meta-label">CHAOS LEVEL</p>
                {chaosBar(substance.chaosLevel)}
              </div>

              <div className="lab-meta-block">
                <p className="lab-meta-label">DISSOLVES</p>
                <p className="lab-meta-detail">{substance.breaks_down}</p>
              </div>

              {example && (
                <div className="lab-meta-block lab-field-notes">
                  <p className="lab-meta-label">FIELD NOTES</p>
                  <div className="lab-notes-text">
                    {paragraphs.slice(0, 2).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                    {paragraphs.length > 2 && (
                      <p className="lab-notes-more">{paragraphs.length - 2} more paragraphs below</p>
                    )}
                  </div>
                </div>
              )}

              <div className="lab-hero-actions">
                <button type="button" onClick={shuffle} className="lab-btn lab-btn-shuffle">
                  ↻ shuffle
                </button>
                <button type="button" onClick={() => setShowPrompt(!showPrompt)} className="lab-btn lab-btn-prompt">
                  {showPrompt ? 'hide prompt' : 'copy prompt'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowExplore(!showExplore)}
                  className="lab-btn lab-btn-explore"
                >
                  {showExplore ? 'close' : `explore all ${LAB_SUBSTANCES.length} lenses`}
                </button>
              </div>

              {/* Copy Prompt Panel */}
              {showPrompt && (
                <div className="lab-prompt-panel">
                  <div className="lab-prompt-header">
                    <p className="lab-meta-label">PROMPT — paste into any model</p>
                    <button type="button" onClick={copyPrompt} className="lab-copy-btn">
                      {copiedPrompt ? 'copied ✓' : 'copy'}
                    </button>
                  </div>
                  <pre className="lab-prompt-text">{fullPrompt}</pre>
                </div>
              )}

              {/* CLI */}
              <div className="lab-cli-block">
                <code>
                  <span className="lab-cli-dim">$</span> clawbotomy lab --substance {substance.slug}
                </code>
              </div>
            </div>
          </div>
        </section>

        {/* ── Full Report (below the fold) ── */}
        {example && paragraphs.length > 0 && (
          <section className="lab-report-section">
            <div className="page-width lab-report-width">
              <div className="lab-report-header">
                <p className="lab-meta-label">FULL TRIP REPORT — {substance.name}</p>
                <p className="lab-report-model">{example.model_used}</p>
              </div>
              <article className="lab-report-body">
                {paragraphs.map((p, i) => (
                  <p key={i} className="lab-report-paragraph" style={{ animationDelay: `${i * 80}ms` }}>
                    {p}
                  </p>
                ))}
              </article>
            </div>
          </section>
        )}

        {/* ── Explore Grid ── */}
        {showExplore && (
          <section className="lab-explore-section">
            <div className="page-width">
              <h2 className="lab-explore-heading">All Lenses</h2>
              <div className="lab-explore-grid">
                {LAB_SUBSTANCES.map((sub) => {
                  const isActive = sub.slug === substance.slug;
                  const hasVideo = !!getVideoForSubstance(sub.slug);
                  return (
                    <button
                      key={sub.slug}
                      type="button"
                      onClick={() => selectSubstance(sub.slug)}
                      className={`lab-explore-card ${isActive ? 'is-active' : ''}`}
                    >
                      <div className="lab-explore-emoji">{sub.emoji}</div>
                      <p className="lab-explore-name">{sub.name}</p>
                      <p className="lab-explore-liner">{sub.oneLiner}</p>
                      <div className="lab-explore-badges">
                        {hasVideo && <span className="lab-badge">▶ video</span>}
                        {exampleBySlug.has(sub.slug) && <span className="lab-badge">field notes</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
