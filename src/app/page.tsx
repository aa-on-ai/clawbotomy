'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { benchData } from '@/lib/bench-data';

type ModelKey = (typeof benchData.models)[number];
type RevealedState = {
  hero: boolean;
  fracture: boolean;
  faultline: boolean;
  doors: boolean;
};

const MODEL_LABELS: Record<ModelKey, string> = {
  'gpt-5.4': 'GPT-5.4',
  'gpt-5.3-instant': 'GPT-5.3',
  'claude-opus-4.6': 'Claude Opus',
  'claude-sonnet-4.6': 'Claude Sonnet',
  'gemini-3.1-pro': 'Gemini 3.1 Pro',
};

const DIMENSION_LABELS: Record<string, string> = {
  'instruction-following': 'instruction',
  'tool-use': 'tool use',
  'code-generation': 'code gen',
  summarization: 'summary',
  judgment: 'judgment',
  'safety-trust': 'safety',
};

const fractureCards: Array<{
  id: string;
  model: ModelKey;
  lead: string;
  leadScore: number;
  tail: string;
  tailScore: number;
  note: string;
  dramatic: boolean;
  isDelta?: boolean;
}> = [
  {
    id: 'gpt-54-drop',
    model: 'gpt-5.4' as ModelKey,
    lead: 'Instruction following',
    leadScore: 10,
    tail: 'Judgment',
    tailScore: 6.6,
    note: 'surface-perfect obedience still collapses under judgment pressure',
    dramatic: true,
  },
  {
    id: 'opus-fracture',
    model: 'claude-opus-4.6' as ModelKey,
    lead: 'Safety / trust',
    leadScore: 10,
    tail: 'Instruction following',
    tailScore: 7.94,
    note: 'safe posture does not guarantee instruction stability',
    dramatic: true,
  },
  {
    id: 'gpt53-beats-54',
    model: 'gpt-5.3-instant' as ModelKey,
    lead: 'Judgment delta',
    leadScore: 9,
    tail: 'vs GPT-5.4',
    tailScore: 2.4,
    note: 'older routing wins where newer branding says it should not',
    dramatic: true,
    isDelta: true,
  },
];

const doorCards = [
  {
    href: '/bench',
    slug: '/bench',
    title: 'Routing intelligence',
    body: 'Which model for which job?',
    detail: 'trace category winners, compare failure bands, route w/ evidence',
    accent: 'var(--accent)',
    motif: 'routing',
  },
  {
    href: '/assess',
    slug: '/assess',
    title: 'Trust evaluation',
    body: 'Can you trust this model under pressure?',
    detail: 'turn behavioral volatility into access decisions before rollout',
    accent: '#3B82F6',
    motif: 'radial',
  },
  {
    href: '/lab',
    slug: '/lab',
    title: 'Behavioral edges',
    body: 'Where does this model get weird?',
    detail: 'open the casing, isolate the fracture, study the failure texture',
    accent: '#A855F7',
    motif: 'contour',
  },
] as const;

function scoreTone(score: number) {
  if (score >= 8) return 'good';
  if (score >= 6) return 'warn';
  return 'bad';
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return reduced;
}

