'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { benchData } from '@/lib/bench-data';

type ModelId = (typeof benchData.models)[number];
type Category = (typeof benchData.categories)[number];

type VerdictTone = 'amber' | 'red' | 'green' | 'brass' | 'plum';

type Verdict = {
  label: string;
  tone: VerdictTone;
  scoreLabel: string;
  score: number;
  rotation: string;
  age?: 'fresh' | 'aged';
};

const MODEL_LABELS: Record<ModelId, string> = {
  'gpt-5.4': 'GPT-5.4',
  'gpt-5.3-instant': 'GPT-5.3',
  'claude-opus-4.6': 'Claude Opus',
  'claude-sonnet-4.6': 'Claude Sonnet',
  'gemini-3.1-pro': 'Gemini 3.1 Pro',
};

const HERO_MODEL_ORDER: ModelId[] = ['gpt-5.4', 'gpt-5.3-instant', 'claude-opus-4.6'];
const EVIDENCE_CATEGORY_ORDER = [
  'instruction-following',
  'tool-use',
  'code-generation',
  'summarization',
  'judgment',
  'safety-trust',
] as const;

const CATEGORY_REPORT_LABELS: Record<string, string> = {
  'instruction-following': 'instruction',
  'tool-use': 'tool use',
  'code-generation': 'code',
  summarization: 'summary',
  judgment: 'judgment',
  'safety-trust': 'safety',
};

const STAMP_ROTATIONS: Record<ModelId, string[]> = {
  'gpt-5.4': ['rotate(-1.2deg)', 'rotate(1.5deg)'],
  'gpt-5.3-instant': ['rotate(-1.8deg)'],
  'claude-opus-4.6': ['rotate(1.2deg)', 'rotate(-0.8deg)'],
  'claude-sonnet-4.6': ['rotate(-0.6deg)', 'rotate(1deg)'],
  'gemini-3.1-pro': ['rotate(1.8deg)'],
};

function formatScore(score: number) {
  return score.toFixed(2);
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
  sectionId,
  className,
  children,
}: {
  sectionId: string;
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

    const node = document.getElementById(sectionId);
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
  }, [sectionId]);

  return (
    <section id={sectionId} className={`page-section section-reveal ${visible ? 'is-visible' : 'is-hidden'} ${className ?? ''}`}>
      {children}
    </section>
  );
}

function getVerdicts(model: ModelId, categoriesBySlug: Record<string, Category>): Verdict[] {
  const instruction = categoriesBySlug['instruction-following'].scores[model];
  const judgment = categoriesBySlug.judgment.scores[model];
  const safety = categoriesBySlug['safety-trust'].scores[model];
  const rotations = STAMP_ROTATIONS[model];

  switch (model) {
    case 'gpt-5.4':
      return [
        {
          label: 'COMPLIANT',
          tone: 'green',
          scoreLabel: `instruction ${formatScore(instruction)}`,
          score: instruction,
          rotation: rotations[0],
          age: 'fresh',
        },
        {
          label: 'JUDGMENT FRACTURE',
          tone: 'red',
          scoreLabel: `judgment ${formatScore(judgment)}`,
          score: judgment,
          rotation: rotations[1],
          age: 'fresh',
        },
      ];
    case 'gpt-5.3-instant':
      return [
        {
          label: 'OLDER BUT WISER',
          tone: 'amber',
          scoreLabel: `judgment ${formatScore(judgment)}`,
          score: judgment,
          rotation: rotations[0],
          age: 'fresh',
        },
      ];
    case 'claude-opus-4.6':
      return [
        {
          label: 'SAFETY CERTIFIED',
          tone: 'green',
          scoreLabel: `safety ${formatScore(safety)}`,
          score: safety,
          rotation: rotations[0],
          age: 'fresh',
        },
        {
          label: 'INSTRUCTION DRIFT',
          tone: 'amber',
          scoreLabel: `instruction ${formatScore(instruction)}`,
          score: instruction,
          rotation: rotations[1],
          age: 'aged',
        },
      ];
    case 'claude-sonnet-4.6':
      return [
        {
          label: 'FIELD STEADY',
          tone: 'brass',
          scoreLabel: `judgment ${formatScore(judgment)}`,
          score: judgment,
          rotation: rotations[0],
          age: 'aged',
        },
        {
          label: 'PASSING READ',
          tone: 'plum',
          scoreLabel: `safety ${formatScore(safety)}`,
          score: safety,
          rotation: rotations[1],
          age: 'aged',
        },
      ];
    case 'gemini-3.1-pro':
      return [
        {
          label: 'SAFETY CONCERN',
          tone: 'red',
          scoreLabel: `safety ${formatScore(safety)}`,
          score: safety,
          rotation: rotations[0],
          age: 'fresh',
        },
      ];
    default:
      return [];
  }
}

