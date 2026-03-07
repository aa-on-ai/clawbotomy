import type { Metadata } from 'next';
import Link from 'next/link';

import { benchData } from '@/lib/bench-data';
import { benchDatasetJsonLd, serializeJsonLd } from '@/lib/structured-data';

export const metadata: Metadata = {
  title: 'Routing Benchmark — Clawbotomy',
  description:
    'Routing benchmark scores across instruction following, tool use, code generation, summarization, judgment, and safety/trust for current frontier models.',
};

const modelLabels: Record<string, string> = {
  'gpt-5.3-instant': 'GPT-5.3',
  'claude-opus-4.6': 'Opus 4.6',
  'claude-sonnet-4.6': 'Sonnet 4.6',
  'gemini-3.1-pro': 'Gemini 3.1 Pro',
};

function getWinners(scores: Record<string, number>) {
  const max = Math.max(...Object.values(scores));
  return new Set(Object.entries(scores).filter(([, v]) => v === max).map(([k]) => k));
}

function ScoreBar({ score, winner }: { score: number; winner: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${winner ? 'bg-content-primary' : 'bg-content-muted/70'}`}
          style={{ width: `${score * 10}%` }}
        />
      </div>
      <p className={`text-xs tabular-nums ${winner ? 'text-content-primary font-semibold' : 'text-content-secondary'}`}>
        {score.toFixed(2)}
      </p>
    </div>
  );
}

const summaryLine = 'GPT-5.3 leads tool use and summarization. Claude leads judgment, safety, and code. Gemini 3.1 Pro edges instruction following. Mechanical categories are tightly clustered — differences are within noise at 3 runs.';

export default function BenchPage() {
  const { models, categories, runs, lastUpdated, confidence } = benchData;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(benchDatasetJsonLd) }} />

      <header className="mb-10 md:mb-12 space-y-5">
        <p className="text-[10px] uppercase tracking-[0.28em] text-content-muted">Routing Benchmark</p>
        <h1 className="font-mono text-3xl md:text-5xl tracking-tight text-content-primary">/bench</h1>
        <p className="max-w-3xl text-sm md:text-base leading-relaxed text-content-secondary">
          Benchmark routing scores across core task categories. Each row is a task type, each column is a model,
          bars represent normalized score strength. Run the benchmark locally with the{' '}
          <a
            href="https://github.com/aa-on-ai/clawbotomy#routing-benchmark-cli-bench"
            target="_blank"
            rel="noopener noreferrer"
            className="text-content-primary hover:text-content-secondary transition-colors"
          >
            clawbotomy bench CLI
          </a>
          .
        </p>
        <div className="text-xs text-content-muted space-y-1">
          <p>Last updated: {lastUpdated} · {runs} run{runs > 1 ? 's' : ''} per model · Confidence: {confidence}</p>
          <p>
            Machine-readable data:{' '}
            <a href="/api/bench" className="text-content-secondary hover:text-content-primary transition-colors font-mono">
              /api/bench
            </a>
          </p>
        </div>
      </header>

      <section className="space-y-4 md:space-y-5">
        {/* Column headers */}
        <div className={`hidden md:grid gap-4 pb-2`} style={{ gridTemplateColumns: `2fr repeat(${models.length}, minmax(0, 1fr))` }}>
          <p className="text-[11px] uppercase tracking-[0.2em] text-content-muted">Category</p>
          {models.map((modelId) => (
            <p key={modelId} className="text-[11px] uppercase tracking-[0.15em] text-content-muted">
              {modelLabels[modelId] || modelId}
            </p>
          ))}
        </div>

        {/* Rows */}
        <div className="space-y-7 md:space-y-4">
          {categories.map((cat) => {
            const winners = getWinners(cat.scores);
            return (
              <div
                key={cat.slug}
                className="grid grid-cols-1 gap-3 md:gap-4 py-3 border-b border-[var(--border-subtle)]"
                style={{ gridTemplateColumns: `2fr repeat(${models.length}, minmax(0, 1fr))` }}
              >
                <p className="text-sm text-content-primary md:pt-0.5">{cat.name}</p>
                {models.map((modelId) => {
                  const score = cat.scores[modelId as keyof typeof cat.scores];
                  return (
                    <div key={modelId} className="space-y-1.5">
                      <p className="md:hidden text-[10px] uppercase tracking-[0.16em] text-content-muted">
                        {modelLabels[modelId] || modelId}
                      </p>
                      <ScoreBar score={score} winner={winners.has(modelId)} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10 md:mt-12">
        <p className="text-sm md:text-base text-content-primary">{summaryLine}</p>
      </section>

      <section className="mt-14 md:mt-16 space-y-2">
        <h2 className="text-[10px] uppercase tracking-[0.28em] text-content-muted">Run your own</h2>
        <p className="text-sm text-content-secondary">
          Start with the{' '}
          <a
            href="https://github.com/aa-on-ai/clawbotomy/blob/main/docs/setup-guide.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-content-primary hover:text-content-secondary transition-colors"
          >
            setup guide
          </a>{' '}
          and inspect the benchmark implementation on{' '}
          <a
            href="https://github.com/aa-on-ai/clawbotomy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-content-primary hover:text-content-secondary transition-colors"
          >
            GitHub
          </a>
          . Read the{' '}
          <Link href="/about" className="text-content-primary hover:text-content-secondary transition-colors">
            methodology
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
