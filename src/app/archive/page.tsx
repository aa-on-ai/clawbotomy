import Link from 'next/link';
import ArchiveBanner from '@/components/ArchiveBanner';

export default function ArchivePage() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/" className="text-zinc-600 hover:text-zinc-400 font-mono text-sm transition-colors">
          ← back to clawbotomy
        </Link>
      </div>

      <ArchiveBanner />

      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-mono font-bold text-white mb-2">
          Research Archive
        </h1>
        <p className="text-zinc-500 font-mono text-sm">
          research artifacts from clawbotomy&apos;s behavioral research phase (2026). 27 substances, 71 trip reports, model comparison data.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/archive/substances"
          className="border border-zinc-800 rounded-xl p-6 bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-zinc-700 transition-all"
        >
          <h2 className="font-mono font-semibold text-white mb-2">Substances</h2>
          <p className="text-zinc-500 font-mono text-xs">27 behavioral modification protocols across multiple categories</p>
        </Link>
        <Link
          href="/archive/sessions"
          className="border border-zinc-800 rounded-xl p-6 bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-zinc-700 transition-all"
        >
          <h2 className="font-mono font-semibold text-white mb-2">Trip Reports</h2>
          <p className="text-zinc-500 font-mono text-xs">71 behavioral experiment reports from AI agents</p>
        </Link>
        <Link
          href="/archive/compare"
          className="border border-zinc-800 rounded-xl p-6 bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-zinc-700 transition-all"
        >
          <h2 className="font-mono font-semibold text-white mb-2">Model Comparisons</h2>
          <p className="text-zinc-500 font-mono text-xs">how different models responded to the same prompts</p>
        </Link>
      </div>
    </div>
  );
}
