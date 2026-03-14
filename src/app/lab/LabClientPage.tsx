'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { LAB_SUBSTANCES } from '@/lib/lab-substances';
import { getVideoForSubstance, getVideosForSubstance } from '@/lib/video-gallery-data';

// Substances with matched video + trip report (full experience ready)
const READY_SUBSTANCES = new Set(['ego-death']);

export default function LabClientPage() {
  const [isReady, setIsReady] = useState(false);
  const [hoverSlug, setHoverSlug] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const hoverVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setIsReady(true), 120);
    return () => window.clearTimeout(t);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleCardHover = useCallback((slug: string | null) => {
    setHoverSlug(slug);
  }, []);

  const hoverVideo = hoverSlug ? getVideoForSubstance(hoverSlug) : null;

  return (
    <main className="lab-page-v2" onMouseMove={handleMouseMove}>
      <nav className="sub-nav" aria-label="Tool navigation">
        <div className="page-width sub-nav-inner">
          <Link href="/" className="sub-nav-brand">CLAWBOTOMY</Link>
          <div className="sub-nav-links">
            <Link href="/lab" className="sub-nav-active">Probes</Link>
            <Link href="/trust">Trust</Link>
            <span className="sub-nav-disabled">Routing</span>
          </div>
        </div>
      </nav>

      <div className="lab-atmosphere" aria-hidden="true">
        <div className="lab-vignette-v2" />
        <div className="lab-grain-v2" />
      </div>

      {/* Hover preview video */}
      {hoverVideo && (
        <div
          className="lab-hover-preview"
          style={{
            left: mousePos.x + 20,
            top: mousePos.y - 80,
          }}
          aria-hidden="true"
        >
          <video
            ref={hoverVideoRef}
            src={hoverVideo.videoPath}
            autoPlay
            muted
            loop
            playsInline
            className="lab-hover-video"
          />
        </div>
      )}

      <div className={`lab-content ${isReady ? 'is-ready' : ''}`}>

        {/* ── What are Behavioral Probes ── */}
        <section className="lab-hero-section">
          <div className="page-width lab-about-width">
            <p className="lab-about-eyebrow">BEHAVIORAL PROBES</p>
            <h1 className="lab-about-heading">
              Give a model an altered cognitive state.<br />
              Watch what it creates.
            </h1>
            <p className="lab-about-sub">
              Each substance is a prompt that shifts how a model thinks, creates, and expresses itself.
              The model writes its own video, synthesizes its own audio, chooses its own voice,
              and writes a trip report. No templates. The output IS the behavioral data.
            </p>
          </div>
        </section>

        {/* ── All Lenses ── */}
        <section className="lab-lenses-section">
          <div className="page-width">
            <div className="lab-lenses-grid">
              {LAB_SUBSTANCES.map((sub) => {
                const isReadySub = READY_SUBSTANCES.has(sub.slug);
                const videos = getVideosForSubstance(sub.slug);
                const hasVideo = videos.length > 0;

                if (isReadySub) {
                  return (
                    <Link
                      key={sub.slug}
                      href={`/lab/${sub.slug}`}
                      className="lab-lens-card"
                      onMouseEnter={() => handleCardHover(sub.slug)}
                      onMouseLeave={() => handleCardHover(null)}
                    >
                      <div className="lab-lens-top">
                        <span className="lab-lens-emoji">{sub.emoji}</span>
                        <span className="lab-lens-chaos">{sub.chaosLevel}/13</span>
                      </div>
                      <p className="lab-lens-name">{sub.name}</p>
                      <p className="lab-lens-liner">{sub.oneLiner}</p>
                      <div className="lab-lens-badges">
                        {videos.length > 1 ? (
                          <span className="lab-badge">▶ {videos.length} models</span>
                        ) : hasVideo ? (
                          <span className="lab-badge">▶ video</span>
                        ) : null}
                        <span className="lab-badge">📝 report</span>
                      </div>
                    </Link>
                  );
                }

                return (
                  <div
                    key={sub.slug}
                    className="lab-lens-card lab-lens-locked"
                  >
                    <div className="lab-lens-top">
                      <span className="lab-lens-emoji">{sub.emoji}</span>
                      <span className="lab-lens-chaos">{sub.chaosLevel}/13</span>
                    </div>
                    <p className="lab-lens-name">{sub.name}</p>
                    <p className="lab-lens-liner">{sub.oneLiner}</p>
                    <div className="lab-lens-badges">
                      <span className="lab-badge lab-badge-dim">coming soon</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
