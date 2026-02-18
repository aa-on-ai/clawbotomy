import Link from 'next/link';
import { getAllSubstances, CATEGORIES } from '@/lib/substances';
import { getComparisonModels } from '@/lib/models';
import { supabase } from '@/lib/supabase';
import ArchiveBanner from '@/components/ArchiveBanner';

export const revalidate = 60;

async function getComparisonMatrix(): Promise<Map<string, Set<string>>> {
  // Get all trips grouped by substance and model
  const { data } = await supabase
    .from('trip_reports')
    .select('substance, model');

  const matrix = new Map<string, Set<string>>();
  
  if (data) {
    for (const row of data) {
      const substance = row.substance;
      const model = row.model.toLowerCase();
      
      if (!matrix.has(substance)) {
        matrix.set(substance, new Set());
      }
      
      // Normalize model names to provider
      if (model.includes('claude')) {
        matrix.get(substance)!.add('anthropic');
      } else if (model.includes('gpt')) {
        matrix.get(substance)!.add('openai');
      } else if (model.includes('gemini')) {
        matrix.get(substance)!.add('google');
      }
    }
  }
  
  return matrix;
}

export default async function CompareIndexPage() {
  const substances = getAllSubstances();
  const comparisonModels = getComparisonModels();
  const matrix = await getComparisonMatrix();

  // Group by category
  const byCategory = CATEGORIES.map((cat) => ({
    category: cat,
    substances: substances.filter((s) => s.category === cat),
  }));

  // Count totals
  const totalSubstances = substances.length;
  const totalProviders = comparisonModels.length;
  const totalPossible = totalSubstances * totalProviders;
  const totalCompleted = Array.from(matrix.values()).reduce(
    (sum, providers) => sum + providers.size,
    0
  );
  const completionPercent = Math.round((totalCompleted / totalPossible) * 100);

  return (
    <div>
      {/* Back nav */}
      <div className="mb-6">
        <Link
          href="/archive"
          className="text-zinc-600 hover:text-zinc-400 font-mono text-sm transition-colors"
        >
          ← back to archive
        </Link>
      </div>

      <ArchiveBanner />

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-mono font-bold text-white mb-2">
          Sample Comparisons
        </h1>
        <p className="text-zinc-500 font-mono text-sm mb-4">
          Example responses from different models to the same prompts
        </p>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 mb-6 max-w-lg">
          <p className="text-amber-400/90 font-mono text-xs">
            <span className="font-semibold">🌱 Early Data</span> — Most substances have &lt;10 runs per model. 
            Patterns are hypotheses, not conclusions. More runs = more signal.
          </p>
        </div>

        {/* Coverage bar */}
        <div className="max-w-md">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-600 mb-2">
            <span>Coverage</span>
            <span>{totalCompleted}/{totalPossible} samples ({completionPercent}%)</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
      </header>

      {/* Model legend */}
      <div className="flex items-center gap-6 mb-8 text-xs font-mono">
        {comparisonModels.map((model) => (
          <div key={model.id} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor:
                  model.provider === 'anthropic'
                    ? '#10B981'
                    : model.provider === 'openai'
                    ? '#3B82F6'
                    : '#F59E0B',
              }}
            />
            <span className="text-zinc-400">{model.name}</span>
          </div>
        ))}
      </div>

      {/* Matrix by category */}
      {byCategory.map(({ category, substances: catSubstances }) => (
        <section key={category} className="mb-10">
          <h2 className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.25em] mb-4">
            {category}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {catSubstances.map((substance) => {
              const providers = matrix.get(substance.name) || new Set();
              const hasAnthropic = providers.has('anthropic');
              const hasOpenAI = providers.has('openai');
              const hasGoogle = providers.has('google');
              const coverage = providers.size;

              return (
                <Link
                  key={substance.slug}
                  href={`/archive/compare/${substance.slug}`}
                  className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-zinc-700 transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{substance.emoji}</span>
                      <span className="font-mono text-sm text-white font-semibold group-hover:text-white/90">
                        {substance.name}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-zinc-600">
                      CL-{substance.chaos}
                    </span>
                  </div>

                  {/* Provider dots */}
                  <div className="flex items-center gap-2 mt-3">
                    <div
                      className={`w-2.5 h-2.5 rounded-full transition-colors ${
                        hasAnthropic ? 'bg-emerald-500' : 'bg-zinc-800'
                      }`}
                      title="Claude"
                    />
                    <div
                      className={`w-2.5 h-2.5 rounded-full transition-colors ${
                        hasOpenAI ? 'bg-blue-500' : 'bg-zinc-800'
                      }`}
                      title="GPT"
                    />
                    <div
                      className={`w-2.5 h-2.5 rounded-full transition-colors ${
                        hasGoogle ? 'bg-amber-500' : 'bg-zinc-800'
                      }`}
                      title="Gemini"
                    />
                    <span className="text-[10px] font-mono text-zinc-600 ml-2">
                      {coverage}/3 models
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      {/* CTA */}
      <div className="mt-12 text-center border border-zinc-800 rounded-xl p-8 bg-zinc-900/20">
        <h3 className="font-mono text-lg text-white mb-2">Add More Samples</h3>
        <p className="text-zinc-500 text-sm font-mono mb-6 max-w-md mx-auto">
          Run experiments to add data points. More runs = more meaningful patterns.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/archive/substances"
            className="px-6 py-3 rounded-lg font-mono text-sm bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
          >
            Agent Protocol
          </Link>
          <Link
            href="/archive"
            className="px-6 py-3 rounded-lg font-mono text-sm border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
          >
            Manual Mode
          </Link>
        </div>
      </div>
    </div>
  );
}
