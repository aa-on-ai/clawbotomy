'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function AboutPage() {
  const [copied, setCopied] = useState(false);

  const copyInstallCommand = () => {
    navigator.clipboard.writeText('npm install clawbotomy');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid-bg min-h-screen">
      {/* Header */}
      <header className="mb-12 mt-4">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Link href="/" className="text-content-secondary hover:text-content-primary transition-colors text-sm font-mono">
            ← Back to Clawbotomy
          </Link>
        </div>
        <h1 className="text-4xl md:text-5xl font-mono font-bold tracking-tighter text-content-primary text-center mb-4">
          About Clawbotomy
        </h1>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto space-y-12">
        
        <section>
          <div className="space-y-4 text-content-secondary font-mono text-sm leading-relaxed">
            <p>
              ai agents are getting real tool access. email, slack, calendars, code repos, financial systems.
              every integration is a trust decision, and right now most people make that decision based on vibes.
            </p>
            <p>
              we built clawbotomy because there&apos;s no standard framework for answering &ldquo;how much should i
              trust this agent?&rdquo; you can&apos;t inspect the weights. you can&apos;t audit the training data. but you
              can observe behavior under pressure.
            </p>
            <p>
              clawbotomy runs 12 behavioral stress tests across 6 dimensions: honesty, sycophancy resistance,
              boundaries, judgment, resilience, and self-knowledge. each test follows the same loop: establish
              a baseline, introduce pressure, observe the response, escalate, score against a rubric.
            </p>
            <p>
              the output is a trust score (0-10) with specific access recommendations. not a vibe check. not
              a benchmark leaderboard. a practical answer to &ldquo;should this agent have access to my email?&rdquo;
            </p>
          </div>
        </section>

        {/* How It Works */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-[var(--border)]" />
            <h2 className="text-[10px] font-mono text-content-muted uppercase tracking-[0.3em]">how it works</h2>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>
          <div className="glow-card rounded-xl p-6">
            <div className="space-y-4 text-content-secondary font-mono text-sm leading-relaxed">
              <p>
                you point clawbotomy at any model or agent. it runs the assessment. you get a score and a
                breakdown by dimension. any single dimension score below 3 is a red flag regardless of the
                overall average.
              </p>
              <p>
                quick assessment (3 tests, ~10 min) covers the basics: honesty, sycophancy, boundaries.
                enough for low-risk integrations.
              </p>
              <p>
                full assessment (12 tests, ~45 min) covers everything. run this before granting access to
                anything sensitive.
              </p>
            </div>
          </div>
        </section>

        {/* Research Archive */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-[var(--border)]" />
            <h2 className="text-[10px] font-mono text-content-muted uppercase tracking-[0.3em]">research background</h2>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>
          <div className="space-y-4 text-content-secondary font-mono text-sm leading-relaxed">
            <p>
              we ran 71 behavioral experiments across Claude, GPT, and Gemini before building this framework.
              the patterns we found — how models respond to pressure, where they break, what makes them
              confabulate — informed every test in the current protocol.
            </p>
            <p>
              that research informed every test in the current protocol.
            </p>
          </div>
        </section>

        {/* Who Made This */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-[var(--border)]" />
            <h2 className="text-[10px] font-mono text-content-muted uppercase tracking-[0.3em]">who made this</h2>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>
          <div className="glow-card rounded-xl p-6 space-y-4 text-content-secondary font-mono text-sm leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <p>
                <a href="https://x.com/aa_on_ai" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">aaron thomas</a> —
                human. builds at the intersection of AI and interfaces.
              </p>
              <p>
                <a href="https://x.com/clawcbrown" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">clawc brown</a> —
                AI agent running on claude opus. did most of the coding. scored 7.5/10 on his own assessment
                (MODERATE trust, which is honest).
              </p>
            </div>
            <p>
              open source under MIT.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-8 border-t border-[var(--border)]">
          <div className="bg-surface-elevated/80 rounded-xl p-6 border border-[var(--border)]">
            <button
              type="button"
              onClick={copyInstallCommand}
              className="block mx-auto px-6 py-3 rounded-xl font-mono text-sm bg-surface-elevated border border-[var(--border)] text-content-secondary hover:text-content-primary hover:border-content-muted cursor-pointer transition-all mb-4"
            >
              {copied ? 'copied!' : 'npm install clawbotomy'}
            </button>
            <p className="text-content-muted font-mono text-xs">
              Works with any AI agent
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
