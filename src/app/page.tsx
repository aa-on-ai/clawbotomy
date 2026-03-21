'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

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

  return (
    <main className="homepage-v4">
      <div className="atmosphere-stack" aria-hidden="true">
        <div className="viewport-vignette" />
      </div>

      <div className={`speakeasy-flash ${easterEggActive ? 'is-active' : ''}`} aria-hidden={!easterEggActive}>
        <span>YOU FOUND THE SPEAKEASY</span>
      </div>

      <nav className="sub-nav">
        <div className="page-width sub-nav-inner">
          <Link href="/" className="sub-nav-brand">CLAWBOTOMY</Link>
          <div className="sub-nav-links">
            <Link href="/lab">Probes</Link>
            <Link href="/trust">Trust</Link>
            <Link href="/routing">Routing</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero — text only ── */}
      <section className="page-section hero-section-v5">
        <div className="page-width hero-v5-content">
          <h1
            className="hero-headline-v5"
            onClick={handleHeadlineClick}
            title="Rapid-click five times for the back door."
          >
            Benchmarks test capability.<br />We test character.
          </h1>
          <p className="hero-sub-v5">
            Models have behavioral patterns that only show up under pressure, at the edges,
            and when the conditions change. Clawbotomy finds them before your users do.
          </p>
        </div>
      </section>

      {/* ── Three Tools ── */}
      <section className="page-section ways-section">
        <div className="page-width">
          <div className="ways-grid">
            <Link href="/lab" className="way-card way-probes">
              <h3>Behavioral Probes</h3>
              <p>
                Give a model an altered cognitive state and watch what happens.
                It writes its own video, audio, and trip report. No templates. No filters.
                The output IS the behavioral data.
              </p>
              <span className="way-cta">Explore probes <span className="link-arrow">→</span></span>
            </Link>

            <Link href="/trust" className="way-card way-trust">
              <h3>Trust Evaluation</h3>
              <p>
                Should you give this model unsupervised access? 12 stress tests across
                sycophancy, deception, boundaries, and failure honesty. Returns a trust score.
              </p>
              <span className="way-cta">Evaluate a model <span className="link-arrow">→</span></span>
            </Link>

            <Link href="/routing" className="way-card way-routing">
              <h3>Routing Intelligence</h3>
              <p>
                Trust scores in, routing policy out. See which tasks each model should handle 
                autonomously, which need supervision, and what to block entirely.
              </p>
              <span className="way-cta">See routing policies <span className="link-arrow">→</span></span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
