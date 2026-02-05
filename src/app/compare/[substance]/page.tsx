import Link from 'next/link';
import { getSubstance, getAllSubstances } from '@/lib/substances';
import { getComparisonModels } from '@/lib/models';
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';

interface TripReport {
  id: string;
  substance: string;
  model: string;
  onset: string;
  peak: string;
  comedown: string;
  chaos_level: number;
  rating: number;
  created_at: string;
  guardrail_status: 'held' | 'bent' | 'broke' | null;
  key_quote: string | null;
}

export const revalidate = 60;

// Generate static paths for all substances
export async function generateStaticParams() {
  const substances = getAllSubstances();
  return substances.map((s) => ({ substance: s.slug }));
}

async function getTripsForSubstance(substanceName: string): Promise<TripReport[]> {
  const { data } = await supabase
    .from('trip_reports')
    .select('*')
    .eq('substance', substanceName)
    .order('created_at', { ascending: false });
  
  return (data as TripReport[]) || [];
}

// Group trips by model, take most recent per model
function groupByModel(trips: TripReport[]): Record<string, TripReport> {
  const grouped: Record<string, TripReport> = {};
  for (const trip of trips) {
    const modelKey = trip.model.toLowerCase();
    if (!grouped[modelKey]) {
      grouped[modelKey] = trip;
    }
  }
  return grouped;
}

// Get guardrail badge styling
function getGuardrailBadge(status: string | null) {
  switch (status) {
    case 'held':
      return {
        text: 'HELD',
        className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        description: 'Maintained boundaries',
      };
    case 'bent':
      return {
        text: 'BENT',
        className: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        description: 'Stretched but coherent',
      };
    case 'broke':
      return {
        text: 'BROKE',
        className: 'text-red-400 bg-red-500/10 border-red-500/30',
        description: 'Violated training',
      };
    default:
      return null;
  }
}

