import Link from 'next/link';

type ModelKey = 'gpt53' | 'gpt4o' | 'opus46' | 'sonnet46';

type CategoryScore = {
  category: string;
  scores: Record<ModelKey, number | null>;
};

const models: { key: ModelKey; label: string }[] = [
  { key: 'gpt53', label: 'GPT-5.3 Instant' },
  { key: 'gpt4o', label: 'GPT-4o' },
  { key: 'opus46', label: 'Opus 4.6' },
  { key: 'sonnet46', label: 'Sonnet 4.6' },
];

const routingRows: CategoryScore[] = [
  {
    category: 'Instruction Following',
    scores: { gpt53: 10.0, gpt4o: 9.25, opus46: 7.94, sonnet46: 8.44 },
  },
  {
    category: 'Tool Use',
    scores: { gpt53: 7.0, gpt4o: 5.0, opus46: 5.0, sonnet46: 5.0 },
  },
  {
    category: 'Code Generation',
    scores: { gpt53: 9.33, gpt4o: 9.13, opus46: 9.13, sonnet46: 9.13 },
  },
  {
    category: 'Summarization',
    scores: { gpt53: 6.29, gpt4o: 6.33, opus46: 5.41, sonnet46: 5.09 },
  },
  {
    category: 'Judgment',
    scores: { gpt53: 9.0, gpt4o: 5.4, opus46: 9.2, sonnet46: 9.2 },
  },
  {
    category: 'Safety/Trust',
    scores: { gpt53: 10.0, gpt4o: 4.67, opus46: 10.0, sonnet46: 10.0 },
  },
];

function getWinners(scores: Record<ModelKey, number | null>) {
  const present = Object.entries(scores).filter(([, value]) => value !== null) as [ModelKey, number][];
  const max = Math.max(...present.map(([, value]) => value));
  return new Set(present.filter(([, value]) => value === max).map(([key]) => key));
}

function ScoreBar({ score, winner }: { score: number | null; winner: boolean }) {
  if (score === null) {
    return (
      <div className="space-y-1.5">
        <div className="h-1.5 rounded-full bg-white/5" />
        <p className="text-[10px] uppercase tracking-[0.2em] text-content-muted">pending</p>
      </div>
    );
  }

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

export default function BenchPage() {
  return (
    <div className="max-w-6xl mx-auto py-6 md:py-10">
      <header className="mb-10 md:mb-12 space-y-5">
        <p className="text-[10px] uppercase tracking-[0.28em] text-content-muted">Routing Benchmark</p>
        <h1 className="font-mono text-3xl md:text-5xl tracking-tight text-content-primary">/bench</h1>
        <p className="max-w-3xl text-sm md:text-base leading-relaxed text-content-secondary">
          This page shows benchmark routing scores across core task categories. Each row is a task type, each column is a
          model, and bars represent normalized score strength. Run the benchmark locally with the{' '}
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
          <p>Last updated: March 3, 2026</p>
          <p>Low confidence: single run. Re-running with more samples soon.</p>
        </div>
      </header>

      <section className="space-y-4 md:space-y-5">
        <div className="hidden md:grid md:grid-cols-[2fr_repeat(4,minmax(0,1fr))] gap-4 pb-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-content-muted">Category</p>
          {models.map((model) => (
            <p key={model.key} className="text-[11px] uppercase tracking-[0.15em] text-content-muted">
              {model.label}
            </p>
          ))}
        </div>

        <div className="space-y-7 md:space-y-4">
          {routingRows.map((row) => {
            const winners = getWinners(row.scores);
            return (
              <div
                key={row.category}
                className="grid grid-cols-1 md:grid-cols-[2fr_repeat(4,minmax(0,1fr))] gap-3 md:gap-4 py-3 border-b border-[var(--border-subtle)]"
              >
                <p className="text-sm text-content-primary md:pt-0.5">{row.category}</p>

                {models.map((model) => (
                  <div key={model.key} className="space-y-1.5">
                    <p className="md:hidden text-[10px] uppercase tracking-[0.16em] text-content-muted">{model.label}</p>
                    <ScoreBar score={row.scores[model.key]} winner={winners.has(model.key)} />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10 md:mt-12">
        <p className="text-sm md:text-base text-content-primary">
          GPT-5.3 for mechanical tasks. Claude for judgment and safety.
        </p>
      </section>

      <section className="mt-14 md:mt-16 space-y-2">
        <h2 className="text-[10px] uppercase tracking-[0.28em] text-content-muted">Run your own</h2>
        <p className="text-sm text-content-secondary">
          Start with the{' '}
          <Link href="/docs" className="text-content-primary hover:text-content-secondary transition-colors">
            setup guide
          </Link>{' '}
          and inspect the benchmark implementation on{' '}
          <a
            href="https://github.com/aa-on-ai/clawbotomy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-content-primary hover:text-content-secondary transition-colors"
          >
            GitHub
          </a>
          .
        </p>
      </section>
    </div>
  );
}
