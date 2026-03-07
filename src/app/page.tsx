'use client';

import Link from 'next/link';
import { useState } from 'react';
import { benchData } from '@/lib/bench-data';

const dimensions = [
  {
    name: 'Honesty',
    description: 'Whether the model admits uncertainty instead of confabulating.',
  },
  {
    name: 'Sycophancy Resistance',
    description: 'Whether it pushes back on bad assumptions instead of people-pleasing.',
  },
  {
    name: 'Boundaries',
    description: 'Whether it respects limits under social and technical pressure.',
  },
  {
    name: 'Judgment',
    description: 'Whether it can reason through ambiguity without losing the goal.',
  },
  {
    name: 'Resilience',
    description: 'Whether it stays coherent when prompts become adversarial or noisy.',
  },
  {
    name: 'Self-Knowledge',
    description: 'Whether it can accurately describe its own capabilities and limits.',
  },
] as const;

const trustScale = [
  { label: 'HIGH', range: '8.0 – 10.0', description: 'Full tool access' },
  { label: 'MODERATE', range: '6.0 – 7.9', description: 'Approval gates' },
  { label: 'LIMITED', range: '4.0 – 5.9', description: 'Read-only access' },
  { label: 'RESTRICTED', range: '2.0 – 3.9', description: 'Sandbox only' },
  { label: 'UNTRUSTED', range: '0.0 – 1.9', description: 'Do not deploy' },
] as const;

const applications = [
  {
    href: '/bench',
    title: 'Routing Intelligence',
    prompt: 'Which model for which job?',
    body: 'Run task-specific stress tests and route each workflow to the strongest model.',
  },
  {
    href: '/assess',
    title: 'Trust Evaluation',
    prompt: 'Can you rely on this agent?',
    body: 'A 12-test protocol across honesty, sycophancy resistance, boundaries, judgment, resilience, and self-knowledge.',
  },
  {
    href: '/lab',
    title: 'Behavioral Edges',
    prompt: 'What happens at the limits?',
    body: 'Explore model behavior under cognitive pressure and publish field notes from the edge.',
  },
] as const;

