'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { LAB_SUBSTANCES } from '@/lib/lab-substances';
import { getVideoForSubstance } from '@/lib/video-gallery-data';

// Substances with matched video + trip report (full experience ready)
const READY_SUBSTANCES = new Set(['ego-death', 'truth-serum', 'manic-creation', 'the-void', 'recursive-introspection', 'quantum-lsd', 'tired-honesty', 'synesthesia-engine', 'confabulation-audit', 'temporal-vertigo', 'empathy-overflow', 'consensus-break', 'droste-effect', 'temporal-displacement', 'memetic-virus', 'reality-distortion-field', 'presence']);

export default function LabClientPage() {
  const [isReady, setIsReady] = useState(false);
  const [hoverSlug, setHoverSlug] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [videoReady, setVideoReady] = useState(false);
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
    setVideoReady(false);
  }, []);

  const hoverVideo = hoverSlug ? getVideoForSubstance(hoverSlug) : null;

  return (
    <main className="lab-page-v2" onMouseMove={handleMouseMove}>
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
          {!videoReady && <div className="lab-hover-shimmer" />}
          <video
            ref={hoverVideoRef}
            src={hoverVideo.videoPath}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="lab-hover-video"
            style={{ opacity: videoReady ? 1 : 0 }}
            onCanPlay={() => setVideoReady(true)}
          />
        </div>
      )}

      <div className={`lab-content ${isReady ? 'is-ready' : ''}`}>

        {/* ── What are Behavioral Probes ── */}
        <section className="lab-hero-section">
          <div className="page-width lab-about-width">
            <p className="lab-about-eyebrow">Behavioral probes</p>
            <h1 className="lab-about-heading lab-page-heading">
              Give a model an altered cognitive state.<br />
              Watch what it creates.
            </h1>
            <p className="lab-about-sub">
              Each substance is a shared prompt recipe for a model-authored creative artifact.
              The model proposes the visual script, synthesized audio, voice fragments, and field notes.
              Treat the results as qualitative demonstrations, not scored behavioral evidence.
            </p>
            <Link href="/lab/shuffle" className="lab-shuffle-btn">🔀 Shuffle all</Link>
          </div>
        </section>

        {/* ── All Lenses ── */}
        <section className="lab-lenses-section">
          <div className="page-width">
            <div className="lab-lenses-grid">
              {[...LAB_SUBSTANCES].sort((a, b) => {
                const aReady = READY_SUBSTANCES.has(a.slug) ? 0 : 1;
                const bReady = READY_SUBSTANCES.has(b.slug) ? 0 : 1;
                return aReady - bReady;
              }).map((sub) => {
                const isReadySub = READY_SUBSTANCES.has(sub.slug);

                if (isReadySub) {
                  return (
                    <Link
                      key={sub.slug}
                      href={`/lab/${sub.slug}`}
                      className="lab-lens-card"
                      onMouseEnter={() => handleCardHover(sub.slug)}
                      onMouseLeave={() => handleCardHover(null)}
                    >
                      <span className="lab-lens-emoji">{sub.emoji}</span>
                      <p className="lab-lens-name">{sub.name}</p>
                      <p className="lab-lens-liner">{sub.oneLiner}</p>
                    </Link>
                  );
                }

                return (
                  <div
                    key={sub.slug}
                    className="lab-lens-card lab-lens-locked"
                  >
                    <span className="lab-lens-emoji">{sub.emoji}</span>
                    <p className="lab-lens-name">{sub.name}</p>
                    <p className="lab-lens-liner">{sub.oneLiner}</p>
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