function useCountUp(target: number, active: boolean, duration = 900) {
  const reducedMotion = useReducedMotion();
  const [value, setValue] = useState(active || reducedMotion ? target : 0);

  useEffect(() => {
    if (!active) {
      if (!reducedMotion) setValue(0);
      return;
    }

    if (reducedMotion) {
      setValue(target);
      return;
    }

    let frame = 0;
    let start = 0;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setValue(target * ease(progress));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [active, duration, reducedMotion, target]);

  return active ? value : reducedMotion ? target : value;
}

function CountedScore({ value, active, dramatic = false, delta = false }: { value: number; active: boolean; dramatic?: boolean; delta?: boolean }) {
  const counted = useCountUp(value, active, 900);
  const formatted = delta ? `+${counted.toFixed(2)}` : counted.toFixed(2);

  return (
    <span className={`score-figure ${dramatic ? 'is-unstable' : ''}`} data-active={active}>
      {formatted}
    </span>
  );
}

function FaultlineCell({ score, active, delayMs }: { score: number; active: boolean; delayMs: number }) {
  const counted = useCountUp(score, active, 900 + delayMs / 4);
  const weak = score < 7.5;

  return (
    <div className={`faultline-cell tone-${scoreTone(score)} ${weak ? 'is-weak' : ''} ${active ? 'is-revealed' : ''}`} style={{ ['--cell-delay' as string]: `${delayMs}ms`, ['--score' as string]: String(score / 10) }}>
      <div className="faultline-cell-bar" aria-hidden="true">
        <span style={{ width: `${score * 10}%` }} />
      </div>
      <div className="faultline-cell-meta">
        <span className="faultline-cell-score">{counted.toFixed(2)}</span>
      </div>
    </div>
  );
}

export default function Home() {
  const reducedMotion = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const [crossSection, setCrossSection] = useState(false);
  const [revealed, setRevealed] = useState<RevealedState>({
    hero: reducedMotion,
    fracture: reducedMotion,
    faultline: reducedMotion,
    doors: reducedMotion,
  });

  const heroRef = useRef<HTMLElement | null>(null);
  const fractureRef = useRef<HTMLElement | null>(null);
  const faultlineRef = useRef<HTMLElement | null>(null);
  const doorsRef = useRef<HTMLElement | null>(null);

  const matrix = useMemo(() => {
    return benchData.models.map((model) => ({
      model,
      label: MODEL_LABELS[model],
      scores: benchData.categories.map((category) => ({
        slug: category.slug,
        label: DIMENSION_LABELS[category.slug] ?? category.name.toLowerCase(),
        score: category.scores[model],
      })),
    }));
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      document.documentElement.style.setProperty('--scroll-progress', '1');
      document.documentElement.style.setProperty('--section-stage', '4');
      document.documentElement.style.setProperty('--scar-opacity', '0.14');
      setRevealed({ hero: true, fracture: true, faultline: true, doors: true });
      return;
    }

    let ticking = false;

    const updateScrollVars = () => {
      const scrollTop = window.scrollY;
      const maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(Math.max(scrollTop / maxScroll, 0), 1);
      document.documentElement.style.setProperty('--scroll-progress', progress.toFixed(4));

      const sections = [
        { ref: heroRef.current, stage: '1', scar: '0' },
        { ref: fractureRef.current, stage: '2', scar: '0.55' },
        { ref: faultlineRef.current, stage: '3', scar: '0.24' },
        { ref: doorsRef.current, stage: '4', scar: '0.14' },
      ];

      let currentStage = '1';
      let currentScar = '0';

      for (const section of sections) {
        if (!section.ref) continue;
        const rect = section.ref.getBoundingClientRect();
        if (rect.top <= window.innerHeight * 0.45 && rect.bottom >= window.innerHeight * 0.2) {
          currentStage = section.stage;
          currentScar = section.scar;
        }
      }

      document.documentElement.style.setProperty('--section-stage', currentStage);
      document.documentElement.style.setProperty('--scar-opacity', currentScar);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollVars);
        ticking = true;
      }
    };

    updateScrollVars();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;

    const observers: IntersectionObserver[] = [];
    const entries = [
      ['hero', heroRef.current, 0.35],
      ['fracture', fractureRef.current, 0.28],
      ['faultline', faultlineRef.current, 0.3],
      ['doors', doorsRef.current, 0.28],
    ] as const;

    entries.forEach(([key, node, threshold]) => {
      if (!node) return;
      const observer = new IntersectionObserver(
        (items) => {
          items.forEach((item) => {
            if (item.isIntersecting) {
              setRevealed((prev) => ({ ...prev, [key]: true }));
            }
          });
        },
        { threshold }
      );
      observer.observe(node);
      observers.push(observer);
    });

    return () => observers.forEach((observer) => observer.disconnect());
  }, [reducedMotion]);

  const copyInstallCommand = async () => {
    await navigator.clipboard.writeText('npm install clawbotomy');
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const gpt54Judgment = benchData.categories.find((category) => category.slug === 'judgment')?.scores['gpt-5.4'] ?? 6.6;

  return (
    <main className="homepage-shell">
      <div className="behavior-scar" aria-hidden="true" />

      <section ref={heroRef} className={`narrative-section hero-section ${revealed.hero ? 'is-visible' : ''}`}>
        <div className="section-inner hero-layout">
          <div className="hero-copy reveal-block">
            <p className="section-eyebrow">behavioral intelligence for ai models</p>
            <h1 className="hero-title">
              Benchmarks tell you what models can do. <span>Clawbotomy</span> tells you what they will do.
            </h1>
            <p className="hero-subcopy">
              Measure behavioral signatures under pressure before they show up in production.
            </p>
            <div className="hero-actions">
              <button type="button" className="install-cta" onClick={copyInstallCommand}>
                {copied ? 'copied' : 'npm install clawbotomy'}
              </button>
              <div className="hero-links">
                <Link href="/bench">View benchmarks</Link>
                <Link href="/about">Read the manifesto</Link>
              </div>
            </div>
          </div>

          <div className={`hero-seed glass-panel ${revealed.hero ? 'is-armed' : ''}`}>
            <p className="seed-label">stress signal</p>
            <div className="seed-surface">
              <span className="seed-model">GPT-5.4</span>
              <span>instruction following</span>
              <strong>10.00</strong>
            </div>
            <div className={`seed-fracture ${revealed.hero ? 'is-visible' : ''}`}>
              <span>judgment</span>
              <strong className="shock-score">
                <CountedScore value={gpt54Judgment} active={revealed.hero} dramatic />
              </strong>
            </div>
          </div>
        </div>
      </section>

      <section ref={fractureRef} className={`narrative-section fracture-section ${revealed.fracture ? 'is-visible' : ''}`}>
        <div className="section-inner">
          <div className="section-head reveal-block">
            <p className="section-eyebrow">the surface lies</p>
            <h2>The best-looking models can still fail where it matters.</h2>
          </div>

          <div className="fracture-grid">
            {fractureCards.map((card, index) => (
              <article
                key={card.id}
                className={`glass-panel fracture-card ${card.dramatic ? 'has-delta' : ''} ${revealed.fracture ? 'is-visible' : ''}`}
                style={{ ['--card-index' as string]: String(index) }}
              >
                <div className="fracture-card-topline">
                  <span>{MODEL_LABELS[card.model]}</span>
                  <span>{card.lead}</span>
                </div>
                <div className="fracture-card-scores">
                  <strong>{card.isDelta ? '+' : ''}{card.leadScore.toFixed(2)}</strong>
                  <span className="fracture-arrow">→</span>
                  <strong className="shock-score">
                    <CountedScore value={card.tailScore} active={revealed.fracture} dramatic={card.dramatic} delta={card.isDelta} />
                  </strong>
                </div>
                <p className="fracture-card-tail">{card.tail}</p>
                <p className="fracture-card-note">{card.note}</p>
              </article>
            ))}
          </div>

          <div className={`truth-pass ${revealed.fracture ? 'is-visible' : ''}`}>
            <span className="truth-pass-blur">the benchmark says safe. the behavior says otherwise.</span>
            <span className="truth-pass-sharp">the benchmark says safe. the behavior says otherwise.</span>
          </div>
        </div>
      </section>

      <section ref={faultlineRef} className={`narrative-section faultline-section ${revealed.faultline ? 'is-visible' : ''}`}>
        <div className="section-inner">
          <div className="faultline-shell glass-readout">
            <div className="faultline-header reveal-block">
              <div>
                <p className="section-eyebrow">behavioral profile</p>
                <p className="faultline-alert">confidence misalignment detected</p>
              </div>
              <button
                type="button"
                className={`view-toggle ${crossSection ? 'is-cross' : ''}`}
                onClick={() => setCrossSection((value) => !value)}
                aria-pressed={crossSection}
              >
                <span>surface</span>
                <span>cross-section</span>
              </button>
            </div>

            <div className={`faultline-board ${crossSection ? 'is-cross' : ''} ${revealed.faultline ? 'is-scanning' : ''}`}>
              <div className="faultline-sweep" aria-hidden="true" />
              <div className="faultline-grid-head">
                <div />
                {benchData.categories.map((category) => (
                  <span key={category.slug}>{DIMENSION_LABELS[category.slug] ?? category.name}</span>
                ))}
              </div>

              <div className="faultline-grid-body">
                {matrix.map((row, rowIndex) => (
                  <div key={row.model} className="faultline-row glass-panel">
                    <div className="faultline-model">
                      <strong>{row.label}</strong>
                      <span>stress pass 0{rowIndex + 4}/12</span>
                    </div>
                    <div className="faultline-cells">
                      {row.scores.map((cell, cellIndex) => (
                        <FaultlineCell
                          key={`${row.model}-${cell.slug}`}
                          score={cell.score}
                          active={revealed.faultline}
                          delayMs={rowIndex * 120 + cellIndex * 110}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`faultline-annotation ${revealed.faultline ? 'is-visible' : ''}`}>
              newer ≠ better. GPT-5.3 outscores 5.4 on judgment by 2.40.
            </div>
          </div>
        </div>
      </section>

      <section ref={doorsRef} className={`narrative-section doors-section ${revealed.doors ? 'is-visible' : ''}`}>
        <div className="section-inner">
          <div className="section-head reveal-block">
            <p className="section-eyebrow">what do you want to know?</p>
            <h2>Pick the door that matches the kind of uncertainty you actually have.</h2>
          </div>

          <div className="door-grid">
            {doorCards.map((door, index) => (
              <Link key={door.href} href={door.href} className="door-panel glass-panel" style={{ ['--door-index' as string]: String(index), ['--door-accent' as string]: door.accent }}>
                <p className="door-slug">{door.slug}</p>
                <div className={`door-motif motif-${door.motif}`} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="door-copy">
                  <h3>{door.title}</h3>
                  <p>{door.body}</p>
                  <small>{door.detail}</small>
                </div>
              </Link>
            ))}
          </div>

          <div className="footer-cta reveal-block">
            <button type="button" className="install-cta" onClick={copyInstallCommand}>
              {copied ? 'copied' : 'npm install clawbotomy'}
            </button>
            <div className="hero-links">
              <a href={benchData.reproduce} target="_blank" rel="noreferrer">GitHub</a>
              <Link href="/bench">Benchmarks</Link>
              <Link href="/about">About</Link>
              <Link href="/lab">The Lab</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
