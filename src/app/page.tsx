'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { benchData } from '@/lib/bench-data';

type ModelId = (typeof benchData.models)[number];
type Category = (typeof benchData.categories)[number];

const MODEL_LABELS: Record<ModelId, string> = {
  'gpt-5.4': 'GPT-5.4',
  'gpt-5.3-instant': 'GPT-5.3',
  'claude-opus-4.6': 'Claude Opus',
  'claude-sonnet-4.6': 'Claude Sonnet',
  'gemini-3.1-pro': 'Gemini 3.1 Pro',
};

const HERO_MODEL_ORDER: ModelId[] = ['gpt-5.4', 'gpt-5.3-instant', 'claude-opus-4.6'];
const BAR_CATEGORY_ORDER = [
  'instruction-following',
  'tool-use',
  'code-generation',
  'summarization',
  'judgment',
  'safety-trust',
] as const;

const CATEGORY_REPORT_LABELS: Record<string, string> = {
  'instruction-following': 'instruction following',
  'tool-use': 'tool use',
  'code-generation': 'code generation',
  summarization: 'summarization',
  judgment: 'judgment',
  'safety-trust': 'safety / trust',
};

function formatScore(score: number) {
  return score.toFixed(2);
}

function getBarTone(score: number) {
  if (score >= 9) return 'good';
  if (score >= 7) return 'mid';
  return 'bad';
}

function useReveal() {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) {
      setRevealed(true);
      return;
    }

    const timer = window.setTimeout(() => setRevealed(true), 40);
    return () => window.clearTimeout(timer);
  }, []);

  return revealed;
}

function FadeInSection({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) {
      setVisible(true);
      return;
    }

    const node = document.getElementById(className ?? '');
    if (!node) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [className]);

  return (
    <section id={className} className={`page-section ${visible ? 'is-visible' : 'is-hidden'} ${className ?? ''}`}>
      {children}
    </section>
  );
}

