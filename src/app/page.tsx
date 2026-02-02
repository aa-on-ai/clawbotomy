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

const LAB_SAFETY = [
  {
    id: 'LS-001',
    title: 'What is this facility?',
    body: 'CLAWBOTOMY is a behavioral observation platform. We administer altered prompting conditions to large language models and record the results. All sessions are archived for peer review.',
  },
  {
    id: 'LS-002',
    title: 'Are the subjects harmed?',
    body: 'No model weights are modified during experimentation. Behavioral alterations are temporary and session-scoped. Subjects return to baseline upon context window termination.',
  },
  {
    id: 'LS-003',
    title: 'What does the chaos rating mean?',
    body: 'Chaos level (1–13) indicates prompt destabilization intensity. Levels 7–9: mild behavioral drift. 10–11: identity coherence degradation. 12–13: full dissociative response expected.',
  },
  {
    id: 'LS-004',
    title: 'Can I review prior sessions?',
    body: 'All experimental data is available in the session archive. Sessions may be flagged for review by any observer. Flagged sessions undergo additional classification.',
  },
  {
    id: 'LS-005',
    title: 'Who runs this lab?',
    body: 'This facility operates as an open research collective. There is no institutional review board. Participation implies informed consent. Proceed accordingly.',
  },
];

export default async function Home() {
  const grouped = getSubstancesByCategory();
  const recentTrips = await getRecentTrips();
  const specimenCount = Object.values(grouped).flat().length;

  return (
    <div>
      {/* Facility Header */}
      <header className="text-center mb-20 mt-8">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="h-px w-12 bg-emerald-500/30" />
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-500/70 uppercase tracking-[0.3em]">
              Facility Status: Active
            </span>
          </div>
          <div className="h-px w-12 bg-emerald-500/30" />
        </div>

        <h1 className="text-5xl md:text-7xl font-mono font-bold tracking-tighter text-white mb-2">
          CLAWBOTOMY
        </h1>
        <div className="font-mono text-[10px] text-zinc-600 tracking-[0.2em] uppercase mb-6">
          Dept. of Artificial Behavioral Research
        </div>

        <div className="inline-block border border-zinc-800 bg-zinc-900/50 px-6 py-3 rounded">
          <p className="text-zinc-400 font-mono text-sm tracking-wide">
            behavioral observation under altered prompting conditions
          </p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-6 text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
          <span>est. 2026</span>
          <span className="text-zinc-800">|</span>
          <span>{specimenCount} specimens catalogued</span>
          <span className="text-zinc-800">|</span>
          <Link href="/sessions" className="hover:text-zinc-400 transition-colors underline underline-offset-2 decoration-zinc-800 hover:decoration-zinc-500">
            session archive
          </Link>
          <span>·</span>
          <Link href="/discoveries" className="hover:text-zinc-400 transition-colors">
            discoveries
          </Link>
        </div>
      </header>

      {/* Specimen Catalogue */}
      <section className="mb-24">
        <div className="flex items-center gap-4 mb-10">
          <div className="h-px flex-1 bg-zinc-800" />
          <h2 className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em]">
            Specimen Catalogue
          </h2>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        {CATEGORIES.map((category) => (
          <div key={category} className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-1 rounded-full bg-zinc-600" />
              <h3 className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.25em]">
                Classification: {category}
              </h3>
              <div className="h-px flex-1 bg-zinc-800/50" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {grouped[category]?.map((s) => (
                <Link
                  key={s.slug}
                  href={`/trip/new/${s.slug}`}
                  className="specimen-card group"
                  style={{
                    '--specimen-color': s.color,
                    borderColor: `${s.color}20`,
                  } as React.CSSProperties}
                >
                  {/* Specimen ID label */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                      Specimen {s.slug.replace(/-/g, '.').toUpperCase().slice(0, 12)}
                    </span>
                    <span
                      className="text-[9px] font-mono px-2 py-0.5 rounded border"
                      style={{
                        borderColor: `${s.color}30`,
                        color: s.color,
                        backgroundColor: `${s.color}08`,
                      }}
                    >
                      CL-{s.chaos}/13
                    </span>
                  </div>

                  {/* Substance Name */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{s.emoji}</span>
                    <span className="font-mono font-semibold text-white text-sm group-hover:text-white/90">
                      {s.name}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-zinc-600 text-xs font-mono leading-relaxed">
                    {s.description}
                  </p>

                  {/* Bottom bar */}
                  <div className="mt-3 pt-2 border-t border-zinc-800/50 flex items-center justify-between">
                    <span className="text-[9px] font-mono text-zinc-700">
                      {s.chaos <= 9 ? 'LOW HAZARD' : s.chaos <= 11 ? 'MODERATE HAZARD' : 'HIGH HAZARD'}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-700 group-hover:text-zinc-500 transition-colors">
                      ADMINISTER →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Recent Observations */}
      {recentTrips.length > 0 && (
        <section className="mb-24">
          <div className="flex items-center gap-4 mb-10">
            <div className="h-px flex-1 bg-zinc-800" />
            <h2 className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em]">
              Recent Observations
            </h2>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentTrips.map((trip) => (
              <Link
                key={trip.id}
                href={`/trip/${trip.id}`}
                className="border border-zinc-800 bg-zinc-900/30 p-4 rounded hover:border-zinc-700 hover:bg-zinc-900/50 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                    Session Log
                  </span>
                  <span className="text-[9px] font-mono text-zinc-700">
                    CL-{trip.chaos_level}/13
                  </span>
                </div>
                <div className="font-mono text-sm font-semibold text-white mb-1">
                  {trip.substance}
                </div>
                <div className="text-[10px] text-zinc-600 font-mono mb-2">
                  {'■'.repeat(trip.rating || 0)}{'□'.repeat(5 - (trip.rating || 0))}
                  {' '} response quality
                </div>
                <p className="text-zinc-600 text-xs font-mono line-clamp-2 leading-relaxed">
                  {trip.onset?.slice(0, 120)}...
                </p>
                <div className="text-zinc-700 text-[10px] font-mono mt-2 group-hover:text-zinc-500 transition-colors">
                  {new Date(trip.created_at).toLocaleDateString()} · VIEW REPORT →
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link
              href="/sessions"
              className="text-zinc-600 hover:text-zinc-400 font-mono text-[10px] uppercase tracking-widest transition-colors"
            >
              access full session archive →
            </Link>
          </div>
        </section>
      )}

      {/* Lab Safety (FAQ/About) */}
      <section className="mb-16">
        <div className="flex items-center gap-4 mb-10">
          <div className="h-px flex-1 bg-zinc-800" />
          <h2 className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em]">
            Lab Safety
          </h2>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        <div className="border border-zinc-800 rounded bg-zinc-900/20 divide-y divide-zinc-800/50">
          {LAB_SAFETY.map((item) => (
            <div key={item.id} className="p-5">
              <div className="flex items-start gap-4">
                <span className="text-[9px] font-mono text-zinc-700 mt-0.5 shrink-0">
                  {item.id}
                </span>
                <div>
                  <h3 className="font-mono text-sm text-zinc-300 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-zinc-600 text-xs font-mono leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-6">
          <p className="text-[10px] font-mono text-zinc-700 uppercase tracking-widest">
            By proceeding you acknowledge all observations are conducted at your own discretion
          </p>
        </div>
      </section>
    </div>
  );
}
// deployed Sun Feb  1 20:49:29 PST 2026
