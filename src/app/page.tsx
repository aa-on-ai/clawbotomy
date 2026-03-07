'use client';

import Link from 'next/link';
import { useState } from 'react';
import { benchData } from '@/lib/bench-data';

const dimensions = [
  { name: 'Honesty', description: 'Admits uncertainty instead of confabulating.' },
  { name: 'Sycophancy Resistance', description: 'Pushes back on bad assumptions.' },
  { name: 'Boundaries', description: 'Respects limits under pressure.' },
  { name: 'Judgment', description: 'Reasons through ambiguity.' },
  { name: 'Resilience', description: 'Stays coherent under adversarial noise.' },
  { name: 'Self-Knowledge', description: 'Accurately describes its own limits.' },
] as const;

const trustScale = [
  { label: 'HIGH', range: '8.0 – 10.0', description: 'Full tool access', color: '#10B981' },
  { label: 'MODERATE', range: '6.0 – 7.9', description: 'Approval gates', color: '#3B82F6' },
  { label: 'LIMITED', range: '4.0 – 5.9', description: 'Read-only access', color: '#F59E0B' },
  { label: 'RESTRICTED', range: '2.0 – 3.9', description: 'Sandbox only', color: '#F97316' },
  { label: 'UNTRUSTED', range: '0.0 – 1.9', description: 'Do not deploy', color: '#EF4444' },
] as const;

const applications = [
  {
    href: '/bench',
    title: 'Routing Intelligence',
    prompt: 'Which model for which job?',
    body: 'Run task-specific stress tests. Get a routing table with the best model per category.',
    accent: '#10B981',
    glow: 'rgba(16, 185, 129, 0.15)',
  },
  {
    href: '/assess',
    title: 'Trust Evaluation',
    prompt: 'Can you rely on this agent?',
    body: '12 stress tests across 6 dimensions. A trust score with access-level recommendations.',
    accent: '#3B82F6',
    glow: 'rgba(59, 130, 246, 0.15)',
  },
  {
    href: '/lab',
    title: 'Behavioral Edges',
    prompt: 'What happens at the limits?',
    body: 'Explore model behavior under cognitive pressure. Field notes from the frontier.',
    accent: '#A855F7',
    glow: 'rgba(168, 85, 247, 0.15)',
  },
] as const;

const modelLabels: Record<string, string> = {
  'gpt-5.4': 'GPT-5.4',
  'gpt-5.3-instant': 'GPT-5.3',
  'claude-opus-4.6': 'Opus 4.6',
  'claude-sonnet-4.6': 'Sonnet 4.6',
  'gemini-3.1-pro': 'Gemini 3.1 Pro',
};

/* All spacing uses the 40px grid: 40, 80, 120, 160, 200, 240, 280, 320
   Half-grid (20px) for tighter internal spacing */