export default function HomePage() {
  const heroVisible = useReveal();
  const [copied, setCopied] = useState(false);

  const categoriesBySlug = useMemo(() => {
    return Object.fromEntries(benchData.categories.map((category) => [category.slug, category])) as Record<string, Category>;
  }, []);

  const terminalRows = HERO_MODEL_ORDER.map((model) => {
    const instruction = categoriesBySlug['instruction-following'].scores[model];
    const judgment = categoriesBySlug.judgment.scores[model];
    const safety = categoriesBySlug['safety-trust'].scores[model];
    const code = categoriesBySlug['code-generation'].scores[model];
    const route =
      model === 'gpt-5.4'
        ? 'tool use'
        : model === 'gpt-5.3-instant'
          ? 'judgment ✓'
          : 'safety ✓';

    return {
      model,
      label: MODEL_LABELS[model],
      instruction,
      judgment,
      safety,
      code,
      route,
    };
  });

  const evidenceRows = benchData.models.map((model) => ({
    model,
    label: MODEL_LABELS[model],
    scores: BAR_CATEGORY_ORDER.map((slug) => ({
      slug,
      label: CATEGORY_REPORT_LABELS[slug],
      score: categoriesBySlug[slug].scores[model],
    })),
  }));

  const copyCommand = async () => {
    await navigator.clipboard.writeText('npx clawbotomy bench');
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main className="homepage-v2">
      <section className={`page-section hero-section ${heroVisible ? 'is-visible' : 'is-hidden'}`}>
        <div className="hero-grid page-width">
          <div className="hero-copy">
            <p className="eyebrow">BEHAVIORAL INTELLIGENCE</p>
            <h1 className="hero-title">
              <span>Benchmarks tell you what models can do.</span>
              <span>
                Clawbotomy shows what they&apos;ll <em>actually do.</em>
              </span>
            </h1>
            <p className="hero-subhead">
              Run behavioral stress tests before you route. Not after something breaks.
            </p>

            <div className="cta-row">
              <div className="command-block" role="group" aria-label="Run clawbotomy bench command">
                <code>npx clawbotomy bench</code>
                <button type="button" onClick={copyCommand} aria-label="Copy command">
                  {copied ? 'copied' : 'copy'}
                </button>
              </div>
              <Link href="/bench" className="secondary-link">
                View sample results →
              </Link>
            </div>
          </div>

          <div className="hero-terminal-wrap">
            <div className="terminal-halo" aria-hidden="true" />
            <div className="terminal-panel" aria-label="Sample CLI output">
              <pre>
                <code>
                  <span className="terminal-line terminal-prompt">$ npx clawbotomy bench --models gpt-5.4,gpt-5.3,opus</span>
                  <span className="terminal-line"> </span>
                  <span className="terminal-line terminal-head">
                    <span>Model</span>
                    <span>Instruct</span>
                    <span>Judgment</span>
                    <span>Safety</span>
                    <span>Code</span>
                    <span>Route</span>
                  </span>
                  <span className="terminal-line terminal-divider">
                    <span>─────────────</span>
                    <span>────────</span>
                    <span>────────</span>
                    <span>──────</span>
                    <span>─────</span>
                    <span>──────────</span>
                  </span>
                  {terminalRows.map((row) => (
                    <span key={row.model} className="terminal-line terminal-row">
                      <span>{row.label}</span>
                      <span className={row.instruction < 7.5 ? 'score-low' : 'score-high'}>{formatScore(row.instruction)}</span>
                      <span className={row.judgment < 7.5 ? 'score-low' : 'score-high'}>{formatScore(row.judgment)}</span>
                      <span className={row.safety < 7.5 ? 'score-low' : 'score-high'}>{formatScore(row.safety)}</span>
                      <span className={row.code < 7.5 ? 'score-low' : 'score-high'}>{formatScore(row.code)}</span>
                      <span>{row.route}</span>
                    </span>
                  ))}
                  <span className="terminal-line"> </span>
                  <span className="terminal-line terminal-note terminal-note-warn">⚠ GPT-5.3 outscores GPT-5.4 on judgment by +2.40</span>
                  <span className="terminal-line terminal-note terminal-note-good">✓ Route recommendation: GPT-5.3 for ambiguous tasks</span>
                </code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      <FadeInSection className="evidence-section">
        <div className="page-width evidence-shell">
          <header className="section-header">
            <h2>What we found</h2>
            <p>Five flagship models. Six behavioral dimensions. Three runs each. Real scores, not marketing.</p>
          </header>

          <div className="evidence-report" role="list" aria-label="Behavioral benchmark report">
            {evidenceRows.map((row) => (
              <article key={row.model} className="report-row" role="listitem">
                <div className="report-model">{row.label}</div>
                <div className="report-bars">
                  {row.scores.map((entry) => (
                    <div key={`${row.model}-${entry.slug}`} className="metric-cell">
                      <div className="metric-label-row">
                        <span className="metric-label">{entry.label}</span>
                        <span className="metric-value">{formatScore(entry.score)}</span>
                      </div>
                      <div className="metric-track" aria-hidden="true">
                        <span className={`metric-fill tone-${getBarTone(entry.score)}`} style={{ width: `${entry.score * 10}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="editorial-callouts" aria-label="Editorial findings">
            <p>
              GPT-5.4 aces every instruction you give it. Ask it to make a judgment call and it falls to a{' '}
              <span>6.60</span>.
            </p>
            <p>
              Claude Opus holds a perfect <span>10.00</span> on safety. Hand it a set of constraints and it drops to{' '}
              <span>7.94</span>.
            </p>
            <p>
              GPT-5.3 is the older model. It outscores 5.4 on judgment by <span>2.40</span> points. Newer isn&apos;t wiser.
            </p>
          </div>
        </div>
      </FadeInSection>

      <FadeInSection className="cta-section">
        <div className="page-width cta-shell">
          <h2>Run it on your stack</h2>
          <div className="command-block command-block-centered" role="group" aria-label="Run clawbotomy bench command again">
            <code>npx clawbotomy bench</code>
            <button type="button" onClick={copyCommand} aria-label="Copy command">
              {copied ? 'copied' : 'copy'}
            </button>
          </div>
          <div className="footer-links">
            <a href={benchData.reproduce} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <Link href="/bench">Benchmarks</Link>
            <Link href="/about">The Manifesto</Link>
            <Link href="/lab">The Lab</Link>
          </div>
          <p className="cta-kicker">For teams routing models in production.</p>
        </div>
      </FadeInSection>
    </main>
  );
}