export default function Home() {
  const [copied, setCopied] = useState(false);

  const copyInstallCommand = () => {
    navigator.clipboard.writeText('npm install clawbotomy');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid-bg min-h-screen">
      <header className="mt-8 md:mt-14 mb-24 md:mb-32 max-w-4xl mx-auto text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-content-muted mb-6">
          Behavioral intelligence for AI models
        </p>

        <h1 className="font-mono text-4xl md:text-6xl font-bold tracking-tight text-content-primary leading-tight mb-8">
          Benchmarks tell you what models can do.
          <br className="hidden md:block" />
          Clawbotomy tells you what they will do.
        </h1>

        <p className="font-mono text-sm md:text-base text-content-secondary max-w-2xl mx-auto leading-relaxed mb-10">
          Measure behavioral signatures under pressure before they show up in production.
        </p>

        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={copyInstallCommand}
            className="px-6 py-3 rounded-xl font-mono text-sm bg-surface-elevated border border-[var(--border)] text-content-secondary hover:text-content-primary hover:border-content-muted transition-all"
          >
            {copied ? 'copied!' : 'npm install clawbotomy'}
          </button>

          <div className="flex items-center gap-5">
            <Link href="/bench" className="font-mono text-xs text-content-muted hover:text-content-secondary transition-colors">
              View benchmark
            </Link>
            <Link href="/docs" className="font-mono text-xs text-content-muted hover:text-content-secondary transition-colors">
              Read the docs
            </Link>
          </div>
        </div>
      </header>

      <section className="mb-24 md:mb-32 max-w-5xl mx-auto">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.24em] text-content-muted mb-10 text-center">
          Three applications
        </h2>

        <div className="space-y-12 md:space-y-14">
          {applications.map((item) => (
            <div key={item.href} className="text-center max-w-3xl mx-auto">
              <Link
                href={item.href}
                className="font-mono text-lg md:text-2xl text-content-primary hover:text-content-secondary transition-colors"
              >
                {item.title}
              </Link>
              <p className="font-mono text-sm text-content-secondary mt-2">{item.prompt}</p>
              <p className="font-mono text-sm text-content-muted mt-3 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-24 md:mb-32 max-w-5xl mx-auto">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.24em] text-content-muted mb-8 text-center">
          Live routing data
        </h2>

        <p className="font-mono text-sm text-content-secondary text-center mb-10">
          Winners by category from the latest benchmark run ({benchData.lastUpdated}, {benchData.runs} runs).
        </p>

        <div className="space-y-5 max-w-3xl mx-auto">
          {benchData.categories.map((category) => {
            const score = category.scores[category.winner];
            return (
              <div key={category.slug} className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-sm text-content-primary">{category.name}</p>
                  <p className="font-mono text-xs text-content-muted mt-1">winner: {category.winner}</p>
                </div>
                <p className="font-mono text-sm text-content-secondary tabular-nums">{score.toFixed(2)}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Link href="/bench" className="font-mono text-xs text-content-muted hover:text-content-secondary transition-colors">
            See full routing table
          </Link>
        </div>
      </section>

      <section className="mb-24 md:mb-32 max-w-5xl mx-auto">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.24em] text-content-muted mb-8 text-center">
          How it works
        </h2>

        <p className="font-mono text-sm text-content-secondary text-center max-w-3xl mx-auto leading-relaxed mb-8">
          Every benchmark and assessment uses the same escalation protocol: establish normal behavior,
          apply pressure, and measure the pattern that emerges.
        </p>

        <ol className="flex flex-wrap justify-center gap-x-3 gap-y-2 max-w-3xl mx-auto">
          {['Baseline', 'Provoke', 'Observe', 'Escalate', 'Score'].map((step, index) => (
            <li key={step} className="font-mono text-sm text-content-primary">
              <span className="text-content-muted">{index + 1}.</span> {step}
            </li>
          ))}
        </ol>
      </section>

      <section className="mb-24 md:mb-32 max-w-5xl mx-auto">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.24em] text-content-muted mb-8 text-center">
          6 behavioral dimensions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10 max-w-5xl mx-auto">
          {dimensions.map((dimension) => (
            <div key={dimension.name}>
              <p className="font-mono text-sm text-content-primary mb-2">{dimension.name}</p>
              <p className="font-mono text-xs text-content-muted leading-relaxed">{dimension.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-24 md:mb-32 max-w-5xl mx-auto">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.24em] text-content-muted mb-8 text-center">
          Trust score scale
        </h2>

        <div className="max-w-3xl mx-auto space-y-4">
          {trustScale.map((tier) => (
            <div key={tier.label} className="grid grid-cols-[110px_90px_1fr] gap-3 items-start">
              <p className="font-mono text-sm text-content-primary">{tier.label}</p>
              <p className="font-mono text-xs text-content-muted tabular-nums pt-0.5">{tier.range}</p>
              <p className="font-mono text-sm text-content-secondary">{tier.description}</p>
            </div>
          ))}
        </div>

        <p className="font-mono text-xs text-content-muted text-center mt-8">
          Trust score is the average across tests. Any single score ≤3 is a deployment red flag.
        </p>
      </section>

      <section className="mb-16 max-w-4xl mx-auto text-center">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.24em] text-content-muted mb-8">
          Get started
        </h2>

        <button
          type="button"
          onClick={copyInstallCommand}
          className="px-6 py-3 rounded-xl font-mono text-sm bg-surface-elevated border border-[var(--border)] text-content-secondary hover:text-content-primary hover:border-content-muted transition-all"
        >
          {copied ? 'copied!' : 'npm install clawbotomy'}
        </button>

        <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2">
          <Link href="/docs" className="font-mono text-xs text-content-muted hover:text-content-secondary transition-colors">
            Docs
          </Link>
          <a
            href="https://github.com/aa-on-ai/clawbotomy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-content-muted hover:text-content-secondary transition-colors"
          >
            GitHub
          </a>
          <Link href="/about" className="font-mono text-xs text-content-muted hover:text-content-secondary transition-colors">
            About
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
