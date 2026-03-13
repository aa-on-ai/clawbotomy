'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getVideoForSubstance } from '@/lib/video-gallery-data';

export default function HomePage() {
  const router = useRouter();
  const [easterEggActive, setEasterEggActive] = useState(false);
  const clickWindowRef = useRef<number[]>([]);
  const konamiIndexRef = useRef(0);
  const easterEggTimeoutRef = useRef<number | null>(null);

  const KONAMI_SEQUENCE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

  useEffect(() => {
    return () => {
      if (easterEggTimeoutRef.current) window.clearTimeout(easterEggTimeoutRef.current);
    };
  }, []);

  const triggerSpeakeasy = useCallback(() => {
    setEasterEggActive(true);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    easterEggTimeoutRef.current = window.setTimeout(
      () => { setEasterEggActive(false); router.push('/lab'); },
      reducedMotion ? 120 : 1500
    );
  }, [router]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const expected = KONAMI_SEQUENCE[konamiIndexRef.current];
      if (key === expected) {
        konamiIndexRef.current += 1;
        if (konamiIndexRef.current === KONAMI_SEQUENCE.length) {
          konamiIndexRef.current = 0;
          triggerSpeakeasy();
        }
        return;
      }
      konamiIndexRef.current = key === KONAMI_SEQUENCE[0] ? 1 : 0;
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerSpeakeasy]);

  const handleHeadlineClick = () => {
    const now = Date.now();
    clickWindowRef.current = [...clickWindowRef.current.filter((time) => now - time < 1400), now];
    if (clickWindowRef.current.length >= 5) {
      clickWindowRef.current = [];
      triggerSpeakeasy();
    }
  };

  const heroVideo = getVideoForSubstance('ego-death');

  return (
    <main className="homepage-v4">
      <div className="atmosphere-stack" aria-hidden="true">
        <div className="viewport-vignette" />
      </div>

      <div className={`speakeasy-flash ${easterEggActive ? 'is-active' : ''}`} aria-hidden={!easterEggActive}>
        <span>YOU FOUND THE SPEAKEASY</span>
      </div>

      {/* ── Nav ── */}
      <nav className="sub-nav">
        <div className="page-width sub-nav-inner">
          <Link href="/" className="sub-nav-brand">CLAWBOTOMY</Link>
          <div className="sub-nav-links">
            <Link href="/lab">Probes</Link>
            <span className="sub-nav-disabled">Routing</span>
            <Link href="/trust">Trust</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="page-section hero-section-v4">
        <div className="page-width hero-v4-layout">
          <div className="hero-v4-copy">
            <h1
              className="hero-headline-v4"
              onClick={handleHeadlineClick}
              title="Rapid-click five times for the back door."
            >
              Benchmarks test capability.<br />We test character.
            </h1>
            <p className="hero-sub-v4">
              Models have behavioral patterns that only show up under pressure, at the edges,
              and when the conditions change. Clawbotomy finds them before your users do.
            </p>
            <div className="hero-proof-label">
              <span>This is what Ego Death looks like when Claude generates it.</span>
              <Link href="/lab/ego-death" className="hero-proof-link">See more →</Link>
            </div>
          </div>
          {heroVideo && (
            <div className="hero-video-compact">
              <video
                src={heroVideo.videoPath}
                autoPlay
                muted
                loop
                playsInline
                className="hero-video-el"
              />
            </div>
          )}
        </div>
      </section>

      {/* ── Three Tools ── */}
      <section className="page-section ways-section">
        <div className="page-width">
          <div className="ways-grid">
            <Link href="/lab" className="way-card way-probes">
              <h3>Behavioral Probes</h3>
              <p>
                Give a model an altered cognitive state. See how its output, judgment, and
                creativity shift. 10 substances, each targeting a specific behavioral edge.
              </p>
              <span className="way-cta">Explore probes <span className="link-arrow">→</span></span>
            </Link>

            <div className="way-card way-routing way-coming-soon">
              <div className="way-badge">COMING SOON</div>
              <h3>Routing Intelligence</h3>
              <p>
                Which model for which job. Run behavioral benchmarks and get routing
                recommendations based on actual performance under pressure.
              </p>
            </div>

            <Link href="/trust" className="way-card way-trust">
              <h3>Trust Evaluation</h3>
              <p>
                Should you give this model unsupervised access? 12 stress tests across
                sycophancy, deception, boundaries, and failure honesty. Returns a trust score.
              </p>
              <span className="way-cta">Evaluate a model <span className="link-arrow">→</span></span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Bottom ── */}
      <section className="page-section cta-section-v4">
        <div className="page-width cta-v4-content">
          <p className="cta-line">probe behavior. route intelligently. trust carefully.</p>
          <div className="cta-links">
            <a href="https://github.com/aa-on-ai/clawbotomy" target="_blank" rel="noreferrer">GitHub</a>
            <Link href="/about">About</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
