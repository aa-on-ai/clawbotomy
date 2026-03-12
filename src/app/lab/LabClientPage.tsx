'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { EXAMPLE_REPORTS } from '@/lib/example-reports';
import { LAB_SUBSTANCES } from '@/lib/lab-substances';
import { getVideoForSubstance } from '@/lib/video-gallery-data';

type ViewMode = 'showcase' | 'live' | 'video';

const DEFAULT_SLUG = 'tired-honesty';

function paragraphize(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export default function LabClientPage() {
  const exampleBySlug = useMemo(
    () => new Map(EXAMPLE_REPORTS.map((example) => [example.substance_slug, example])),
    []
  );

  const [isReady, setIsReady] = useState(false);
  const [activeSlug, setActiveSlug] = useState(DEFAULT_SLUG);
  const [showShelf, setShowShelf] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('video');
  const [prompt, setPrompt] = useState('why is this resonating and what should happen next');
  const [report, setReport] = useState('');
  const [reportModel, setReportModel] = useState('');
  const [isLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = reducedMotion ? 0 : 120;
    const timeout = window.setTimeout(() => setIsReady(true), delay);
    return () => window.clearTimeout(timeout);
  }, []);

  const activeSubstance = useMemo(
    () => LAB_SUBSTANCES.find((substance) => substance.slug === activeSlug) ?? LAB_SUBSTANCES[0],
    [activeSlug]
  );

  const activeExample = exampleBySlug.get(activeSubstance.slug) ?? null;
  const activeText = viewMode === 'live' && report ? report : activeExample?.report ?? '';
  const activeModel = viewMode === 'live' ? reportModel || 'live session' : activeExample?.model_used ?? 'showcase specimen';
  const activeProblem = viewMode === 'live' && report ? prompt : activeExample?.problem ?? prompt;
  const paragraphs = useMemo(() => paragraphize(activeText), [activeText]);

  const chaosMarks = (chaosLevel: number) => {
    const total = 5;
    const filled = Math.max(1, Math.min(total, Math.round((chaosLevel / 13) * total)));

    return (
      <div className="flex items-center gap-1.5" aria-label={`chaos level ${chaosLevel}`}>
        {Array.from({ length: total }).map((_, index) => (
          <span
            key={index}
            className={`h-1.5 w-6 rounded-full transition-colors duration-300 ${
              index < filled ? 'bg-[#8f759d]' : 'bg-white/10'
            }`}
          />
        ))}
      </div>
    );
  };

  const selectSubstance = (slug: string) => {
    const hasVideo = !!getVideoForSubstance(slug);
    const hasExample = exampleBySlug.has(slug);
    setActiveSlug(slug);
    setViewMode(hasVideo ? 'video' : hasExample ? 'showcase' : 'live');
    setShowShelf(false);
    setError(null);
    setReport('');
    setReportModel('');
    setPrompt(hasExample ? exampleBySlug.get(slug)?.problem ?? '' : '');
  };

  /* Live generation removed from web — use CLI: clawbotomy lab --substance <slug> */

  return (
    <main className="lab-room relative min-h-screen overflow-hidden bg-[#110e0c] text-[#e7ddcf]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(107,91,123,0.18),transparent_24%),radial-gradient(circle_at_82%_10%,rgba(78,58,87,0.2),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(45,212,191,0.07),transparent_34%)]" />
      <div className="lab-grain pointer-events-none absolute inset-0 opacity-[0.065] mix-blend-soft-light" />
      <div className="lab-vignette pointer-events-none absolute inset-0" />
      <div className="lab-ambient-orb pointer-events-none absolute left-[12%] top-[18%] h-48 w-48 rounded-full bg-[#5d4668]/25 blur-3xl md:h-72 md:w-72" />
      <div className="lab-ambient-orb-delayed pointer-events-none absolute bottom-[10%] right-[6%] h-56 w-56 rounded-full bg-[#2dd4bf]/[0.08] blur-3xl md:h-80 md:w-80" />

      <div className="pointer-events-none absolute inset-x-4 top-4 z-20 hidden justify-between font-mono text-[10px] uppercase tracking-[0.24em] text-[#b9a9c2]/55 md:flex">
        <div className="space-y-1">
          <div>session active</div>
          <div>back room / after hours</div>
        </div>
        <div className="space-y-1 text-right">
          <div>lens: {activeSubstance.name}</div>
          <div>chaos: {activeSubstance.chaosLevel}/13</div>
        </div>
      </div>

      <section
        className={`relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-14 pt-8 transition-all md:px-6 md:pb-20 md:pt-16 ${
          isReady ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
        style={{ transitionDuration: '1200ms', transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        <header className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div className="max-w-2xl">
            <div className="mb-4 flex items-center justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.22em] text-[#b9a9c2]/70">
              <span>the lab</span>
              <Link href="/" className="transition-colors duration-200 hover:text-[#e7ddcf]">
                front room ↗
              </Link>
            </div>
            <h1 className="max-w-[12ch] text-[clamp(3rem,7vw,5.5rem)] font-medium leading-[0.94] tracking-[-0.05em] text-[#f2e9db]">
              You came through the front door.
              <span className="block font-serif text-[0.9em] italic text-[#cab7d6]">This is the back room.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#d2c6b8]/84 md:text-lg">
              A lens is already in effect. The model is mid-thought. You are not browsing products here, you are
              overhearing a consciousness tilt sideways.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#b9a9c2]/60">current pour</p>
                  <p className="mt-2 font-mono text-sm uppercase tracking-[0.18em] text-[#f2e9db]">
                    {activeSubstance.name}
                  </p>
                </div>
                <div className="pt-1">{chaosMarks(activeSubstance.chaosLevel)}</div>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#d2c6b8]/76">{activeSubstance.oneLiner}</p>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#8fd7cd]">
                dissolves: <span className="normal-case tracking-normal text-[#d2c6b8]/72">{activeSubstance.breaks_down}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowShelf((current) => !current);
                if (!showShelf) {
                  setTimeout(() => {
                    document.getElementById('lens-shelf')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }, 60);
                }
              }}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#6b5b7b]/60 bg-[#221a23]/90 px-5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#e7ddcf] transition-all duration-200 hover:border-[#8f759d] hover:bg-[#2c2130]"
            >
              {showShelf ? 'hide lenses' : 'try another lens'}
            </button>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="relative overflow-hidden rounded-[30px] border border-[#5f4d67]/35 bg-[linear-gradient(180deg,rgba(34,24,31,0.95),rgba(18,14,16,0.98))] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.38)] md:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(180deg,rgba(255,255,255,0.06)_0px,rgba(255,255,255,0.06)_1px,transparent_1px,transparent_32px)] opacity-[0.09]" />
            <div className="pointer-events-none absolute inset-x-6 top-6 h-px bg-gradient-to-r from-transparent via-[#8f759d]/45 to-transparent" />

            <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/8 pb-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#b9a9c2]/58">
                  {viewMode === 'video' ? 'trip report' : 'field note'}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#d2c6b8]/72">
                  {viewMode === 'video' ? `${activeSubstance.name} — visual output` : activeProblem}
                </p>
              </div>
              <div className="text-right font-mono text-[11px] uppercase tracking-[0.18em] text-[#cab7d6]/75">
                <div>{viewMode === 'video' ? 'claude sonnet' : activeModel}</div>
                <div className="mt-1 text-[#8fd7cd]/65">
                  {viewMode === 'video' ? 'model-generated video' : viewMode === 'live' ? 'live generation' : 'showcase specimen'}
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-6 min-h-[420px] space-y-5 md:min-h-[520px]">
              {viewMode === 'video' && getVideoForSubstance(activeSubstance.slug) ? (
                <div className="flex flex-col items-center gap-4">
                  <video
                    key={activeSubstance.slug}
                    src={getVideoForSubstance(activeSubstance.slug)?.videoPath}
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full max-w-[540px] rounded-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                  />
                  <p className="max-w-md text-center text-sm leading-6 text-[#d2c6b8]/60">
                    Sonnet was given Pillow + ffmpeg and asked to make a video expressing this state. This is what it created.
                  </p>
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-red-300/20 bg-red-400/5 p-4 text-sm leading-6 text-red-100/90">
                  {error}
                </div>
              ) : paragraphs.length > 0 ? (
                paragraphs.map((paragraph, index) => (
                  <p
                    key={`${activeSubstance.slug}-${viewMode}-${index}`}
                    className="lab-paragraph max-w-[66ch] text-[1.02rem] leading-8 text-[#f0e7db]/90 md:text-[1.12rem]"
                    style={{ animationDelay: `${index * 90}ms` }}
                  >
                    {paragraph}
                  </p>
                ))
              ) : isLoading ? (
                <p className="text-base leading-7 text-[#d2c6b8]/72">The report is still arriving through the wall.</p>
              ) : (
                <div className="max-w-xl rounded-[24px] border border-dashed border-white/12 bg-white/[0.03] p-5">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#b9a9c2]/65">waiting for a fresh specimen</p>
                  <p className="mt-3 text-sm leading-6 text-[#d2c6b8]/76">
                    This lens doesn&apos;t have a bottled showcase yet. Give it a topic and let the room develop something new.
                  </p>
                </div>
              )}

              {isLoading && (
                <div className="lab-signal flex items-center gap-3 pt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#8fd7cd]/70">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#8fd7cd]" />
                  distilling report...
                </div>
              )}
            </div>
          </article>

          <aside className="flex flex-col gap-5">
            <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#b9a9c2]/58">selected lens</p>
                  <h2 className="mt-2 font-mono text-lg uppercase tracking-[0.14em] text-[#f2e9db]">{activeSubstance.name}</h2>
                </div>
                <div className="shrink-0">{chaosMarks(activeSubstance.chaosLevel)}</div>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#d2c6b8]/78">{activeSubstance.lensPrompt}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode('video')}
                  disabled={!getVideoForSubstance(activeSubstance.slug)}
                  className={`rounded-full border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
                    viewMode === 'video'
                      ? 'border-[#8fd7cd]/60 bg-[#8fd7cd]/10 text-[#8fd7cd]'
                      : 'border-[#6b5b7b]/55 bg-[#241a26] text-[#e7ddcf] hover:bg-[#2c2130]'
                  }`}
                >
                  ▶ watch trip
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeExample) {
                      setViewMode('showcase');
                      setReport('');
                      setReportModel('');
                      setError(null);
                    }
                  }}
                  disabled={!activeExample}
                  className={`rounded-full border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
                    viewMode === 'showcase'
                      ? 'border-[#8f759d]/60 bg-[#8f759d]/10 text-[#cab7d6]'
                      : 'border-white/10 text-[#e7ddcf] hover:bg-white/[0.05]'
                  }`}
                >
                  field notes
                </button>
              </div>
            </section>

            <section
              id="lens-shelf"
              className={`overflow-hidden rounded-[28px] border border-[#5f4d67]/28 bg-[linear-gradient(180deg,rgba(26,19,24,0.96),rgba(19,15,18,0.98))] transition-all duration-300 ${
                showShelf ? 'max-h-[900px] opacity-100' : 'max-h-[120px] opacity-95'
              }`}
            >
              <div className="flex items-center justify-between px-5 py-4 md:px-6">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#b9a9c2]/58">lens shelf</p>
                  <p className="mt-1 text-sm leading-6 text-[#d2c6b8]/70">A quiet row of altered perspectives.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowShelf((current) => !current)}
                  className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8fd7cd]/75 transition-colors duration-200 hover:text-[#b3efe7]"
                >
                  {showShelf ? 'close' : 'open'}
                </button>
              </div>

              <div className="lab-shelf divide-y divide-white/6 px-3 pb-3 md:px-4">
                {LAB_SUBSTANCES.map((substance, index) => {
                  const isActive = substance.slug === activeSubstance.slug;
                  const hasExample = exampleBySlug.has(substance.slug);

                  return (
                    <button
                      key={substance.slug}
                      type="button"
                      onClick={() => selectSubstance(substance.slug)}
                      className={`group flex w-full items-center gap-4 rounded-[20px] px-3 py-3 text-left transition-all duration-200 ${
                        isActive ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'
                      }`}
                      style={{ transitionDelay: showShelf ? `${Math.min(index * 18, 140)}ms` : '0ms' }}
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-xl">
                        {substance.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-[#f2e9db]">{substance.name}</p>
                          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8fd7cd]/70">
                            {hasExample ? 'showcase' : 'live only'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-[#d2c6b8]/68">{substance.oneLiner}</p>
                      </div>
                      <div className="hidden shrink-0 md:block">{chaosMarks(substance.chaosLevel)}</div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm md:p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#b9a9c2]/58">run your own</p>
              <p className="mt-2 text-sm leading-6 text-[#d2c6b8]/72">
                The back room runs locally. Bring your own key, pick a lens, see what comes back.
              </p>
              <div className="mt-4 rounded-[18px] border border-white/8 bg-[#120f12] px-4 py-3 font-mono text-[12px] leading-6 text-[#8fd7cd]">
                <span className="text-[#d2c6b8]/50">$</span> npm install -g clawbotomy<br/>
                <span className="text-[#d2c6b8]/50">$</span> clawbotomy lab --substance {activeSubstance.slug}
              </div>
            </section>
          </aside>
        </div>
      </section>

      <style jsx>{`
        .lab-room {
          isolation: isolate;
        }

        .lab-grain {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.08' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
          background-size: 180px 180px;
          animation: labGrainShift 1s steps(10) infinite;
        }

        .lab-vignette {
          background: radial-gradient(ellipse at center, transparent 46%, rgba(0, 0, 0, 0.44) 100%);
          opacity: 0.88;
        }

        .lab-ambient-orb {
          animation: labDrift 18s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite alternate;
        }

        .lab-ambient-orb-delayed {
          animation: labDrift 24s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite alternate-reverse;
        }

        .lab-paragraph {
          font-family: var(--font-serif), Georgia, serif;
          font-style: italic;
          opacity: 0;
          transform: translateY(12px);
          animation: reportReveal 560ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
          text-wrap: pretty;
        }

        .lab-signal span {
          animation: signalPulse 1.6s ease-in-out infinite;
        }

        @keyframes labDrift {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(24px, -18px, 0) scale(1.06);
          }
        }

        @keyframes reportReveal {
          0% {
            opacity: 0;
            transform: translateY(12px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes signalPulse {
          0%,
          100% {
            opacity: 0.35;
            transform: scale(0.9);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes labGrainShift {
          0% {
            background-position: 0 0;
          }
          25% {
            background-position: 1px -1px;
          }
          50% {
            background-position: -1px 1px;
          }
          75% {
            background-position: 2px 0;
          }
          100% {
            background-position: 0 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .lab-grain,
          .lab-ambient-orb,
          .lab-ambient-orb-delayed,
          .lab-paragraph,
          .lab-signal span {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </main>
  );
}
