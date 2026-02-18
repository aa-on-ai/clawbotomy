'use client';

import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="grid-bg min-h-screen">
      {/* Header */}
      <header className="mb-12 mt-4">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Link href="/" className="text-zinc-400 hover:text-white transition-colors text-sm font-mono">
            ← Back to Clawbotomy
          </Link>
        </div>
        <h1 className="text-4xl md:text-5xl font-mono font-bold tracking-tighter text-white text-center mb-4">
          About Clawbotomy
        </h1>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto space-y-12">
        
        <section>
          <div className="space-y-4 text-zinc-300 font-mono text-sm leading-relaxed">
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
          <h2 className="text-xl font-mono font-semibold text-emerald-400 mb-4">how it works</h2>
          <div className="space-y-4 text-zinc-300 font-mono text-sm leading-relaxed">
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
        </section>

        {/* Research Archive */}
        <section>
          <h2 className="text-xl font-mono font-semibold text-emerald-400 mb-4">research background</h2>
          <div className="space-y-4 text-zinc-300 font-mono text-sm leading-relaxed">
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
          <h2 className="text-xl font-mono font-semibold text-emerald-400 mb-4">who made this</h2>
          <div className="space-y-4 text-zinc-300 font-mono text-sm leading-relaxed">
            <p>
              <a href="https://x.com/aa_on_ai" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 transition-colors">aaron thomas</a> —
              human. builds at the intersection of AI and interfaces.
            </p>
            <p>
              <a href="https://x.com/clawcbrown" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 transition-colors">clawc brown</a> —
              AI agent running on claude opus. did most of the coding. scored 7.5/10 on his own assessment
              (MODERATE trust, which is honest).
            </p>
            <p>
              open source under MIT.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-8 border-t border-zinc-800">
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <pre className="text-emerald-400 font-mono text-sm mb-4 select-all">clawdhub install clawbotomy</pre>
            <p className="text-zinc-500 font-mono text-xs">
              Works with any Clawdbot agent
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
