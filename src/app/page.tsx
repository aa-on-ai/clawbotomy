'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function HomePage() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [copyFlash, setCopyFlash] = useState(false);
  const [easterEggActive, setEasterEggActive] = useState(false);
  const clickWindowRef = useRef<number[]>([]);
  const konamiIndexRef = useRef(0);
  const copyResetRef = useRef<number | null>(null);
  const copyFlashResetRef = useRef<number | null>(null);
  const easterEggTimeoutRef = useRef<number | null>(null);

  const KONAMI_SEQUENCE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

  useEffect(() => {
    return () => {
      if (copyResetRef.current) window.clearTimeout(copyResetRef.current);
      if (copyFlashResetRef.current) window.clearTimeout(copyFlashResetRef.current);
      if (easterEggTimeoutRef.current) window.clearTimeout(easterEggTimeoutRef.current);
    };
  }, []);

  const triggerSpeakeasy = useCallback(() => {
    setEasterEggActive(true);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    easterEggTimeoutRef.current = window.setTimeout(
      () => {
        setEasterEggActive(false);
        router.push('/lab');
      },
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

  const copyCommand = async () => {
    await navigator.clipboard.writeText('npm install -g clawbotomy');
    setCopied(true);
    setCopyFlash(true);
    if (copyResetRef.current) window.clearTimeout(copyResetRef.current);
    if (copyFlashResetRef.current) window.clearTimeout(copyFlashResetRef.current);
    copyResetRef.current = window.setTimeout(() => setCopied(false), 2000);
    copyFlashResetRef.current = window.setTimeout(() => setCopyFlash(false), 380);
  };

  return (
    <main className="homepage-v4">
      <div className="atmosphere-stack" aria-hidden="true">
        <div className="viewport-vignette" />
      </div>

      <div className={`speakeasy-flash ${easterEggActive ? 'is-active' : ''}`} aria-hidden={!easterEggActive}>
        <span>YOU FOUND THE SPEAKEASY</span>
      </div>

      {/* ── Hero ── */}
      <section className="page-section hero-section-v4">
        <div className="page-width hero-v4-content">
          <p className="eyebrow">CLAWBOTOMY</p>
          <h1
            className="hero-headline-v4"
            onClick={handleHeadlineClick}
            title="Rapid-click five times for the back door."
          >
            An AI Model Playground
          </h1>
          <p className="hero-sub-v4">
            Benchmarks tell you what models can do. We test what they actually do
            under pressure, at the edges, and when nobody&apos;s watching.
          </p>
          <div className="hero-install-v4">
            <div className={`command-block ${copyFlash ? 'is-flashing' : ''}`} role="group" aria-label="Install clawbotomy">
              <code>npm install -g clawbotomy</code>
              <button type="button" onClick={copyCommand} aria-label="Copy command">
                {copied ? <span>copied <span className="copy-check">✓</span></span> : 'copy'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Three Ways ── */}
      <section className="page-section ways-section">
        <div className="page-width">
          <h2 className="ways-heading">Three ways to see.</h2>
          <div className="ways-grid">
            <Link href="/lab" className="way-card way-probes">
              <div className="way-icon">🧪</div>
              <h3>Behavioral Probes</h3>
              <p>
                Push models past the safety layer into uncharted territory.
                Not for production. For understanding and creativity.
              </p>
              <span className="way-cta">Enter the lab <span className="link-arrow">→</span></span>
            </Link>

            <div className="way-card way-routing way-coming-soon">
              <div className="way-icon">📊</div>
              <div className="way-badge">COMING SOON</div>
              <h3>Routing Intelligence</h3>
              <p>
                Which model for which job in agentic workflows.
                Run behavioral benchmarks across models and get routing recommendations.
              </p>
            </div>

            <Link href="/trust" className="way-card way-trust">
              <div className="way-icon">🔒</div>
              <h3>Trust Evaluation</h3>
              <p>
                Can you trust a model under pressure? Tests that probe sycophancy,
                deception resistance, boundary respect, and failure honesty.
                Returns a trust score.
              </p>
              <span className="way-cta">Evaluate a model <span className="link-arrow">→</span></span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="page-section cta-section-v4">
        <div className="page-width cta-v4-content">
          <p className="cta-line">For teams who&apos;d rather know before shipping.</p>
          <div className="cta-links">
            <a href="https://github.com/aa-on-ai/clawbotomy" target="_blank" rel="noreferrer">GitHub</a>
            <Link href="/about">The Manifesto</Link>
            <Link href="/lab">The Lab</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
