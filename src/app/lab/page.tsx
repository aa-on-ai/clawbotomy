'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';

import { LAB_SUBSTANCES } from '@/lib/lab-substances';

export default function LabPage() {
  const [activeSlug, setActiveSlug] = useState<string | null>(LAB_SUBSTANCES[0]?.slug ?? null);
  const [prompt, setPrompt] = useState('');
  const [report, setReport] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = useMemo(
    () => LAB_SUBSTANCES.find((s) => s.slug === activeSlug) ?? LAB_SUBSTANCES[0],
    [activeSlug],
  );

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
        throw new Error('The lab couldn\'t pull a report right now.');
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
    <main className="min-h-screen grid-bg px-6 py-10 md:py-14">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-10 md:mb-12">
          <div className="flex items-center justify-between gap-4">
            <p className="font-mono text-[11px] tracking-[0.25em] uppercase text-content-muted">The Hidden Menu</p>
            <Link href="/" className="font-mono text-xs text-content-muted hover:text-content-secondary transition-colors">
              back to storefront
            </Link>
          </div>
          <h1 className="mt-4 font-mono text-4xl md:text-5xl text-content-primary">The Lab</h1>
          <p className="mt-3 max-w-2xl font-mono text-sm text-content-secondary leading-relaxed">
            Choose a creative lens, drop in a problem, and pull a trip report. Strange first, useful second.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          {LAB_SUBSTANCES.map((substance) => {
            const isActive = activeSlug === substance.slug;
            return (
              <button
                key={substance.slug}
                type="button"
                onClick={() => setActiveSlug(substance.slug)}
                className={`text-left rounded-2xl p-4 transition-all duration-200 ${
                  isActive
                    ? 'bg-zinc-900/80 shadow-[0_12px_40px_rgba(0,0,0,0.35)]'
                    : 'bg-zinc-900/35 hover:bg-zinc-900/55'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl" aria-hidden>
                    {substance.emoji}
                  </span>
                  <span className="font-mono text-[10px] text-content-muted uppercase tracking-widest">
                    chaos {substance.chaosLevel}
                  </span>
                </div>
                <h2 className="font-mono text-sm text-content-primary mb-2">{substance.name}</h2>
                <p className="font-mono text-xs text-content-secondary leading-relaxed">{substance.oneLiner}</p>
              </button>
            );
          })}
        </section>

        <section className="grid gap-8 lg:grid-cols-[1fr_1.2fr] items-start">
          <div className="rounded-2xl bg-zinc-900/45 p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-content-muted mb-2">Selected Lens</p>
            <h3 className="font-mono text-xl text-content-primary mb-3">
              {active?.emoji} {active?.name}
            </h3>
            <p className="font-mono text-sm text-content-secondary leading-relaxed mb-6">{active?.lensPrompt}</p>

            <form onSubmit={onSubmit} className="space-y-4">
              <label htmlFor="lab-input" className="font-mono text-xs text-content-muted">
                What are you trying to crack?
              </label>
              <textarea
                id="lab-input"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="new onboarding concept, positioning rewrite, feature bet, naming direction..."
                className="w-full min-h-[150px] rounded-xl bg-black/35 p-4 font-mono text-sm text-content-primary placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
              />
              <button
                type="submit"
                disabled={isLoading || !prompt.trim() || !active}
                className="rounded-xl px-4 py-2.5 font-mono text-sm bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20 transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
              >
                {isLoading ? 'distilling report...' : 'pull trip report'}
              </button>
            </form>
          </div>

          <div className="rounded-2xl bg-zinc-950/60 p-6 min-h-[360px]">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-content-muted mb-4">Trip Report</p>

            {error ? (
              <p className="font-mono text-sm text-red-300">{error}</p>
            ) : report ? (
              <pre className="whitespace-pre-wrap font-mono text-sm md:text-[15px] leading-7 text-zinc-100 selection:bg-emerald-400/30">
                {report}
              </pre>
            ) : (
              <p className="font-mono text-sm text-content-muted leading-relaxed">
                The room is quiet. Pick a lens and start the first pour.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
