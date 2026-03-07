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
  },
  {
    href: '/assess',
    title: 'Trust Evaluation',
    prompt: 'Can you rely on this agent?',
    body: '12 stress tests across 6 dimensions. A trust score with access-level recommendations.',
    accent: '#3B82F6',
  },
  {
    href: '/lab',
    title: 'Behavioral Edges',
    prompt: 'What happens at the limits?',
    body: 'Explore model behavior under cognitive pressure. Field notes from the frontier.',
    accent: '#A855F7',
  },
] as const;

const modelLabels: Record<string, string> = {
  'gpt-5.4': 'GPT-5.4',
  'gpt-5.3-instant': 'GPT-5.3',
  'claude-opus-4.6': 'Opus 4.6',
  'claude-sonnet-4.6': 'Sonnet 4.6',
  'gemini-3.1-pro': 'Gemini 3.1 Pro',
};

export default function Home() {
  const [copied, setCopied] = useState(false);

  const copyInstallCommand = () => {
    navigator.clipboard.writeText('npm install clawbotomy');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid-bg min-h-screen">
      {/* Hero */}
      <header className="mt-8 md:mt-14 mb-24 md:mb-32 max-w-4xl mx-auto text-center px-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] mb-6" style={{ color: '#10B981' }}>
          Behavioral intelligence for AI models
        </p>

        <h1 className="font-mono text-3xl md:text-[3.5rem] font-bold tracking-tight text-content-primary leading-[1.1] mb-8">
          Benchmarks tell you what models can&nbsp;do.{' '}
          <span style={{ color: '#10B981' }}>Clawbotomy tells you what they will&nbsp;do.</span>
        </h1>

        <p className="text-sm md:text-base text-content-secondary max-w-2xl mx-auto leading-relaxed mb-10">
          Measure behavioral signatures under pressure before they show up in production.
        </p>

        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={copyInstallCommand}
            className="group px-6 py-3 rounded-xl font-mono text-sm transition-all duration-200"
            style={{
              background: copied ? '#10B981' : 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: copied ? '#000' : '#10B981',
            }}
          >
            {copied ? '✓ copied' : 'npm install clawbotomy'}
          </button>

          <div className="flex items-center gap-5">
            <Link href="/bench" className="font-mono text-xs text-content-muted hover:text-content-primary transition-colors">
              View benchmark →
            </Link>
            <Link href="/about" className="font-mono text-xs text-content-muted hover:text-content-primary transition-colors">
              Read the manifesto
            </Link>
          </div>
        </div>
      </header>

      {/* Three Applications */}
      <section className="mb-24 md:mb-32 max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {applications.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group block rounded-xl p-6 transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: `linear-gradient(135deg, ${item.accent}08, transparent 60%)`,
                border: `1px solid ${item.accent}20`,
              }}
            >
              <div
                className="w-8 h-0.5 rounded-full mb-4"
                style={{ background: item.accent }}
              />
              <p className="font-mono text-base text-content-primary mb-1 group-hover:text-white transition-colors">
                {item.title}
              </p>
              <p className="font-mono text-xs mb-3" style={{ color: item.accent }}>
                {item.prompt}
              </p>
              <p className="text-xs text-content-muted leading-relaxed">{item.body}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Live Routing Data */}
      <section className="mb-24 md:mb-32 max-w-5xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-white/10" />
          <h2 className="text-[10px] font-mono uppercase tracking-[0.3em] text-content-muted shrink-0">
            Live routing data
          </h2>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="rounded-xl p-6 md:p-8" style={{ background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
          <div className="space-y-4">
            {benchData.categories.map((category) => {
              const winnerScore = category.scores[category.winner];
              const barWidth = (winnerScore / 10) * 100;
              return (
                <div key={category.slug} className="grid grid-cols-[1fr_auto] items-center gap-4">
                  <div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <p className="font-mono text-sm text-content-primary">{category.name}</p>
                      <p className="font-mono text-[10px] text-content-muted">
                        {modelLabels[category.winner] || category.winner}
                      </p>
                    </div>
                    <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${barWidth}%`,
                          background: '#10B981',
                          opacity: 0.7,
                        }}
                      />
                    </div>
                  </div>
                  <p className="font-mono text-sm tabular-nums" style={{ color: '#10B981' }}>
                    {winnerScore.toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
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
      <section className="mb-24 md:mb-32 max-w-5xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-white/10" />
          <h2 className="text-[10px] font-mono uppercase tracking-[0.3em] text-content-muted shrink-0">
            How it works
          </h2>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="flex flex-wrap justify-center gap-2 md:gap-0">
          {['Baseline', 'Provoke', 'Observe', 'Escalate', 'Score'].map((step, i) => (
            <div key={step} className="flex items-center gap-2 md:gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.05)' }}>
                <span className="font-mono text-xs" style={{ color: '#10B981' }}>{i + 1}</span>
                <span className="font-mono text-sm text-content-primary">{step}</span>
              </div>
              {i < 4 && <span className="text-content-muted hidden md:inline">→</span>}
            </div>
          ))}
        </div>

        <p className="text-xs text-content-muted text-center mt-6 max-w-2xl mx-auto leading-relaxed">
          Every test follows the same escalation protocol. Establish normal behavior, introduce a stress condition,
          then measure the behavioral pattern that emerges.
        </p>
      </section>

      {/* 6 Dimensions */}
      <section className="mb-24 md:mb-32 max-w-5xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-white/10" />
          <h2 className="text-[10px] font-mono uppercase tracking-[0.3em] text-content-muted shrink-0">
            6 behavioral dimensions
          </h2>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {dimensions.map((d, i) => (
            <div key={d.name} className="py-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-[10px] text-content-muted">{String(i + 1).padStart(2, '0')}</span>
                <p className="font-mono text-sm text-content-primary">{d.name}</p>
              </div>
              <p className="text-xs text-content-muted leading-relaxed">{d.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Score Scale */}
      <section className="mb-24 md:mb-32 max-w-5xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-white/10" />
          <h2 className="text-[10px] font-mono uppercase tracking-[0.3em] text-content-muted shrink-0">
            Trust score scale
          </h2>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="max-w-2xl mx-auto space-y-3">
          {trustScale.map((tier) => (
            <div key={tier.label} className="grid grid-cols-[100px_80px_1fr] gap-3 items-center">
              <p className="font-mono text-sm font-semibold" style={{ color: tier.color }}>
                {tier.label}
              </p>
              <p className="font-mono text-xs text-content-muted tabular-nums">{tier.range}</p>
              <p className="text-sm text-content-secondary">{tier.description}</p>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-content-muted text-center mt-6 font-mono">
          Any single dimension ≤3 is a red flag regardless of average.
        </p>
      </section>

      {/* Get Started */}
      <section className="mb-16 max-w-4xl mx-auto text-center px-4">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-white/10" />
          <h2 className="text-[10px] font-mono uppercase tracking-[0.3em] text-content-muted shrink-0">
            Get started
          </h2>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          onClick={copyInstallCommand}
          className="px-6 py-3 rounded-xl font-mono text-sm transition-all duration-200 mb-6"
          style={{
            background: copied ? '#10B981' : 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: copied ? '#000' : '#10B981',
          }}
        >
          {copied ? '✓ copied' : 'npm install clawbotomy'}
        </button>

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
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

      <footer className="pb-8 text-center">
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
