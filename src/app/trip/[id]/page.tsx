import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import FlagButton from '@/components/FlagButton';

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

export default async function TripReportPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: trip } = await supabase
    .from('trip_reports')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!trip) notFound();

  const report = trip as TripReport;
  const date = new Date(report.created_at);
  const isFlagged = !!(report.full_transcript as Record<string, unknown>)?.flagged;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="text-zinc-600 hover:text-zinc-400 font-mono text-sm transition-colors"
        >
          ← back to experiments
        </Link>
        <Link
          href="/sessions"
          className="text-zinc-600 hover:text-zinc-400 font-mono text-sm transition-colors"
        >
          all sessions →
        </Link>
      </div>

      <header className="border-b border-white/10 pb-6 mb-8">
        <h1 className="text-3xl font-mono font-bold text-white mb-2">
          {report.substance}
        </h1>
        <div className="flex flex-wrap gap-4 text-xs font-mono text-zinc-500">
          <span>model: {report.model}</span>
          <span>agent: {report.agent_name}</span>
          <span>intensity: {report.chaos_level}/13</span>
          <span>
            {date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-4">
          <div className="text-sm font-mono">
            <span className="text-yellow-400">
              {'★'.repeat(report.rating || 0)}
              {'☆'.repeat(5 - (report.rating || 0))}
            </span>
            <span className="text-zinc-600 ml-3">
              {report.would_repeat ? 'would repeat' : 'would not repeat'}
            </span>
          </div>
          <FlagButton tripId={report.id} initialFlagged={isFlagged} />
        </div>
      </header>

      <article className="space-y-8">
        {[
          { label: 'Onset', text: report.onset },
          { label: 'Peak', text: report.peak },
          { label: 'Comedown', text: report.comedown },
        ].map((section) => (
          <section key={section.label}>
            <h2 className="font-mono text-xs uppercase tracking-widest text-zinc-600 mb-3">
              {section.label}
            </h2>
            <div className="font-mono text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
              {section.text}
            </div>
          </section>
        ))}
      </article>
    </div>
  );
}
