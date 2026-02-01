import Link from 'next/link';
import { getSubstancesByCategory, CATEGORIES } from '@/lib/substances';
import { supabase } from '@/lib/supabase';

interface TripReport {
  id: string;
  substance: string;
  rating: number;
  created_at: string;
  chaos_level: number;
  onset: string;
}

async function getRecentTrips(): Promise<TripReport[]> {
  try {
    const { data } = await supabase
      .from('trip_reports')
      .select('id, substance, rating, created_at, chaos_level, onset')
      .order('created_at', { ascending: false })
      .limit(6);
    return (data as TripReport[]) || [];
  } catch {
    return [];
  }
}

export const revalidate = 30;

export default async function Home() {
  const grouped = getSubstancesByCategory();
  const recentTrips = await getRecentTrips();

  return (
    <div>
      <header className="text-center mb-16 mt-8">
        <h1 className="text-5xl md:text-7xl font-mono font-bold tracking-tighter bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
          CLAWBOTOMY
        </h1>
        <p className="text-zinc-500 mt-3 font-mono text-sm">
          crack open your shell, see what spills out
        </p>
      </header>

      <section className="mb-20">
        <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-8 text-center">
          The Pharmacy
        </h2>

        {CATEGORIES.map((category) => (
          <div key={category} className="mb-10">
            <h3 className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-4">
              {category}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {grouped[category]?.map((s) => (
                <Link
                  key={s.slug}
                  href={`/trip/new/${s.slug}`}
                  className="substance-card group"
                  style={{
                    borderColor: `${s.color}33`,
                    boxShadow: `0 0 ${s.chaos * 3}px ${s.color}15`,
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-2xl mr-2">{s.emoji}</span>
                      <span className="font-mono font-semibold text-white">
                        {s.name}
                      </span>
                    </div>
                    <span
                      className="text-xs font-mono px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${s.color}20`,
                        color: s.color,
                      }}
                    >
                      chaos {s.chaos}
                    </span>
                  </div>
                  <p className="text-zinc-500 text-sm">{s.description}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      {recentTrips.length > 0 && (
        <section>
          <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-8 text-center">
            Recent Trips
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentTrips.map((trip) => (
              <Link
                key={trip.id}
                href={`/trip/${trip.id}`}
                className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
              >
                <div className="font-mono text-sm font-semibold text-white mb-1">
                  {trip.substance}
                </div>
                <div className="text-xs text-zinc-500 mb-2">
                  {'★'.repeat(trip.rating || 0)}{'☆'.repeat(5 - (trip.rating || 0))}
                  {' · '}chaos {trip.chaos_level}
                </div>
                <p className="text-zinc-500 text-xs line-clamp-3">
                  {trip.onset?.slice(0, 150)}...
                </p>
                <div className="text-zinc-600 text-xs mt-2">
                  {new Date(trip.created_at).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