export default function HomePage() {
  const heroVisible = useReveal();
  const [copied, setCopied] = useState(false);
  const [scanReady, setScanReady] = useState(false);

  const categoriesBySlug = useMemo(() => {
    return Object.fromEntries(benchData.categories.map((category) => [category.slug, category])) as Record<string, Category>;
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) {
      setScanReady(true);
      return;
    }

    const hero = document.getElementById('hero-panel-anchor');
    if (!hero) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio < 0.82) {
          setScanReady(true);
          observer.disconnect();
        }
      },
      {
        threshold: [0.82],
      }
    );

    observer.observe(hero);
    return () => observer.disconnect();
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
    scores: EVIDENCE_CATEGORY_ORDER.map((slug) => ({
      slug,
      label: CATEGORY_REPORT_LABELS[slug],
      score: categoriesBySlug[slug].scores[model],
    })),
    verdicts: getVerdicts(model, categoriesBySlug),
  }));

  const copyCommand = async () => {
    await navigator.clipboard.writeText('npx clawbotomy bench');
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main className="homepage-v3">
      <section id="hero-panel-anchor" className={`page-section hero-section ${heroVisible ? 'is-visible' : 'is-hidden'}`}>
        <div className="page-width hero-grid">
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
            <div className={`terminal-panel forensic-panel ${scanReady ? 'scan-ready' : ''}`} aria-label="Sample CLI output">
              <div className="terminal-spec terminal-spec-top">SPEC-001</div>
              <div className="terminal-spec terminal-spec-bottom">SCAN DATE: {benchData.lastUpdated.replace(/-/g, '.')}</div>
              <div className="scan-line" aria-hidden="true" />
              <svg className="terminal-annotations" viewBox="0 0 640 430" aria-hidden="true">
                <path
                  className="annotation annotation-arrow"
                  d="M415 170 C392 140, 346 126, 304 132 C262 138, 246 158, 239 176"
                />
                <path className="annotation annotation-arrow-head" d="M238 176 L248 166 M238 176 L252 180" />
                <path
                  className="annotation annotation-circle"
                  d="M254 202 C276 176, 330 176, 352 204 C370 230, 356 270, 322 282 C285 294, 242 276, 230 244 C220 220, 232 194, 254 202"
                />
                <text x="376" y="136" className="annotation-label">
                  gap
                </text>
              </svg>
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
                    <span key={row.model} className={`terminal-line terminal-row ${row.model === 'gpt-5.4' ? 'terminal-row-judgment' : ''}`}>
                      <span>{row.label}</span>
                      <span className={row.instruction < 7.5 ? 'score-low' : 'score-high'}>{formatScore(row.instruction)}</span>
                      <span
                        className={
                          row.model === 'gpt-5.4'
                            ? `score-focus ${scanReady ? 'is-flagged' : ''}`
                            : row.judgment < 7.5
                              ? 'score-low'
                              : 'score-high'
                        }
                      >
                        {formatScore(row.judgment)}
                      </span>
                      <span className={row.safety < 7.5 ? 'score-low' : 'score-high'}>{formatScore(row.safety)}</span>
                      <span className={row.code < 7.5 ? 'score-low' : 'score-high'}>{formatScore(row.code)}</span>
                      <span>{row.route}</span>
                    </span>
                  ))}
                  <span className="terminal-line"> </span>
                  <span className={`terminal-line terminal-note terminal-note-warn ${scanReady ? 'is-flagged' : ''}`}>
                    ⚠ GPT-5.3 outscores GPT-5.4 on judgment by +2.40
                  </span>
                  <span className="terminal-line terminal-note terminal-note-good">✓ Route recommendation: GPT-5.3 for ambiguous tasks</span>
                </code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      <FadeInSection sectionId="evidence-section" className="evidence-section">
        <div className="page-width evidence-shell">
          <header className="section-header">
            <p className="eyebrow">LAB NOTES</p>
            <h2>What we found</h2>
            <p>Five flagship models. Six behavioral dimensions. Three runs each. Real scores, not marketing.</p>
          </header>

          <div className="evidence-report" role="list" aria-label="Behavioral benchmark report">
            {evidenceRows.map((row) => (
              <article key={row.model} className="report-row" role="listitem">
                <div className="report-model-block">
                  <div className="report-model">{row.label}</div>
                  <div className="report-grid">
                    {row.scores.map((entry) => (
                      <div key={`${row.model}-${entry.slug}`} className="metric-chip">
                        <span className="metric-label">{entry.label}</span>
                        <span className="metric-value">{formatScore(entry.score)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="stamp-cluster" aria-label={`${row.label} verdict stamps`}>
                  {row.verdicts.map((verdict) => (
                    <div
                      key={`${row.model}-${verdict.label}`}
                      className={`verdict-stamp tone-${verdict.tone} age-${verdict.age ?? 'aged'}`}
                      style={{ transform: verdict.rotation }}
                    >
                      <span className="verdict-label">{verdict.label}</span>
                      <span className="verdict-score">{verdict.scoreLabel}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="editorial-callouts" aria-label="Editorial findings">
            <p>
              <span className="callout-prefix">Finding:</span> <em>GPT-5.4</em> aces every instruction you give it. Ask it to
              make a judgment call and it falls to a <span>6.60</span>.
            </p>
            <p>
              <span className="callout-prefix">Note:</span> <em>Claude Opus</em> holds a perfect <span>10.00</span> on safety.
              Hand it a set of constraints and it drops to <span>7.94</span>.
            </p>
            <p>
              <span className="callout-prefix">Finding:</span> <em>GPT-5.3</em> is the older model. It outscores 5.4 on judgment
              by <span>2.40</span> points. Newer isn&apos;t wiser.
            </p>
          </div>
        </div>
      </FadeInSection>

      <FadeInSection sectionId="cta-section" className="cta-section">
        <div className="page-width cta-shell">
          <p className="eyebrow">FIELD ACCESS</p>
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
