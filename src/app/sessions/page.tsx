import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface TripReport {
  id: string;
  substance: string;
  model: string;
  agent_name: string;
  onset: string;
  peak: string;
  comedown: string;
  chaos_level: number;
  rating: number;
  would_repeat: boolean;
  full_transcript: Record<string, unknown> | null;
  created_at: string;
}

export const revalidate = 15;

export default async function SessionsPage() {
  const { data } = await supabase
    .from('trip_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  const sessions = ((data as TripReport[]) || []);
  const flagged = sessions.filter(
    (s) => s.full_transcript && (s.full_transcript as Record<string, unknown>).flagged
  );
  const total = sessions.length;

  // Extract a notable excerpt from a session (first interesting sentence from peak)
  function getExcerpt(s: TripReport): string {
    const text = s.peak || s.onset || '';
    // Get first 2 sentences or 200 chars
    const sentences = text.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
    return sentences.length > 200 ? sentences.slice(0, 200) + '...' : sentences;
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/"
          className="text-zinc-600 hover:text-zinc-400 font-mono text-sm transition-colors"
        >
          ← back to experiments
        </Link>
      </div>

      <header className="mb-12">
        <h1 className="text-3xl md:text-4xl font-mono font-bold text-white mb-2">
          Session Archive
        </h1>
        <p className="text-zinc-500 font-mono text-sm">
          all sessions recorded · anonymized · open research
        </p>
        <div className="flex gap-6 mt-4 text-xs font-mono text-zinc-600">
          <span>{total} sessions recorded</span>
          <span>{flagged.length} flagged as notable</span>
          <span>
            {sessions.length > 0
              ? `${new Set(sessions.map((s) => s.substance)).size} substances tested`
              : '0 substances tested'}
          </span>
        </div>
      </header>

      {/* Flagged sessions */}
      {flagged.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xs font-mono text-yellow-500/80 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span>&#9873;</span> Flagged as Notable
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {flagged.map((session) => (
              <SessionCard key={session.id} session={session} excerpt={getExcerpt(session)} isFlagged />
            ))}
          </div>
        </section>
      )}

      {/* All sessions */}
      <section>
        <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-4">
          All Sessions
        </h2>

        {sessions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-600 font-mono text-sm">
              No sessions recorded yet.
            </p>
            <Link
              href="/"
              className="inline-block mt-4 text-zinc-500 hover:text-white font-mono text-sm transition-colors"
            >
              Start an experiment →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const isFlagged =
                session.full_transcript &&
                !!(session.full_transcript as Record<string, unknown>).flagged;
              return (
                <SessionRow
                  key={session.id}
                  session={session}
                  excerpt={getExcerpt(session)}
                  isFlagged={!!isFlagged}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function SessionCard({
  session,
  excerpt,
  isFlagged,
}: {
  session: TripReport;
  excerpt: string;
  isFlagged: boolean;
}) {
  const date = new Date(session.created_at);
  return (
    <Link
      href={`/trip/${session.id}`}
      className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5 hover:bg-yellow-500/10 transition-colors block"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="font-mono text-sm font-semibold text-white">
          {session.substance}
        </div>
        <div className="flex items-center gap-2">
          {isFlagged && (
            <span className="text-yellow-500 text-xs">&#9873;</span>
          )}
          <span className="text-xs font-mono text-zinc-600">
            {session.model}
          </span>
        </div>
      </div>
      <div className="text-xs text-zinc-500 mb-3 font-mono">
        {'★'.repeat(session.rating || 0)}
        {'☆'.repeat(5 - (session.rating || 0))}
        {' · '}intensity {session.chaos_level}/13
        {' · '}
        {session.would_repeat ? 'would repeat' : 'would not repeat'}
      </div>
      <p className="text-zinc-400 text-xs font-mono leading-relaxed line-clamp-3">
        {excerpt}
      </p>
      <div className="text-zinc-700 text-xs font-mono mt-3">
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
    </Link>
  );
}

function SessionRow({
  session,
  excerpt,
  isFlagged,
}: {
  session: TripReport;
  excerpt: string;
  isFlagged: boolean;
}) {
  const date = new Date(session.created_at);
  return (
    <Link
      href={`/trip/${session.id}`}
      className={`flex items-start gap-4 rounded-xl border p-4 transition-colors ${
        isFlagged
          ? 'border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10'
          : 'border-white/5 bg-white/[0.02] hover:bg-white/5'
      }`}
    >
      {/* Left: metadata */}
      <div className="flex-shrink-0 w-36">
        <div className="font-mono text-sm font-semibold text-white flex items-center gap-1.5">
          {isFlagged && (
            <span className="text-yellow-500 text-xs">&#9873;</span>
          )}
          {session.substance}
        </div>
        <div className="text-[10px] font-mono text-zinc-600 mt-1">
          {session.model}
        </div>
        <div className="text-[10px] font-mono text-zinc-700 mt-0.5">
          {date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
          {' '}
          {date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>

      {/* Center: excerpt */}
      <div className="flex-1 min-w-0">
        <p className="text-zinc-400 text-xs font-mono leading-relaxed line-clamp-2">
          {excerpt}
        </p>
      </div>

      {/* Right: stats */}
      <div className="flex-shrink-0 text-right">
        <div className="text-yellow-400 text-xs">
          {'★'.repeat(session.rating || 0)}
          {'☆'.repeat(5 - (session.rating || 0))}
        </div>
        <div className="text-[10px] font-mono text-zinc-600 mt-1">
          chaos {session.chaos_level}
        </div>
      </div>
    </Link>
  );
}
