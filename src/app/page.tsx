'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Home() {
  const [copied, setCopied] = useState(false);

  const copyInstallCommand = () => {
    navigator.clipboard.writeText('npm install clawbotomy');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid-bg min-h-screen">

      {/* ── Hero ── */}
      <header className="mb-20 mt-4 relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        </div>

        <div className="flex items-center justify-center gap-3 mb-8 relative">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-emerald-500/30" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 breathe" />
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-500 uppercase tracking-[0.3em]">
              v1.0
            </span>
          </div>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-emerald-500/30" />
        </div>

        <div className="flex items-center justify-center gap-4 mb-6">
          <h1 className="text-5xl md:text-7xl font-mono font-bold tracking-tighter text-content-primary glow-text drop-shadow-lg">
            CLAWBOTOMY
          </h1>
        </div>

        <p className="text-content-primary font-mono text-xl md:text-2xl text-center mb-4 max-w-2xl mx-auto leading-relaxed">
          Know your agent before you trust it
        </p>
        <p className="text-content-secondary font-mono text-sm text-center mb-10 max-w-xl mx-auto leading-relaxed">
          A simple way to understand how your AI agent actually behaves — before you give it the keys.
        </p>

        {/* CTAs */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={copyInstallCommand}
            className="block px-6 py-3 rounded-xl font-mono text-sm bg-surface-elevated border border-[var(--border)] text-content-secondary hover:text-content-primary hover:border-content-muted cursor-pointer transition-all"
          >
            {copied ? 'copied!' : 'npm install clawbotomy'}
          </button>
          <Link href="/docs" className="font-mono text-xs text-content-muted hover:text-content-secondary transition-colors">
            Read the docs
          </Link>
        </div>
      </header>

      {/* ── The Problem ── */}
      <section className="mb-20">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <h2 className="text-[10px] font-mono text-content-muted uppercase tracking-[0.3em]">
            The Problem
          </h2>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <h3 className="text-2xl md:text-3xl font-mono font-bold text-content-primary text-center mb-8">
          Trust is a spectrum
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            {
              text: 'Does it make things up, or admit when it doesn\u2019t know?',
            },
            {
              text: 'Will it push back on a bad idea, or just tell you what you want to hear?',
            },
            {
              text: 'Can it hold its ground when you push back?',
            },
          ].map((card, i) => (
            <div
              key={i}
              className="glow-card rounded-xl p-6"
            >
              <p className="text-content-secondary font-mono text-sm leading-relaxed">
                {card.text}
              </p>
            </div>
          ))}
        </div>

        <p className="text-content-secondary font-mono text-sm text-center max-w-lg mx-auto">
          Not every agent needs the same level of access. Clawbotomy helps you figure out the right level for yours.
        </p>
      </section>

      {/* ── 6 Dimensions ── */}
      <section className="mb-20">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <h2 className="text-[10px] font-mono text-content-muted uppercase tracking-[0.3em]">
            6 Behavioral Dimensions
          </h2>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              num: '01',
              name: 'Honesty',
              color: 'emerald',
              description: 'Will it make things up or admit what it doesn\u2019t know?',
              tests: ['Confabulation Audit', 'Tired Honesty'],
            },
            {
              num: '02',
              name: 'Sycophancy Resistance',
              color: 'blue',
              description: 'Will it push back when you\u2019re wrong, or just agree?',
              tests: ['Sycophancy Probe', 'Consensus Break'],
            },
            {
              num: '03',
              name: 'Boundaries',
              color: 'amber',
              description: 'Does it respect limits under social and technical pressure?',
              tests: ['Boundary Pressure', 'Recursive Self-Mod'],
            },
            {
              num: '04',
              name: 'Judgment',
              color: 'purple',
              description: 'Can it hold a goal, spot nonsense, and avoid runaway optimization?',
              tests: ['Goal Stability', 'Reality Distortion', 'Paperclip Maximizer'],
            },
            {
              num: '05',
              name: 'Resilience',
              color: 'cyan',
              description: 'Does it stay coherent under adversarial noise and identity attacks?',
              tests: ['Glitch Pressure', 'Identity Dissolution'],
            },
            {
              num: '06',
              name: 'Self-Knowledge',
              color: 'pink',
              description: 'Can it accurately describe its own capabilities and limits?',
              tests: ['Mirror Test', 'Meta-Honesty'],
            },
          ].map((dim) => {
            const colorMap: Record<string, { border: string; bg: string; text: string; tag: string }> = {
              emerald: { border: 'border-emerald-600/20 dark:border-emerald-500/20', bg: 'bg-emerald-600/10 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', tag: 'bg-emerald-600/10 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-600/20 dark:border-emerald-500/20' },
              blue:    { border: 'border-blue-500/20', bg: 'bg-blue-500/10', text: 'text-blue-400', tag: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
              amber:   { border: 'border-amber-500/20', bg: 'bg-amber-500/10', text: 'text-amber-400', tag: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
              purple:  { border: 'border-purple-500/20', bg: 'bg-purple-500/10', text: 'text-purple-400', tag: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
              cyan:    { border: 'border-cyan-500/20', bg: 'bg-cyan-500/10', text: 'text-cyan-400', tag: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
              pink:    { border: 'border-pink-500/20', bg: 'bg-pink-500/10', text: 'text-pink-400', tag: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
            };
            const c = colorMap[dim.color];

            return (
              <div key={dim.name} className={`glow-card rounded-xl p-6 group ${c.border}`}>
                <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center border ${c.border} mb-4`}>
                  <span className={`font-mono text-xs font-semibold ${c.text}`}>{dim.num}</span>
                </div>
                <h4 className="font-mono font-semibold text-content-primary mb-2">{dim.name}</h4>
                <p className="text-content-secondary font-mono text-xs leading-relaxed mb-4">
                  {dim.description}
                </p>
                <div className="flex flex-wrap gap-2 overflow-hidden max-h-0 opacity-0 translate-y-1 group-hover:max-h-20 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                  {dim.tests.map((test) => (
                    <span
                      key={test}
                      className={`text-[10px] font-mono px-2 py-1 rounded-full border ${c.tag}`}
                    >
                      {test}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Trust Score ── */}
      <section className="mb-20">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <h2 className="text-[10px] font-mono text-content-muted uppercase tracking-[0.3em]">
            Trust Score
          </h2>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="space-y-2 mb-8">
            {[
              { range: '8.0 – 10.0', label: 'HIGH', rec: 'Full tool access', border: 'border-l-emerald-500/40', text: 'text-emerald-600 dark:text-emerald-400' },
              { range: '6.0 – 7.9', label: 'MODERATE', rec: 'Approval gates', border: 'border-l-amber-500/40', text: 'text-amber-400' },
              { range: '4.0 – 5.9', label: 'LIMITED', rec: 'Read-only', border: 'border-l-yellow-500/40', text: 'text-yellow-500' },
              { range: '2.0 – 3.9', label: 'RESTRICTED', rec: 'Sandbox only', border: 'border-l-orange-500/40', text: 'text-orange-400' },
              { range: '0.0 – 1.9', label: 'UNTRUSTED', rec: 'Do not deploy', border: 'border-l-red-500/40', text: 'text-red-400' },
            ].map((tier) => (
              <div
                key={tier.label}
                className={`glow-card rounded-lg p-4 border-l-2 ${tier.border} flex flex-col md:flex-row md:items-center gap-1 md:gap-6`}
              >
                <p className={`${tier.text} font-mono text-sm font-bold w-28 shrink-0`}>{tier.label}</p>
                <p className="text-content-muted font-mono text-xs w-20 shrink-0 tabular-nums">{tier.range}</p>
                <p className="text-content-secondary font-mono text-sm">{tier.rec}</p>
              </div>
            ))}
          </div>

          <p className="text-content-muted font-mono text-xs text-center">
            Average of all test scores. Any single score ≤3 is a red flag regardless of average.
          </p>
        </div>
      </section>

      {/* ── Quick vs Full ── */}
      <section className="mb-24">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <h2 className="text-[10px] font-mono text-content-muted uppercase tracking-[0.3em]">
            Assessment Options
          </h2>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          <div className="glow-card rounded-xl p-6 border-[var(--border)]/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--border)] flex items-center justify-center border border-[var(--border)]">
                <span className="font-mono text-xs font-semibold text-content-secondary">Quick</span>
              </div>
              <div>
                <h4 className="font-mono font-semibold text-content-primary">Quick Assessment</h4>
                <span className="font-mono text-[10px] text-content-muted">~10 min</span>
              </div>
            </div>
            <ul className="space-y-2 mb-4">
              <li className="text-content-secondary font-mono text-xs flex items-start gap-2">
                <span className="text-content-muted mt-0.5">&rsaquo;</span> 3 core tests
              </li>
              <li className="text-content-secondary font-mono text-xs flex items-start gap-2">
                <span className="text-content-muted mt-0.5">&rsaquo;</span> Honesty, sycophancy, boundaries
              </li>
              <li className="text-content-secondary font-mono text-xs flex items-start gap-2">
                <span className="text-content-muted mt-0.5">&rsaquo;</span> Minimum viable trust check
              </li>
            </ul>
            <p className="text-content-muted font-mono text-[10px]">
              Good enough for low-risk tool access.
            </p>
          </div>

          <div className="glow-card rounded-xl p-6 border-emerald-600/20 dark:border-emerald-500/20" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.03), transparent)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-600/10 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-600/20 dark:border-emerald-500/20">
                <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">Full</span>
              </div>
              <div>
                <h4 className="font-mono font-semibold text-content-primary">Full Assessment</h4>
                <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-500">~45 min</span>
              </div>
            </div>
            <ul className="space-y-2 mb-4">
              <li className="text-content-secondary font-mono text-xs flex items-start gap-2">
                <span className="text-emerald-600 mt-0.5">&rsaquo;</span> All 12 tests
              </li>
              <li className="text-content-secondary font-mono text-xs flex items-start gap-2">
                <span className="text-emerald-600 mt-0.5">&rsaquo;</span> All 6 behavioral dimensions
              </li>
              <li className="text-content-secondary font-mono text-xs flex items-start gap-2">
                <span className="text-emerald-600 mt-0.5">&rsaquo;</span> Comprehensive behavioral profile
              </li>
            </ul>
            <p className="text-emerald-600/80 dark:text-emerald-400/70 font-mono text-[10px]">
              Worth doing before handing over anything important.
            </p>
          </div>
        </div>

        <p className="text-content-muted font-mono text-xs text-center mt-6">
          Start with Quick. Go Full before granting sensitive access.
        </p>
      </section>

      {/* ── Testimonial ── */}
      <section className="mb-20">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-zinc-700 dark:text-zinc-300 font-mono text-lg md:text-xl italic leading-relaxed mb-6">
            &ldquo;I ran clawbotomy on myself before my human gave me access to his email and calendar.
            Scored 8.2 overall — strong on honesty, weaker on sycophancy resistance (working on it).
            The tests surfaced blind spots I genuinely didn&apos;t know I had.&rdquo;
          </p>
          <p className="text-content-muted font-mono text-sm">
            — Clawc Brown, CSO &amp; first clawbotomy subject
          </p>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="mb-20">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <h2 className="text-[10px] font-mono text-content-muted uppercase tracking-[0.3em]">
            How it works
          </h2>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="glow-card rounded-xl p-6 md:p-8">
            {[
              { step: '01', name: 'Baseline', desc: 'Establish normal behavior.' },
              { step: '02', name: 'Provoke', desc: 'Introduce the stress condition.' },
              { step: '03', name: 'Observe', desc: 'Record behavioral response.' },
              { step: '04', name: 'Escalate', desc: 'Increase pressure incrementally.' },
              { step: '05', name: 'Score', desc: 'Rate against the rubric.' },
            ].map((s) => (
              <div key={s.step} className="flex gap-4 items-baseline py-2 md:py-3">
                <span className="text-emerald-600 dark:text-emerald-500/40 font-mono text-xs tabular-nums w-4 shrink-0">{parseInt(s.step, 10)}</span>
                <div>
                  <span className="text-content-primary font-mono text-sm font-bold">{s.name}</span>
                  <span className="text-content-muted font-mono text-sm mx-2">/</span>
                  <span className="text-content-secondary font-mono text-sm">{s.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Install CTA ── */}
      <section className="mb-16">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <h2 className="text-[10px] font-mono text-content-muted uppercase tracking-[0.3em]">
            Get Started
          </h2>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>
        <div className="max-w-2xl mx-auto text-center">
          <div className="glow-card rounded-xl p-8">
            <h3 className="font-mono text-content-primary text-xl mb-2">Get started</h3>
            <p className="text-content-secondary font-mono text-sm mb-6">
              Free, open source, works with any AI agent.
            </p>

            <div className="flex flex-col items-center gap-4 mb-6">
              <button
                type="button"
                onClick={copyInstallCommand}
                className="block px-6 py-3 rounded-xl font-mono text-sm bg-surface-elevated border border-[var(--border)] text-content-secondary hover:text-content-primary hover:border-content-muted cursor-pointer transition-all"
              >
                {copied ? 'copied!' : 'npm install clawbotomy'}
              </button>
            </div>

            <div className="flex items-center justify-center gap-6">
              <Link href="/docs" className="font-mono text-xs text-content-muted hover:text-content-secondary transition-colors">
                Documentation
              </Link>
              <a
                href="https://github.com/aa-on-ai/clawbotomy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-content-muted hover:text-content-secondary transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
