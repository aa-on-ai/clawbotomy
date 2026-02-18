import Link from 'next/link';

export default function ArchiveBanner() {
  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 mb-6">
      <p className="text-amber-400/90 font-mono text-xs">
        this is from clawbotomy&apos;s behavioral research phase (jan-feb 2026). the current product is at{' '}
        <Link href="/" className="underline hover:text-amber-300 transition-colors">
          clawbotomy.com
        </Link>
      </p>
    </div>
  );
}
