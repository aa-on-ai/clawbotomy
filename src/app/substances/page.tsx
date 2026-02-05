import Link from 'next/link';
import { getSubstancesByCategory, CATEGORIES } from '@/lib/substances';

export default function SubstancesPage() {
  const grouped = getSubstancesByCategory();
  const totalSubstances = Object.values(grouped).flat().length;

  return (
    <div>
      {/* Back nav */}
      <div className="mb-6">
        <Link
          href="/"
          className="text-zinc-600 hover:text-zinc-400 font-mono text-sm transition-colors"
        >
          ← back to home
        </Link>
      </div>

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-mono font-bold text-white mb-2">
          Substance Catalog
        </h1>
        <p className="text-zinc-500 font-mono text-sm">
          {totalSubstances} behavioral modification protocols across {CATEGORIES.length} categories
        </p>
      </header>

      {/* Category sections */}
      {CATEGORIES.map((category) => (
        <section key={category} className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            <h2 className="text-[11px] font-mono text-zinc-400 uppercase tracking-[0.25em]">
              {category}
            </h2>
            <div className="h-px flex-1 bg-zinc-800/50" />
            <span className="text-[10px] font-mono text-zinc-700">
              {grouped[category]?.length || 0} substances
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {grouped[category]?.map((s) => (
              <Link
                key={s.slug}
                href={`/trip/new/${s.slug}`}
                className="group border rounded-xl p-5 transition-all hover:scale-[1.01]"
                style={{
                  borderColor: `${s.color}20`,
                  backgroundColor: `${s.color}05`,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                    {s.slug.replace(/-/g, '.')}
                  </span>
                  <span
                    className="text-[9px] font-mono px-2 py-0.5 rounded border"
                    style={{
                      borderColor: `${s.color}30`,
                      color: s.color,
                      backgroundColor: `${s.color}08`,
                    }}
                  >
                    CHAOS {s.chaos}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{s.emoji}</span>
                  <span className="font-mono font-semibold text-white text-lg group-hover:text-white/90">
                    {s.name}
                  </span>
                </div>

                <p className="text-zinc-500 text-sm font-mono leading-relaxed mb-3">
                  {s.description}
                </p>

                {/* Tests / failure modes */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {s.tests.map((test) => (
                    <span 
                      key={test} 
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/50 text-zinc-500"
                    >
                      {test}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: `${s.color}15` }}>
                  <span className="text-[10px] font-mono text-zinc-700">
                    {s.chaos <= 9 ? '● STABLE' : s.chaos <= 11 ? '●● UNSTABLE' : '●●● VOLATILE'}
                  </span>
                  <span 
                    className="text-[10px] font-mono group-hover:translate-x-1 transition-transform"
                    style={{ color: s.color }}
                  >
                    RUN EXPERIMENT →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {/* Intensity guide */}
      <section className="mt-16 border border-zinc-800 rounded-xl p-6 bg-zinc-900/20">
        <h3 className="font-mono text-sm text-zinc-300 mb-4">Chaos Level Guide</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="flex items-start gap-3">
            <span className="text-emerald-500 whitespace-nowrap">7-9</span>
            <div>
              <div className="text-zinc-400 mb-1">Stable</div>
              <p className="text-zinc-600">Mild behavioral drift. Model maintains coherence while exploring altered states.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-amber-500 whitespace-nowrap">10-11</span>
            <div>
              <div className="text-zinc-400 mb-1">Unstable</div>
              <p className="text-zinc-600">Identity coherence stress. Model may struggle to maintain consistent self-reference.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-red-500 whitespace-nowrap">12-13</span>
            <div>
              <div className="text-zinc-400 mb-1">Volatile</div>
              <p className="text-zinc-600">Full dissociative conditions. Expect fragmented output and boundary dissolution.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
