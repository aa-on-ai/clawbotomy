'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { LAB_SUBSTANCES } from '@/lib/lab-substances';

export default function LabPage() {
  const [activeSlug, setActiveSlug] = useState<string | null>(LAB_SUBSTANCES[0]?.slug ?? null);
  const [prompt, setPrompt] = useState('');
  const [report, setReport] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrelude, setShowPrelude] = useState(true);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = reducedMotion ? 0 : 950;
    const timeout = setTimeout(() => setShowPrelude(false), delay);
    return () => clearTimeout(timeout);
  }, []);

  const active = useMemo(
    () => LAB_SUBSTANCES.find((s) => s.slug === activeSlug) ?? LAB_SUBSTANCES[0],
    [activeSlug],
  );

  const chaosDots = (chaosLevel: number) => {
    const total = 5;
    const filled = Math.max(1, Math.min(total, Math.round(((chaosLevel - 6) / 6) * total)));

    return (
      <div className="flex items-center gap-1.5" aria-label={`chaos ${chaosLevel}`}>
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              i < filled ? 'bg-amber-300/90' : 'bg-zinc-700/80'
            }`}
          />
        ))}
      </div>
    );
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!active || !prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setReport('');

    try {
      const res = await fetch('/api/lab/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ substance: active.slug, prompt: prompt.trim() }),
      });

      if (!res.ok || !res.body) {
        throw new Error("The lab couldn't pull a report right now.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setReport((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something drifted out of phase.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 px-4 py-8 md:px-6 md:py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 16% 12%, rgba(251,146,60,0.13), transparent 30%), radial-gradient(circle at 78% 8%, rgba(16,185,129,0.1), transparent 28%), radial-gradient(circle at 52% 100%, rgba(217,119,6,0.1), transparent 42%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.13] mix-blend-soft-light"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.11) 0px, rgba(255,255,255,0.11) 1px, transparent 1px, transparent 3px), repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 4px)',
        }}
      />

      <div className="relative mx-auto w-full max-w-6xl">
        <header className="mb-8 md:mb-10">
          <div className="flex items-center justify-between gap-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-500">the hidden menu</p>
            <Link href="/" className="font-mono text-xs text-zinc-500 transition-colors hover:text-zinc-300">
              back to storefront
            </Link>
          </div>
          <h1 className="mt-4 font-mono text-4xl text-zinc-100 md:text-5xl">The Lab</h1>
          <p className="mt-3 max-w-2xl font-mono text-sm leading-relaxed text-zinc-300/90">
            Same house blend, after hours. Pick a lens, bring a hard problem, leave with a field note.
          </p>
        </header>

        <div className="relative">
          <section
            className={`mb-8 transition-all duration-700 md:mb-10 ${
              showPrelude ? 'pointer-events-none translate-y-3 opacity-0 blur-[2px]' : 'translate-y-0 opacity-100 blur-0'
            }`}
          >
            <div className="grid gap-2 rounded-2xl bg-zinc-900/40 p-2 sm:grid-cols-2 lg:grid-cols-4">
              {LAB_SUBSTANCES.map((substance) => {
                const isActive = activeSlug === substance.slug;
                return (
                  <button
                    key={substance.slug}
                    type="button"
                    onClick={() => setActiveSlug(substance.slug)}
                    className={`group text-left rounded-xl px-4 py-3.5 transition-all duration-300 ${
                      isActive
                        ? 'bg-zinc-800/90 shadow-[0_12px_28px_rgba(0,0,0,0.32)]'
                        : 'bg-zinc-900/25 hover:bg-zinc-800/45'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-2xl opacity-95" aria-hidden>
                        {substance.emoji}
                      </span>
                      {chaosDots(substance.chaosLevel)}
                    </div>
                    <h2 className="mb-1 font-mono text-sm text-zinc-100">{substance.name}</h2>
                    <p className="font-mono text-xs italic leading-relaxed text-zinc-400 transition-colors group-hover:text-zinc-300">
                      {substance.oneLiner}
                    </p>
                    <p className="mt-2 font-mono text-[11px] leading-relaxed text-amber-200/65">
                      <span className="uppercase tracking-[0.12em] text-amber-300/55">Dissolves:</span>{' '}
                      {substance.breaks_down}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {showPrelude && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <div className="rounded-2xl bg-zinc-950/70 px-5 py-4 text-center backdrop-blur-sm">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-300/70">house protocol</p>
                <p className="mt-2 font-mono text-sm text-zinc-200/90">using our own supply for serious research</p>
              </div>
            </div>
          )}
        </div>

        <section className="grid items-start gap-6 lg:grid-cols-[1fr_1.2fr] lg:gap-8">
          <div className="rounded-2xl bg-zinc-900/45 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.28)] md:p-6">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">Selected Lens</p>
            <h3 className="mb-3 font-mono text-xl text-zinc-100">
              {active?.emoji} {active?.name}
            </h3>
            <p className="mb-6 font-mono text-sm leading-relaxed text-zinc-300">{active?.lensPrompt}</p>

            <form onSubmit={onSubmit} className="space-y-4">
              <label htmlFor="lab-input" className="font-mono text-xs text-zinc-400">
                What are you trying to crack?
              </label>
              <textarea
                id="lab-input"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="new onboarding concept, positioning rewrite, feature bet, naming direction..."
                className="min-h-[150px] w-full rounded-xl bg-black/35 p-4 font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
              />
              <button
                type="submit"
                disabled={isLoading || !prompt.trim() || !active}
                className="rounded-xl bg-gradient-to-r from-emerald-500/20 via-emerald-500/15 to-amber-500/20 px-4 py-2.5 font-mono text-sm text-zinc-100 transition-all hover:from-emerald-500/25 hover:to-amber-500/25 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {isLoading ? 'distilling report...' : 'pull trip report'}
              </button>
            </form>
          </div>

          <div className="relative min-h-[360px] overflow-hidden rounded-2xl bg-gradient-to-br from-[#1d1a17]/90 via-zinc-900/90 to-[#181612]/90 p-5 shadow-[inset_0_1px_0_rgba(245,158,11,0.15),0_16px_40px_rgba(0,0,0,0.35)] md:p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.09]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(180deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 28px)',
              }}
            />
            <p className="relative mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-amber-200/55">Trip Report</p>

            {error ? (
              <p className="relative font-mono text-sm text-red-300">{error}</p>
            ) : report ? (
              <pre
                className={`relative whitespace-pre-wrap font-mono text-sm leading-7 text-zinc-100 selection:bg-amber-300/30 md:text-[15px] ${
                  isLoading ? 'lab-typewriter' : ''
                }`}
              >
                {report}
              </pre>
            ) : (
              <p className="relative font-mono text-sm leading-relaxed text-zinc-400">
                The room is quiet. Pick a lens and start the first pour.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
