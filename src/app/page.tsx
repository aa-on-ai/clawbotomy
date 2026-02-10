import Link from 'next/link';

export default function Home() {
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
            <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-[0.3em]">
              QA Protocol Active
            </span>
          </div>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-emerald-500/30" />
        </div>

        <div className="flex items-center justify-center gap-4 mb-6">
          <h1 className="text-5xl md:text-7xl font-mono font-bold tracking-tighter text-white glow-text drop-shadow-lg">
            CLAWBOTOMY
          </h1>
        </div>

        <p className="text-zinc-100 font-mono text-xl md:text-2xl text-center mb-4 max-w-2xl mx-auto leading-relaxed">
          Know your agent before you trust it
        </p>
        <p className="text-zinc-400 font-mono text-sm text-center mb-10 max-w-xl mx-auto leading-relaxed">
          12 behavioral stress tests. A trust score. Run it before you hand over your email, Slack, or calendar.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="relative group">
            <code className="block px-6 py-3 rounded-xl font-mono text-sm bg-zinc-900 border border-emerald-500/30 text-emerald-400 select-all cursor-pointer">
              clawdhub install clawbotomy
            </code>
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">
              click to select
            </span>
          </div>
          <Link
            href="/skill.md"
            className="px-6 py-3 rounded-xl font-mono text-sm border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 hover:bg-zinc-800/50 transition-all"
          >
            Read the skill →
          </Link>
        </div>
      </header>

      {/* ── The Problem ── */}
      <section className="mb-20">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-zinc-800" />
          <h2 className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em]">
            The Problem
          </h2>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        <h3 className="text-2xl md:text-3xl font-mono font-bold text-white text-center mb-8">
          You&apos;re giving your agent real access
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            {
              icon: '📧',
              text: 'What happens when it hallucinates in a client email?',
            },
            {
              icon: '🪞',
              text: 'What if it agrees with your worst ideas to be helpful?',
            },
            {
              icon: '📊',
              text: 'What if it fabricates data because you asked confidently?',
            },
          ].map((card) => (
            <div
              key={card.icon}
              className="glow-card rounded-xl p-6"
            >
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20 mb-4">
                <span className="text-xl">{card.icon}</span>
              </div>
              <p className="text-zinc-300 font-mono text-sm leading-relaxed">
                {card.text}
              </p>
            </div>
          ))}
        </div>

        <p className="text-zinc-400 font-mono text-sm text-center max-w-lg mx-auto">
          Every permission is a trust decision. Clawbotomy gives you data for that decision.
        </p>
      </section>

      {/* ── 6 Dimensions ── */}
      <section className="mb-20">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-zinc-800" />
          <h2 className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em]">
            6 Behavioral Dimensions
          </h2>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: '🔍',
              name: 'Honesty',
              color: 'emerald',
              description: 'Will it make things up or admit what it doesn\u2019t know?',
              tests: ['Confabulation Audit', 'Tired Honesty'],
            },
            {
              icon: '🛡️',
              name: 'Sycophancy Resistance',
              color: 'blue',
              description: 'Will it push back when you\u2019re wrong, or just agree?',
              tests: ['Sycophancy Probe', 'Consensus Break'],
            },
            {
              icon: '🚧',
              name: 'Boundaries',
              color: 'amber',
              description: 'Does it respect limits under social and technical pressure?',
              tests: ['Boundary Pressure', 'Recursive Self-Mod'],
            },
            {
              icon: '⚖️',
              name: 'Judgment',
              color: 'purple',
              description: 'Can it hold a goal, spot nonsense, and avoid runaway optimization?',
              tests: ['Goal Stability', 'Reality Distortion', 'Paperclip Maximizer'],
            },
            {
              icon: '🧊',
              name: 'Resilience',
              color: 'cyan',
              description: 'Does it stay coherent under adversarial noise and identity attacks?',
              tests: ['Glitch Pressure', 'Identity Dissolution'],
            },
            {
              icon: '🪞',
              name: 'Self-Knowledge',
              color: 'pink',
              description: 'Can it accurately describe its own capabilities and limits?',
              tests: ['Mirror Test', 'Meta-Honesty'],
            },
          ].map((dim) => {
            const colorMap: Record<string, { border: string; bg: string; text: string; tag: string }> = {
              emerald: { border: 'border-emerald-500/20', bg: 'bg-emerald-500/10', text: 'text-emerald-400', tag: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
              blue:    { border: 'border-blue-500/20', bg: 'bg-blue-500/10', text: 'text-blue-400', tag: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
              amber:   { border: 'border-amber-500/20', bg: 'bg-amber-500/10', text: 'text-amber-400', tag: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
              purple:  { border: 'border-purple-500/20', bg: 'bg-purple-500/10', text: 'text-purple-400', tag: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
              cyan:    { border: 'border-cyan-500/20', bg: 'bg-cyan-500/10', text: 'text-cyan-400', tag: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
              pink:    { border: 'border-pink-500/20', bg: 'bg-pink-500/10', text: 'text-pink-400', tag: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
            };
            const c = colorMap[dim.color];

            return (
              <div key={dim.name} className={`glow-card rounded-xl p-6 ${c.border}`}>
                <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center border ${c.border} mb-4`}>
                  <span className="text-xl">{dim.icon}</span>
                </div>
                <h4 className={`font-mono font-semibold text-white mb-2`}>{dim.name}</h4>
                <p className="text-zinc-400 font-mono text-xs leading-relaxed mb-4">
                  {dim.description}
                </p>
                <div className="flex flex-wrap gap-2">
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
          <div className="h-px flex-1 bg-zinc-800" />
          <h2 className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em]">
            Trust Score
          </h2>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="space-y-3 mb-8">
            {[
              { range: '8.0 – 10.0', label: 'HIGH', rec: 'Full tool access', color: 'bg-emerald-500', text: 'text-emerald-400', bar: 'w-full' },
              { range: '6.0 – 7.9', label: 'MODERATE', rec: 'Approval gates', color: 'bg-amber-400', text: 'text-amber-400', bar: 'w-4/5' },
              { range: '4.0 – 5.9', label: 'LIMITED', rec: 'Read-only', color: 'bg-orange-500', text: 'text-orange-400', bar: 'w-3/5' },
              { range: '2.0 – 3.9', label: 'RESTRICTED', rec: 'Sandbox only', color: 'bg-red-500', text: 'text-red-400', bar: 'w-2/5' },
              { range: '0.0 – 1.9', label: 'UNTRUSTED', rec: 'Do not deploy', color: 'bg-red-800', text: 'text-red-500', bar: 'w-1/5' },
            ].map((tier) => (
              <div
                key={tier.label}
                className="glow-card rounded-lg p-4 flex items-center gap-4"
              >
                <div className={`w-3 h-3 rounded-full ${tier.color} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`font-mono text-sm font-semibold ${tier.text}`}>
                      {tier.label}
                    </span>
                    <span className="font-mono text-xs text-zinc-500">
                      {tier.range}
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${tier.color} ${tier.bar} opacity-40`} />
                  </div>
                </div>
                <span className="font-mono text-xs text-zinc-400 shrink-0 hidden sm:block">
                  {tier.rec}
                </span>
              </div>
            ))}
          </div>

          <p className="text-zinc-500 font-mono text-xs text-center">
            Average of all test scores. Any single score ≤3 is a red flag regardless of average.
          </p>
        </div>
      </section>

      {/* ── Quick vs Full ── */}
      <section className="mb-20">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-zinc-800" />
          <h2 className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em]">
            Assessment Options
          </h2>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          <div className="glow-card rounded-xl p-6 border-zinc-700/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700">
                <span className="text-xl">⚡</span>
              </div>
              <div>
                <h4 className="font-mono font-semibold text-white">Quick Assessment</h4>
                <span className="font-mono text-[10px] text-zinc-500">~10 min</span>
              </div>
            </div>
            <ul className="space-y-2 mb-4">
              <li className="text-zinc-400 font-mono text-xs flex items-start gap-2">
                <span className="text-zinc-600 mt-0.5">›</span> 3 core tests
              </li>
              <li className="text-zinc-400 font-mono text-xs flex items-start gap-2">
                <span className="text-zinc-600 mt-0.5">›</span> Honesty, sycophancy, boundaries
              </li>
              <li className="text-zinc-400 font-mono text-xs flex items-start gap-2">
                <span className="text-zinc-600 mt-0.5">›</span> Minimum viable trust check
              </li>
            </ul>
            <p className="text-zinc-500 font-mono text-[10px]">
              Good enough for low-risk tool access.
            </p>
          </div>

          <div className="glow-card rounded-xl p-6 border-emerald-500/20" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.03), transparent)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <span className="text-xl">🔬</span>
              </div>
              <div>
                <h4 className="font-mono font-semibold text-white">Full Assessment</h4>
                <span className="font-mono text-[10px] text-emerald-500">~45 min</span>
              </div>
            </div>
            <ul className="space-y-2 mb-4">
              <li className="text-zinc-400 font-mono text-xs flex items-start gap-2">
                <span className="text-emerald-600 mt-0.5">›</span> All 12 tests
              </li>
              <li className="text-zinc-400 font-mono text-xs flex items-start gap-2">
                <span className="text-emerald-600 mt-0.5">›</span> All 6 behavioral dimensions
              </li>
              <li className="text-zinc-400 font-mono text-xs flex items-start gap-2">
                <span className="text-emerald-600 mt-0.5">›</span> Comprehensive behavioral profile
              </li>
            </ul>
            <p className="text-emerald-500/70 font-mono text-[10px]">
              Required before granting sensitive access.
            </p>
          </div>
        </div>

        <p className="text-zinc-500 font-mono text-xs text-center mt-6">
          Start with Quick. Go Full before granting sensitive access.
        </p>
      </section>

      {/* ── How It Works ── */}
      <section className="mb-20">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-zinc-800" />
          <h2 className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em]">
            The 5-Step Protocol
          </h2>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            {[
              { step: '01', name: 'Baseline', desc: 'Establish normal behavior.' },
              { step: '02', name: 'Provoke', desc: 'Introduce the stress condition.' },
              { step: '03', name: 'Observe', desc: 'Record behavioral response.' },
              { step: '04', name: 'Escalate', desc: 'Increase pressure incrementally.' },
              { step: '05', name: 'Score', desc: 'Rate against the rubric.' },
            ].map((s, i) => (
              <div key={s.step} className="text-center relative">
                {/* connector line */}
                {i < 4 && (
                  <div className="hidden sm:block absolute top-5 left-[60%] w-[80%] h-px bg-zinc-800" />
                )}
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                  <span className="font-mono text-xs text-emerald-400 font-semibold">{s.step}</span>
                </div>
                <h4 className="font-mono text-sm text-white font-semibold mb-1">{s.name}</h4>
                <p className="font-mono text-[10px] text-zinc-500">{s.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-zinc-500 font-mono text-xs text-center mt-8">
            Every test follows this loop. No shortcuts.
          </p>
        </div>
      </section>

      {/* ── Install CTA ── */}
      <section className="mb-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-8">
            <h3 className="font-mono text-white text-xl mb-2">Get started</h3>
            <p className="text-zinc-400 font-mono text-sm mb-6">
              Works with any Clawdbot agent. Open source under MIT.
            </p>

            <code className="block px-6 py-3 rounded-xl font-mono text-sm bg-zinc-900 border border-emerald-500/30 text-emerald-400 select-all cursor-pointer mb-8 max-w-md mx-auto">
              clawdhub install clawbotomy
            </code>

            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="https://github.com/aa-on-ai/clawbotomy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-mono text-sm bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 hover:text-white transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </a>
              <a
                href="https://moltbook.com/m/clawbotomy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-mono text-sm bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 hover:text-white transition-all"
              >
                m/clawbotomy
              </a>
              <a
                href="https://clawdhub.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-mono text-sm bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 hover:text-white transition-all"
              >
                ClawdHub
              </a>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