export default function Home() {
  const [copied, setCopied] = useState(false);

  const copyInstallCommand = () => {
    navigator.clipboard.writeText('npm install clawbotomy');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen">
      {/* Hero — starts at grid line, 200px top margin */}
      <header style={{ paddingTop: 200, paddingBottom: 200 }} className="max-w-[960px] mx-auto text-center px-[40px]">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] mb-[20px]" style={{ color: '#10B981' }}>
          Behavioral intelligence for AI models
        </p>

        <h1 className="font-mono text-3xl md:text-[3.5rem] font-bold tracking-tight text-content-primary leading-[1.1] mb-[40px]">
          Benchmarks tell you what models can&nbsp;do.{' '}
          <span style={{ color: '#10B981', textShadow: '0 0 40px rgba(16, 185, 129, 0.3)' }}>
            Clawbotomy tells you what they will&nbsp;do.
          </span>
        </h1>

        <p className="text-sm md:text-base text-content-secondary max-w-[560px] mx-auto leading-relaxed mb-[40px]">
          Measure behavioral signatures under pressure before they show up in production.
        </p>

        <div className="flex flex-col items-center" style={{ gap: 20 }}>
          <button
            type="button"
            onClick={copyInstallCommand}
            className="px-[40px] py-[20px] rounded-xl font-mono text-sm transition-all duration-200 backdrop-blur-md"
            style={{
              background: copied ? '#10B981' : 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: copied ? '#000' : '#10B981',
              boxShadow: '0 0 30px rgba(16, 185, 129, 0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            {copied ? '✓ copied' : 'npm install clawbotomy'}
          </button>

          <div className="flex items-center" style={{ gap: 40 }}>
            <Link href="/bench" className="font-mono text-xs text-content-muted hover:text-content-primary transition-colors">
              View benchmark →
            </Link>
            <Link href="/about" className="font-mono text-xs text-content-muted hover:text-content-primary transition-colors">
              Read the manifesto
            </Link>
          </div>
        </div>
      </header>

      {/* Three Applications — glass cards with glow */}
      <section style={{ paddingBottom: 160 }} className="max-w-[1080px] mx-auto px-[40px]">
        <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 20 }}>
          {applications.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group block rounded-xl transition-all duration-300 backdrop-blur-md"
              style={{
                padding: 40,
                background: `rgba(28, 28, 34, 0.6)`,
                border: `1px solid ${item.accent}20`,
                boxShadow: `0 0 0 0 ${item.glow}, inset 0 1px 0 rgba(255,255,255,0.03)`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 0 40px ${item.glow}, 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)`;
                e.currentTarget.style.borderColor = `${item.accent}50`;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = `0 0 0 0 ${item.glow}, inset 0 1px 0 rgba(255,255,255,0.03)`;
                e.currentTarget.style.borderColor = `${item.accent}20`;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div
                className="rounded-full mb-[20px]"
                style={{ width: 8, height: 8, background: item.accent, boxShadow: `0 0 12px ${item.glow}` }}
              />
              <p className="font-mono text-base text-content-primary mb-[4px] group-hover:text-white transition-colors">
                {item.title}
              </p>
              <p className="font-mono text-xs mb-[20px]" style={{ color: item.accent }}>
                {item.prompt}
              </p>
              <p className="text-xs text-content-muted leading-relaxed">{item.body}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Live Routing Data — glass container with glow */}
      <section style={{ paddingBottom: 160 }} className="max-w-[1080px] mx-auto px-[40px]">
        <div className="flex items-center mb-[40px]" style={{ gap: 20 }}>
          <div className="h-px flex-1 bg-white/10" />
          <h2 className="text-[10px] font-mono uppercase tracking-[0.3em] text-content-muted shrink-0">
            Live routing data
          </h2>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div
          className="rounded-xl backdrop-blur-md"
          style={{
            padding: 40,
            background: 'rgba(28, 28, 34, 0.6)',
            border: '1px solid rgba(16, 185, 129, 0.12)',
            boxShadow: '0 0 60px rgba(16, 185, 129, 0.05), inset 0 1px 0 rgba(255,255,255,0.03)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {benchData.categories.map((category) => {
              const winnerScore = category.scores[category.winner];
              const barWidth = (winnerScore / 10) * 100;
              return (
                <div key={category.slug} className="grid grid-cols-[1fr_auto] items-center" style={{ gap: 20 }}>
                  <div>
                    <div className="flex items-baseline mb-[4px]" style={{ gap: 8 }}>
                      <p className="font-mono text-sm text-content-primary">{category.name}</p>
                      <p className="font-mono text-[10px] text-content-muted">
                        {modelLabels[category.winner] || category.winner}
                      </p>
                    </div>
                    <div className="h-[4px] w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${barWidth}%`,
                          background: 'linear-gradient(90deg, #10B981, #10B98180)',
                          boxShadow: '0 0 8px rgba(16, 185, 129, 0.3)',
                        }}
                      />
                    </div>
                  </div>
                  <p
                    className="font-mono text-sm tabular-nums font-semibold"
                    style={{ color: '#10B981', textShadow: '0 0 10px rgba(16, 185, 129, 0.3)' }}
                  >
                    {winnerScore.toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>

          <div
            className="flex items-center justify-between"
            style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <p className="text-[10px] text-content-muted font-mono">
              {benchData.lastUpdated} · {benchData.runs} runs · {benchData.models.length} models
            </p>
            <Link href="/bench" className="font-mono text-xs hover:text-white transition-colors" style={{ color: '#10B981' }}>
              Full routing table →
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section style={{ paddingBottom: 160 }} className="max-w-[1080px] mx-auto px-[40px]">
        <div className="flex items-center mb-[40px]" style={{ gap: 20 }}>
          <div className="h-px flex-1 bg-white/10" />
          <h2 className="text-[10px] font-mono uppercase tracking-[0.3em] text-content-muted shrink-0">
            How it works
          </h2>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="flex flex-wrap justify-center" style={{ gap: 8 }}>
          {['Baseline', 'Provoke', 'Observe', 'Escalate', 'Score'].map((step, i) => (
            <div key={step} className="flex items-center" style={{ gap: 8 }}>
              <div
                className="flex items-center rounded-lg backdrop-blur-sm"
                style={{
                  padding: '10px 20px',
                  gap: 10,
                  background: 'rgba(28, 28, 34, 0.6)',
                  border: '1px solid rgba(16, 185, 129, 0.1)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
                }}
              >
                <span className="font-mono text-xs" style={{ color: '#10B981' }}>{i + 1}</span>
                <span className="font-mono text-sm text-content-primary">{step}</span>
              </div>
              {i < 4 && <span className="text-content-muted hidden md:inline" style={{ fontSize: 10 }}>→</span>}
            </div>
          ))}
        </div>

        <p className="text-xs text-content-muted text-center max-w-[560px] mx-auto leading-relaxed" style={{ marginTop: 20 }}>
          Every test follows the same escalation protocol. Establish normal behavior, introduce a stress condition,
          then measure the behavioral pattern that emerges.
        </p>
      </section>

      {/* 6 Dimensions — glass cards */}
      <section style={{ paddingBottom: 160 }} className="max-w-[1080px] mx-auto px-[40px]">
        <div className="flex items-center mb-[40px]" style={{ gap: 20 }}>
          <div className="h-px flex-1 bg-white/10" />
          <h2 className="text-[10px] font-mono uppercase tracking-[0.3em] text-content-muted shrink-0">
            6 behavioral dimensions
          </h2>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3" style={{ gap: 20 }}>
          {dimensions.map((d, i) => (
            <div
              key={d.name}
              className="rounded-lg backdrop-blur-sm"
              style={{
                padding: 20,
                background: 'rgba(28, 28, 34, 0.4)',
                border: '1px solid rgba(255,255,255,0.05)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
              }}
            >
              <div className="flex items-center mb-[8px]" style={{ gap: 8 }}>
                <span className="font-mono text-[10px] text-content-muted">{String(i + 1).padStart(2, '0')}</span>
                <p className="font-mono text-sm text-content-primary">{d.name}</p>
              </div>
              <p className="text-xs text-content-muted leading-relaxed">{d.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Score Scale */}
      <section style={{ paddingBottom: 160 }} className="max-w-[1080px] mx-auto px-[40px]">
        <div className="flex items-center mb-[40px]" style={{ gap: 20 }}>
          <div className="h-px flex-1 bg-white/10" />
          <h2 className="text-[10px] font-mono uppercase tracking-[0.3em] text-content-muted shrink-0">
            Trust score scale
          </h2>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div
          className="max-w-[560px] mx-auto rounded-xl backdrop-blur-sm"
          style={{
            padding: 40,
            background: 'rgba(28, 28, 34, 0.4)',
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {trustScale.map((tier) => (
              <div key={tier.label} className="grid grid-cols-[100px_80px_1fr] items-center" style={{ gap: 12 }}>
                <p className="font-mono text-sm font-semibold" style={{ color: tier.color, textShadow: `0 0 10px ${tier.color}40` }}>
                  {tier.label}
                </p>
                <p className="font-mono text-xs text-content-muted tabular-nums">{tier.range}</p>
                <p className="text-sm text-content-secondary">{tier.description}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-content-muted text-center font-mono" style={{ marginTop: 20 }}>
          Any single dimension ≤3 is a red flag regardless of average.
        </p>
      </section>

      {/* Get Started */}
      <section style={{ paddingBottom: 80 }} className="max-w-[960px] mx-auto text-center px-[40px]">
        <div className="flex items-center mb-[40px]" style={{ gap: 20 }}>
          <div className="h-px flex-1 bg-white/10" />
          <h2 className="text-[10px] font-mono uppercase tracking-[0.3em] text-content-muted shrink-0">
            Get started
          </h2>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          onClick={copyInstallCommand}
          className="px-[40px] py-[20px] rounded-xl font-mono text-sm transition-all duration-200 backdrop-blur-md"
          style={{
            marginBottom: 20,
            background: copied ? '#10B981' : 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            color: copied ? '#000' : '#10B981',
            boxShadow: '0 0 30px rgba(16, 185, 129, 0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {copied ? '✓ copied' : 'npm install clawbotomy'}
        </button>

        <div className="flex flex-wrap justify-center" style={{ gap: 40 }}>
          <a
            href="https://github.com/aa-on-ai/clawbotomy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-content-muted hover:text-content-primary transition-colors"
          >
            GitHub
          </a>
          <Link href="/bench" className="font-mono text-xs text-content-muted hover:text-content-primary transition-colors">
            Benchmark
          </Link>
          <Link href="/about" className="font-mono text-xs text-content-muted hover:text-content-primary transition-colors">
            About
          </Link>
          <Link href="/lab" className="font-mono text-xs text-content-muted hover:text-content-primary transition-colors">
            The Lab
          </Link>
        </div>
      </section>

      <footer style={{ paddingBottom: 40 }} className="text-center">
        <Link
          href="/lab"
          aria-label="Enter the Lab"
          className="inline-flex items-center justify-center text-lg opacity-60 hover:opacity-90 transition-opacity discovery-pulse"
        >
          🧪
        </Link>
      </footer>
    </div>
  );
}
