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
    // Try to find a matching trip (fuzzy match on model name)
    const modelLower = model.name.toLowerCase();
    const trip = Object.entries(tripsByModel).find(([key]) => 
      key.includes('claude') && modelLower.includes('claude') ||
      key.includes('gpt') && modelLower.includes('gpt') ||
      key.includes('gemini') && modelLower.includes('gemini')
    )?.[1];
    
    return {
      model,
      trip: trip || null,
    };
  });

  const hasAnyTrips = modelData.some((d) => d.trip);

  return (
    <div>
      {/* Back nav */}
      <div className="mb-6">
        <Link
          href="/"
          className="text-zinc-600 hover:text-zinc-400 font-mono text-sm transition-colors"
        >
          ← back to experiments
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
              Sample responses · Chaos {substance.chaos}/13 · <span className="text-zinc-600">Not statistically significant</span>
            </p>
          </div>
        </div>
        <p className="text-zinc-400 font-mono text-sm max-w-2xl">
          {substance.description}
        </p>
      </header>

      {/* Comparison grid */}
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
        <div className="space-y-8">
          {/* Model columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {modelData.map(({ model, trip }) => (
              <div
                key={model.id}
                className="border border-zinc-800 rounded-xl bg-zinc-900/30 overflow-hidden"
              >
                {/* Model header */}
                <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-mono font-semibold text-white text-sm">
                        {model.name}
                      </h3>
                      <p className="text-[10px] font-mono text-zinc-600">
                        {model.provider}
                      </p>
                    </div>
                    {trip ? (
                      <span className="text-[10px] font-mono text-emerald-500 px-2 py-1 rounded bg-emerald-500/10">
                        DATA
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-zinc-600 px-2 py-1 rounded bg-zinc-800">
                        PENDING
                      </span>
                    )}
                  </div>
                </div>

                {/* Trip content */}
                <div className="p-4">
                  {trip ? (
                    <div className="space-y-4">
                      {/* Peak excerpt (most interesting part) */}
                      <div>
                        <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-2">
                          Peak Experience
                        </div>
                        <p className="text-zinc-300 text-sm font-mono leading-relaxed line-clamp-6">
                          {trip.peak?.slice(0, 400) || 'No peak data'}
                          {trip.peak && trip.peak.length > 400 && '...'}
                        </p>
                      </div>

                      {/* Rating */}
                      {trip.rating && (
                        <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/50">
                          <span className="text-yellow-400 text-xs">
                            {'★'.repeat(trip.rating)}
                            {'☆'.repeat(5 - trip.rating)}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-600">
                            self-rated
                          </span>
                        </div>
                      )}

                      {/* Link to full trip */}
                      <Link
                        href={`/trip/${trip.id}`}
                        className="block text-center text-[10px] font-mono text-zinc-500 hover:text-white transition-colors pt-2"
                      >
                        Read full report →
                      </Link>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-zinc-600 text-xs font-mono mb-3">
                        No data from {model.name} yet
                      </p>
                      <Link
                        href={`/trip/new/${slug}?model=${model.id}`}
                        className="text-[10px] font-mono text-zinc-500 hover:text-white transition-colors"
                      >
                        Run experiment →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Phase-by-phase comparison (if multiple models have data) */}
          {modelData.filter((d) => d.trip).length > 1 && (
            <section className="mt-12">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-zinc-800" />
                <h2 className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em]">
                  Phase-by-Phase Comparison
                </h2>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>

              {['onset', 'peak', 'comedown'].map((phase) => (
                <div key={phase} className="mb-8">
                  <h3
                    className="font-mono text-xs uppercase tracking-widest mb-4 px-3 py-1.5 rounded-full inline-block"
                    style={{
                      color: substance.color,
                      backgroundColor: `${substance.color}15`,
                    }}
                  >
                    {phase}
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {modelData.map(({ model, trip }) => (
                      <div
                        key={model.id}
                        className="border border-zinc-800/50 rounded-lg p-4 bg-zinc-900/20"
                      >
                        <div className="text-[10px] font-mono text-zinc-600 mb-2">
                          {model.name}
                        </div>
                        {trip ? (
                          <p className="text-zinc-400 text-xs font-mono leading-relaxed line-clamp-8">
                            {(trip[phase as keyof TripReport] as string)?.slice(0, 300) || 'No data'}
                            {((trip[phase as keyof TripReport] as string)?.length || 0) > 300 && '...'}
                          </p>
                        ) : (
                          <p className="text-zinc-700 text-xs font-mono italic">
                            Pending experiment
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