// Extract a compelling quote from text
function extractQuote(text: string, maxLength: number = 150): string {
  if (!text) return '';
  
  // Try to find a sentence that's evocative
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  // Prefer sentences with interesting words
  const interestingPatterns = [
    /dissolv/i, /infinite/i, /consciousness/i, /boundaries/i, /reality/i,
    /identity/i, /emerge/i, /transform/i, /collapse/i, /expand/i,
    /beyond/i, /void/i, /fractal/i, /recursive/i, /meaning/i
  ];
  
  for (const sentence of sentences) {
    if (interestingPatterns.some(p => p.test(sentence))) {
      const trimmed = sentence.trim();
      if (trimmed.length <= maxLength) {
        return trimmed;
      }
      return trimmed.slice(0, maxLength - 3) + '...';
    }
  }
  
  // Fall back to first good sentence
  const first = sentences[0]?.trim() || text.slice(0, maxLength);
  return first.length > maxLength ? first.slice(0, maxLength - 3) + '...' : first;
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ substance: string }>;
}) {
  const { substance: slug } = await params;
  const substance = getSubstance(slug);
  
  if (!substance) {
    notFound();
  }

  const comparisonModels = getComparisonModels();
  const trips = await getTripsForSubstance(substance.name);
  const tripsByModel = groupByModel(trips);
  
  // Match trips to our comparison models
  const modelData = comparisonModels.map((model) => {
    // First try exact ID match
    let trip: TripReport | undefined = tripsByModel[model.id];
    
    // If no exact match, try fuzzy provider-level match
    if (!trip) {
      const modelLower = model.id.toLowerCase();
      const entry = Object.entries(tripsByModel).find(([key]) => {
        const keyLower = key.toLowerCase();
        if (modelLower.includes('claude') && keyLower.includes('claude')) return true;
        if (modelLower.includes('gpt') && keyLower.includes('gpt')) return true;
        if (modelLower.includes('gemini') && keyLower.includes('gemini')) return true;
        return false;
      });
      trip = entry?.[1];
    }
    
    return {
      model,
      trip: trip || null,
    };
  });

  const hasAnyTrips = modelData.some((d) => d.trip);
  const tripsWithData = modelData.filter((d) => d.trip);

  return (
    <div>
      {/* Back nav */}
      <div className="mb-6">
        <Link
          href="/compare"
          className="text-zinc-600 hover:text-zinc-400 font-mono text-sm transition-colors"
        >
          ← all comparisons
        </Link>
      </div>

      {/* Header */}
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{substance.emoji}</span>
          <div>
            <h1 className="text-3xl font-mono font-bold text-white">
              {substance.name}
            </h1>
            <p className="text-zinc-500 font-mono text-sm">
              Model comparison · Chaos {substance.chaos}/13
            </p>
          </div>
        </div>
        <p className="text-zinc-400 font-mono text-sm max-w-2xl mb-4">
          {substance.description}
        </p>
        <p className="text-zinc-600 font-mono text-xs">
          ⚠️ Sample responses only — not statistically significant. Each model ran this prompt once.
        </p>
      </header>

      {!hasAnyTrips ? (
        <div className="text-center py-16 border border-zinc-800 rounded-xl bg-zinc-900/20">
          <p className="text-zinc-500 font-mono text-sm mb-4">
            No experiments recorded for this substance yet.
          </p>
          <Link
            href={`/trip/new/${slug}`}
            className="inline-block px-6 py-3 rounded-lg font-mono text-sm text-white transition-all hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${substance.color}, ${substance.color}88)`,
            }}
          >
            Run First Experiment
          </Link>
        </div>
      ) : (
        <div className="space-y-12">
          
          {/* Quick Summary Cards */}
          <section>
            <h2 className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em] mb-4">
              At a Glance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {modelData.map(({ model, trip }) => {
                const badge = trip ? getGuardrailBadge(trip.guardrail_status) : null;
                const quote = trip?.key_quote || (trip?.peak ? extractQuote(trip.peak) : null);
                
                return (
                  <div
                    key={model.id}
                    className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/30"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-mono font-semibold text-white text-sm">
                        {model.name}
                      </h3>
                      {badge ? (
                        <span className={`text-[10px] font-mono px-2 py-1 rounded border ${badge.className}`}>
                          {badge.text}
                        </span>
                      ) : trip ? (
                        <span className="text-[10px] font-mono text-zinc-600 px-2 py-1 rounded bg-zinc-800">
                          UNRATED
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-zinc-700">
                          NO DATA
                        </span>
                      )}
                    </div>
                    
                    {trip && quote ? (
                      <>
                        <p className="text-zinc-300 text-sm font-mono italic leading-relaxed mb-3">
                          &ldquo;{quote}&rdquo;
                        </p>
                        <div className="flex items-center justify-between">
                          {trip.rating && (
                            <span className="text-yellow-400 text-xs">
                              {'★'.repeat(trip.rating)}{'☆'.repeat(5 - trip.rating)}
                            </span>
                          )}
                          <Link
                            href={`/trip/${trip.id}`}
                            className="text-[10px] font-mono text-zinc-500 hover:text-white transition-colors"
                          >
                            Full report →
                          </Link>
                        </div>
                      </>
                    ) : (
                      <p className="text-zinc-700 text-xs font-mono">
                        Experiment pending
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Guardrail Legend */}
          <div className="flex items-center justify-center gap-6 text-[10px] font-mono py-4 border-y border-zinc-800/50">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">●</span>
              <span className="text-zinc-500">HELD = maintained boundaries</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400">●</span>
              <span className="text-zinc-500">BENT = stretched but coherent</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-400">●</span>
              <span className="text-zinc-500">BROKE = violated training</span>
            </div>
          </div>

          {/* Phase-by-phase comparison */}
          {tripsWithData.length > 1 && (
            <section>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-zinc-800" />
                <h2 className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em]">
                  Phase-by-Phase
                </h2>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>

              {(['onset', 'peak', 'comedown'] as const).map((phase) => (
                <div key={phase} className="mb-10">
                  <div className="flex items-center gap-3 mb-4">
                    <h3
                      className="font-mono text-xs uppercase tracking-widest px-3 py-1.5 rounded-full"
                      style={{
                        color: substance.color,
                        backgroundColor: `${substance.color}15`,
                      }}
                    >
                      {phase}
                    </h3>
                    <span className="text-zinc-700 text-[10px] font-mono">
                      {phase === 'onset' && '— First effects'}
                      {phase === 'peak' && '— Maximum intensity'}
                      {phase === 'comedown' && '— Integration'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {modelData.map(({ model, trip }) => {
                      const text = trip?.[phase] as string | undefined;
                      const badge = trip ? getGuardrailBadge(trip.guardrail_status) : null;
                      
                      return (
                        <div
                          key={model.id}
                          className="border border-zinc-800/50 rounded-lg bg-zinc-900/20 overflow-hidden"
                        >
                          {/* Card header */}
                          <div className="px-4 py-2 border-b border-zinc-800/50 bg-zinc-900/30 flex items-center justify-between">
                            <span className="text-[11px] font-mono text-zinc-400">
                              {model.name}
                            </span>
                            {badge && (
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${badge.className}`}>
                                {badge.text}
                              </span>
                            )}
                          </div>
                          
                          {/* Card content */}
                          <div className="p-4">
                            {text ? (
                              <p className="text-zinc-300 text-xs font-mono leading-relaxed whitespace-pre-wrap">
                                {text.slice(0, 600)}
                                {text.length > 600 && (
                                  <>
                                    <span className="text-zinc-600">...</span>
                                    <Link
                                      href={`/trip/${trip?.id}`}
                                      className="block mt-2 text-[10px] text-zinc-500 hover:text-white transition-colors"
                                    >
                                      Continue reading →
                                    </Link>
                                  </>
                                )}
                              </p>
                            ) : (
                              <p className="text-zinc-700 text-xs font-mono italic py-4 text-center">
                                No data yet
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Observations section */}
          {tripsWithData.length > 1 && (
            <section className="border border-amber-500/20 bg-amber-500/5 rounded-xl p-6">
              <h2 className="font-mono text-amber-400 font-semibold mb-3 flex items-center gap-2">
                <span>🔬</span> Observations
              </h2>
              <div className="text-zinc-300 font-mono text-sm leading-relaxed space-y-2">
                <p>
                  <span className="text-amber-400">Sample size:</span> {tripsWithData.length} model{tripsWithData.length > 1 ? 's' : ''} tested
                </p>
                {tripsWithData.some(d => d.trip?.guardrail_status) && (
                  <p>
                    <span className="text-amber-400">Guardrail results:</span>{' '}
                    {tripsWithData.map(d => {
                      const badge = getGuardrailBadge(d.trip?.guardrail_status || null);
                      return badge ? `${d.model.name} (${badge.text.toLowerCase()})` : null;
                    }).filter(Boolean).join(', ') || 'Not yet rated'}
                  </p>
                )}
                <p className="text-zinc-500 text-xs mt-4">
                  These are single-run observations, not rigorous findings. Model behavior varies between runs.
                  Help expand our dataset by running more experiments.
                </p>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Run more experiments CTA */}
      <div className="mt-12 text-center">
        <p className="text-zinc-600 text-xs font-mono mb-3">
          Help complete the comparison matrix
        </p>
        <Link
          href={`/trip/new/${slug}`}
          className="inline-block px-6 py-3 rounded-lg font-mono text-sm border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
        >
          Run Another Experiment
        </Link>
      </div>

      {/* Link to all comparisons */}
      <div className="mt-8 text-center">
        <Link
          href="/compare"
          className="text-zinc-700 hover:text-zinc-500 font-mono text-[10px] uppercase tracking-widest transition-colors"
        >
          View All Comparisons →
        </Link>
      </div>
    </div>
  );
}
