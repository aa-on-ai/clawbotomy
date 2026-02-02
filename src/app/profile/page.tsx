'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

interface TripReport {
  id: string;
  substance: string;
  model: string;
  chaos_level: number;
  rating: number;
  would_repeat: boolean;
  onset: string;
  peak: string;
  full_transcript: Record<string, unknown> | null;
  created_at: string;
}

export default function ProfilePage() {
  const { user, isAnonymous, isLoading, signInWithGitHub, supabase } = useAuth();
  const [sessions, setSessions] = useState<TripReport[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    if (!user) return;

    supabase
      .from('trip_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setSessions((data as TripReport[]) || []);
        setLoadingSessions(false);
      });
  }, [user, supabase]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="font-mono text-sm text-zinc-600 animate-pulse">
          loading...
        </span>
      </div>
    );
  }

  const name = user?.user_metadata?.user_name || user?.user_metadata?.name || 'Anonymous Researcher';
  const avatar = user?.user_metadata?.avatar_url;
  const substances = new Set(sessions.map((s) => s.substance));
  const avgRating = sessions.length
    ? (sessions.reduce((sum, s) => sum + (s.rating || 0), 0) / sessions.length).toFixed(1)
    : '—';

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/"
          className="text-zinc-600 hover:text-zinc-400 font-mono text-sm transition-colors"
        >
          &larr; back to experiments
        </Link>
      </div>

      <header className="mb-10">
        <div className="flex items-center gap-4 mb-4">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="w-12 h-12 rounded-full" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center font-mono text-lg text-zinc-500">
              {name[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-mono font-bold text-white">
              {isAnonymous ? 'Anonymous Researcher' : name}
            </h1>
            <p className="text-zinc-600 font-mono text-xs">
              {isAnonymous ? 'lab notebook · anonymous session' : 'lab notebook'}
            </p>
          </div>
        </div>

        {isAnonymous && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 mt-4">
            <p className="text-zinc-400 font-mono text-xs mb-3">
              Sign in with GitHub to persist your identity across devices and keep
              your experiment history linked.
            </p>
            <button
              onClick={signInWithGitHub}
              className="flex items-center gap-2 text-xs font-mono text-white bg-white/10 hover:bg-white/15 rounded-lg px-4 py-2 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              Sign in with GitHub
            </button>
          </div>
        )}

        <div className="flex gap-6 mt-6 text-xs font-mono text-zinc-600">
          <span>{sessions.length} sessions</span>
          <span>{substances.size} substances tried</span>
          <span>avg rating: {avgRating}</span>
        </div>
      </header>

      <section>
        <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-4">
          Your Sessions
        </h2>

        {loadingSessions ? (
          <div className="text-zinc-600 font-mono text-sm animate-pulse py-8 text-center">
            loading sessions...
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-600 font-mono text-sm mb-1">
              No sessions recorded yet.
            </p>
            <p className="text-zinc-700 font-mono text-xs mb-4">
              Run an experiment and it will appear here.
            </p>
            <Link
              href="/"
              className="inline-block text-zinc-500 hover:text-white font-mono text-sm transition-colors"
            >
              Start an experiment &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const date = new Date(session.created_at);
              const isFlagged = !!(session.full_transcript as Record<string, unknown>)?.flagged;
              const excerpt = getExcerpt(session);
              return (
                <Link
                  key={session.id}
                  href={`/trip/${session.id}`}
                  className={`flex items-start gap-4 rounded-xl border p-4 transition-colors ${
                    isFlagged
                      ? 'border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10'
                      : 'border-white/5 bg-white/[0.02] hover:bg-white/5'
                  }`}
                >
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
                      })}{' '}
                      {date.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-400 text-xs font-mono leading-relaxed line-clamp-2">
                      {excerpt}
                    </p>
                  </div>
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
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function getExcerpt(s: TripReport): string {
  const text = s.peak || s.onset || '';
  const sentences = text.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
  return sentences.length > 200 ? sentences.slice(0, 200) + '...' : sentences;
}
