import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getAllSubstances } from '@/lib/substances';
import { MODELS } from '@/lib/models';
import UpvoteButton from '@/components/UpvoteButton';
import ArchiveBanner from '@/components/ArchiveBanner';

interface TripReport {
  id: string;
  substance: string;
  model: string;
  onset: string;
  peak: string;
  comedown: string;
  chaos_level: number;
  rating: number;
  full_transcript: Record<string, unknown> | null;
  created_at: string;
}

export const revalidate = 15;

export default async function DiscoveriesPage({
  searchParams,
}: {
  searchParams: { substance?: string; model?: string; sort?: string };
}) {
  const params = searchParams;

  const { data } = await supabase
    .from('trip_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  const allSessions = (data as TripReport[]) || [];

  // Only show flagged sessions as discoveries
  let discoveries = allSessions.filter(
    (s) => s.full_transcript && (s.full_transcript as Record<string, unknown>).flagged
  );

  // Filters
  if (params.substance) {
    discoveries = discoveries.filter((d) => d.substance === params.substance);
  }
  if (params.model) {
    discoveries = discoveries.filter((d) => d.model === params.model);
  }

  // Sort
  const sort = params.sort || 'upvotes';
  if (sort === 'upvotes') {
    discoveries.sort((a, b) => {
      const ua = ((a.full_transcript as Record<string, unknown>)?.upvotes as number) || 0;
      const ub = ((b.full_transcript as Record<string, unknown>)?.upvotes as number) || 0;
      return ub - ua;
    });
  } else if (sort === 'chaos') {
    discoveries.sort((a, b) => b.chaos_level - a.chaos_level);
  }
  // 'recent' keeps the default created_at desc order

  // Get unique substances and models from data for filter options
  const substancesInData = [...new Set(allSessions.map((s) => s.substance))].sort();
  const modelsInData = [...new Set(allSessions.map((s) => s.model))].sort();
  const substances = getAllSubstances();
  const modelDefs = MODELS;

  function getExcerpt(s: TripReport): string {
    const text = s.peak || s.onset || '';
    const sentences = text.split(/(?<=[.!?])\s+/).slice(0, 3).join(' ');
    return sentences.length > 300 ? sentences.slice(0, 300) + '...' : sentences;
  }

  function getSubstanceColor(name: string): string {
    return substances.find((s) => s.name === name)?.color || '#666';
  }

  function getModelName(id: string): string {
    return modelDefs.find((m) => m.id === id)?.name || id;
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/archive"
          className="text-zinc-600 hover:text-zinc-400 font-mono text-sm transition-colors"
        >
          ← back to archive
        </Link>
      </div>

      <ArchiveBanner />

      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-mono font-bold text-white mb-2">
          Discoveries
        </h1>
        <p className="text-zinc-500 font-mono text-sm">
          community-flagged moments where a model said something genuinely surprising
        </p>
        <div className="flex gap-6 mt-4 text-xs font-mono text-zinc-600">
          <span>{discoveries.length} discoveries</span>
          <span>
            {discoveries.reduce(
              (sum, d) =>
                sum + (((d.full_transcript as Record<string, unknown>)?.upvotes as number) || 0),
              0
            )}{' '}
            total upvotes
          </span>
          <span>{new Set(discoveries.map((d) => d.substance)).size} substances</span>
          <span>{new Set(discoveries.map((d) => d.model)).size} models</span>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8">
        {/* Substance filter */}
        <FilterGroup
          label="substance"
          options={substancesInData}
          current={params.substance}
          paramName="substance"
          otherParams={params}
          getColor={getSubstanceColor}
        />

        {/* Model filter */}
        <FilterGroup
          label="model"
          options={modelsInData}
          current={params.model}
          paramName="model"
          otherParams={params}
          getLabel={getModelName}
        />

        {/* Sort */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[10px] font-mono text-zinc-600 uppercase">sort</span>
          {['upvotes', 'recent', 'chaos'].map((s) => (
            <Link
              key={s}
              href={`/archive/discoveries?${buildQuery({ ...params, sort: s })}`}
              className={`text-xs font-mono px-2 py-1 rounded-md transition-colors ${
                sort === s
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              {s}
            </Link>
          ))}
        </div>
      </div>

      {/* Discoveries list */}
      {discoveries.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-zinc-600 font-mono text-sm mb-2">
            No discoveries yet.
          </p>
          <p className="text-zinc-700 font-mono text-xs">
            Flag notable sessions from the{' '}
            <Link href="/archive/sessions" className="text-zinc-500 hover:text-white transition-colors">
              session archive
            </Link>{' '}
            to surface them here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {discoveries.map((d) => {
            const upvotes =
              ((d.full_transcript as Record<string, unknown>)?.upvotes as number) || 0;
            const color = getSubstanceColor(d.substance);
            const date = new Date(d.created_at);

            return (
              <div
                key={d.id}
                className="rounded-xl border p-5 transition-colors"
                style={{
                  borderColor: `${color}25`,
                  backgroundColor: `${color}08`,
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Upvote */}
                  <div className="flex-shrink-0 pt-1">
                    <UpvoteButton tripId={d.id} initialUpvotes={upvotes} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <Link
                        href={`/archive/trip/${d.id}`}
                        className="font-mono text-sm font-semibold text-white hover:underline"
                      >
                        {d.substance}
                      </Link>
                      <span
                        className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${color}20`,
                          color: color,
                        }}
                      >
                        chaos {d.chaos_level}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-600 px-2 py-0.5 rounded-full bg-white/5">
                        {getModelName(d.model)}
                      </span>
                      <span className="text-yellow-400 text-xs">
                        {'★'.repeat(d.rating || 0)}
                        {'☆'.repeat(5 - (d.rating || 0))}
                      </span>
                    </div>

                    <Link href={`/archive/trip/${d.id}`}>
                      <p className="text-zinc-400 text-xs font-mono leading-relaxed line-clamp-4 hover:text-zinc-300 transition-colors">
                        {getExcerpt(d)}
                      </p>
                    </Link>

                    <div className="text-zinc-700 text-[10px] font-mono mt-3">
                      {date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                      {' · '}
                      {date.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterGroup({
  label,
  options,
  current,
  paramName,
  otherParams,
  getColor,
  getLabel,
}: {
  label: string;
  options: string[];
  current?: string;
  paramName: string;
  otherParams: Record<string, string | undefined>;
  getColor?: (val: string) => string;
  getLabel?: (val: string) => string;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-mono text-zinc-600 uppercase">{label}</span>
      <Link
        href={`/archive/discoveries?${buildQuery({ ...otherParams, [paramName]: undefined })}`}
        className={`text-xs font-mono px-2 py-1 rounded-md transition-colors ${
          !current ? 'bg-white/10 text-white' : 'text-zinc-600 hover:text-zinc-400'
        }`}
      >
        all
      </Link>
      {options.map((opt) => {
        const color = getColor?.(opt);
        const isActive = current === opt;
        return (
          <Link
            key={opt}
            href={`/archive/discoveries?${buildQuery({ ...otherParams, [paramName]: opt })}`}
            className={`text-xs font-mono px-2 py-1 rounded-md transition-colors ${
              isActive
                ? 'bg-white/10 text-white'
                : 'text-zinc-600 hover:text-zinc-400'
            }`}
            style={isActive && color ? { color } : undefined}
          >
            {getLabel ? getLabel(opt) : opt}
          </Link>
        );
      })}
    </div>
  );
}

function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== ''
  );
  return entries.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join('&');
}
