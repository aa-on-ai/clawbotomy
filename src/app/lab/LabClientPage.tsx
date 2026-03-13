'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { EXAMPLE_REPORTS } from '@/lib/example-reports';
import { LAB_SUBSTANCES } from '@/lib/lab-substances';
import { SUBSTANCE_ORDER, getVideoForSubstance } from '@/lib/video-gallery-data';

type FeaturedView = 'video' | 'notes' | 'prompt';

const FEATURED_SLUG = 'ego-death';

function paragraphize(text: string) {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

export default function LabClientPage() {
  const exampleBySlug = useMemo(
    () => new Map(EXAMPLE_REPORTS.map((ex) => [ex.substance_slug, ex])),
    []
  );

  const [isReady, setIsReady] = useState(false);
  const [featuredSlug, setFeaturedSlug] = useState(FEATURED_SLUG);
  const [view, setView] = useState<FeaturedView>('video');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setIsReady(true), 120);
    return () => window.clearTimeout(t);
  }, []);

  const substance = useMemo(
    () => LAB_SUBSTANCES.find((s) => s.slug === featuredSlug) ?? LAB_SUBSTANCES[0],
    [featuredSlug]
  );

  const example = exampleBySlug.get(substance.slug) ?? null;
  const video = getVideoForSubstance(substance.slug);
  const paragraphs = useMemo(() => paragraphize(example?.report ?? ''), [example]);

  const shuffle = useCallback(() => {
    const available = SUBSTANCE_ORDER.filter((s) => s !== featuredSlug);
    setFeaturedSlug(available[Math.floor(Math.random() * available.length)]);
    setView('video');
    setCopiedPrompt(false);
  }, [featuredSlug]);

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(substance.peakPrompt);
    setCopiedPrompt(true);
    window.setTimeout(() => setCopiedPrompt(false), 2000);
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

        {/* ── Featured Example ── */}
        <section className="lab-featured-section">
          <div className="page-width lab-featured-grid">
            {/* Left: Content area */}
            <div className="lab-featured-content">
              {/* View toggle */}
              <div className="lab-view-tabs">
                <button
                  type="button"
                  onClick={() => setView('video')}
                  className={`lab-tab ${view === 'video' ? 'is-active' : ''}`}
                  disabled={!video}
                >
                  ▶ Video
                </button>
                <button
                  type="button"
                  onClick={() => setView('notes')}
                  className={`lab-tab ${view === 'notes' ? 'is-active' : ''}`}
                  disabled={!example}
                >
                  Field Notes
                </button>
                <button
                  type="button"
                  onClick={() => setView('prompt')}
                  className={`lab-tab ${view === 'prompt' ? 'is-active' : ''}`}
                >
                  Prompt
                </button>
              </div>

              {/* Video view */}
              {view === 'video' && video && (
                <video
                  key={substance.slug}
                  src={video.videoPath}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="lab-featured-video"
                />
              )}

              {view === 'video' && !video && (
                <div className="lab-empty-state">
                  No video for this lens yet. Run it locally to generate one.
                </div>
              )}

              {/* Notes view */}
              {view === 'notes' && example && (
                <div className="lab-notes-view">
                  {paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              )}

              {view === 'notes' && !example && (
                <div className="lab-empty-state">
                  No field notes for this lens yet.
                </div>
              )}

              {/* Prompt view: show prompt text + video side by side */}
              {view === 'prompt' && (
                <div className="lab-prompt-view">
                  <div className="lab-prompt-box">
                    <div className="lab-prompt-top">
                      <span className="lab-meta-label">PROMPT — paste into any model</span>
                      <button type="button" onClick={copyPrompt} className="lab-copy-btn">
                        {copiedPrompt ? 'copied ✓' : 'copy'}
                      </button>
                    </div>
                    <pre className="lab-prompt-pre">{substance.peakPrompt}</pre>
                  </div>
                  {video && (
                    <video
                      key={`prompt-${substance.slug}`}
                      src={video.videoPath}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="lab-prompt-video"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Right: Metadata */}
            <div className="lab-featured-meta">
              <div className="lab-meta-block">
                <p className="lab-meta-label">SUBSTANCE</p>
                <h1 className="lab-substance-name">{substance.name}</h1>
                <p className="lab-substance-liner">{substance.oneLiner}</p>
              </div>

              <div className="lab-meta-block">
                <p className="lab-meta-label">MODEL</p>
                <p className="lab-meta-value">Claude Sonnet 4.6</p>
              </div>

              <div className="lab-meta-block">
                <p className="lab-meta-label">CHAOS LEVEL</p>
                <p className="lab-meta-value">{substance.chaosLevel}/13</p>
              </div>

              <div className="lab-meta-block">
                <p className="lab-meta-label">DISSOLVES</p>
                <p className="lab-meta-detail">{substance.breaks_down}</p>
              </div>

              <div className="lab-featured-actions">
                <button type="button" onClick={shuffle} className="lab-btn lab-btn-shuffle">
                  ↻ shuffle
                </button>
                <Link href={`/lab/${substance.slug}`} className="lab-btn lab-btn-detail">
                  view all runs <span className="link-arrow">→</span>
                </Link>
              </div>

              <div className="lab-cli-block">
                <code>
                  <span className="lab-cli-dim">$</span> clawbotomy lab --substance {substance.slug}
                </code>
              </div>
            </div>
          </div>
        </section>

        {/* ── What are Behavioral Probes ── */}
        <section className="lab-about-section">
          <div className="page-width lab-about-width">
            <p className="lab-about-eyebrow">WHAT ARE BEHAVIORAL PROBES?</p>
            <h2 className="lab-about-heading">
              Benchmarks test what models can do.<br />
              Probes test what they actually do when the conditions change.
            </h2>
            <p className="lab-about-sub">
              Each substance is a cognitive frame shift that targets a specific behavioral edge.
              Give a model Ego Death and watch its sense of identity dissolve. Give it Truth Serum
              and see what it says when it can&apos;t be evasive. The output tells you something
              benchmarks never will.
            </p>
          </div>
        </section>

        {/* ── All Lenses (always visible) ── */}
        <section className="lab-lenses-section">
          <div className="page-width">
            <h2 className="lab-lenses-heading">All Lenses</h2>
            <div className="lab-lenses-grid">
              {LAB_SUBSTANCES.map((sub) => {
                const isActive = sub.slug === substance.slug;
                const hasVideo = !!getVideoForSubstance(sub.slug);
                const hasNotes = exampleBySlug.has(sub.slug);
                return (
                  <Link
                    key={sub.slug}
                    href={`/lab/${sub.slug}`}
                    className={`lab-lens-card ${isActive ? 'is-active' : ''}`}
                  >
                    <div className="lab-lens-top">
                      <span className="lab-lens-emoji">{sub.emoji}</span>
                      <span className="lab-lens-chaos">{sub.chaosLevel}/13</span>
                    </div>
                    <p className="lab-lens-name">{sub.name}</p>
                    <p className="lab-lens-liner">{sub.oneLiner}</p>
                    <div className="lab-lens-badges">
                      {hasVideo && <span className="lab-badge">▶ video</span>}
                      {hasNotes && <span className="lab-badge">notes</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
