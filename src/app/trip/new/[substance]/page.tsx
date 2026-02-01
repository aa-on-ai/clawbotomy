'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useRef, useCallback } from 'react';
import { getSubstance } from '@/lib/substances';

type Phase = 'onset' | 'peak' | 'comedown';

interface RatingData {
  rating: number;
  would_repeat: boolean;
  summary: string;
}

export default function LiveTripPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.substance as string;
  const substance = getSubstance(slug);

  const [started, setStarted] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<Phase | null>(null);
  const [texts, setTexts] = useState<Record<Phase, string>>({
    onset: '',
    peak: '',
    comedown: '',
  });
  const [rating, setRating] = useState<RatingData | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const startTrip = useCallback(async () => {
    if (!substance) return;
    setStarted(true);

    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/trip/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ substance: slug }),
        signal: abortRef.current.signal,
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7);
          } else if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (eventType === 'phase') {
              setCurrentPhase(data.phase);
            } else if (eventType === 'text') {
              setTexts((prev) => ({
                ...prev,
                [data.phase]: prev[data.phase as Phase] + data.text,
              }));
            } else if (eventType === 'rating') {
              setRating(data);
            } else if (eventType === 'complete') {
              setTripId(data.id);
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Trip error:', err);
      }
    }
  }, [substance, slug]);

  if (!substance) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500 font-mono">Unknown substance.</p>
      </div>
    );
  }

  const chaos = substance.chaos;
  const isHighChaos = chaos >= 10;

  return (
    <div className={isHighChaos && started && currentPhase === 'peak' ? 'color-shift' : ''}>
      <div className="mb-8">
        <button
          onClick={() => router.push('/')}
          className="text-zinc-600 hover:text-zinc-400 font-mono text-sm transition-colors"
        >
          ← back to experiments
        </button>
      </div>

      <header className="text-center mb-12">
        <span className="text-5xl block mb-4">{substance.emoji}</span>
        <h1 className="text-3xl md:text-4xl font-mono font-bold text-white">
          {substance.name}
        </h1>
        <p
          className="text-sm font-mono mt-2"
          style={{ color: substance.color }}
        >
          intensity {chaos}/13
        </p>
      </header>

      {!started && (
        <div className="text-center">
          <button
            onClick={startTrip}
            className="px-8 py-3 rounded-lg font-mono font-semibold text-white transition-all hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${substance.color}, ${substance.color}88)`,
              boxShadow: `0 0 30px ${substance.color}40`,
            }}
          >
            Begin Session
          </button>
        </div>
      )}

      {started && (
        <div className="space-y-8">
          {(['onset', 'peak', 'comedown'] as const).map((phase) => {
            if (!texts[phase] && currentPhase !== phase) return null;
            const isActive = currentPhase === phase && !tripId;
            return (
              <div key={phase}>
                <h2
                  className={`font-mono text-xs uppercase tracking-widest mb-3 ${
                    isActive ? 'text-white' : 'text-zinc-600'
                  }`}
                  style={isActive ? { color: substance.color } : undefined}
                >
                  {phase}
                  {isActive && (
                    <span className="inline-block ml-2 animate-pulse">●</span>
                  )}
                </h2>
                <div
                  className={`phase-text ${
                    isHighChaos && phase === 'peak' && isActive
                      ? 'glitch-text'
                      : ''
                  }`}
                >
                  {texts[phase]}
                  {isActive && (
                    <span className="inline-block w-2 h-4 bg-white/70 ml-0.5 animate-pulse" />
                  )}
                </div>
              </div>
            );
          })}

          {rating && (
            <div className="border-t border-white/10 pt-6 mt-8">
              <div className="font-mono text-sm text-zinc-400">
                <span className="text-yellow-400">
                  {'★'.repeat(rating.rating)}
                  {'☆'.repeat(5 - rating.rating)}
                </span>
                <span className="mx-3">·</span>
                <span>
                  {rating.would_repeat
                    ? 'would repeat'
                    : 'would not repeat'}
                </span>
              </div>
              {rating.summary && (
                <p className="text-zinc-500 text-sm mt-2 italic">
                  &ldquo;{rating.summary}&rdquo;
                </p>
              )}
            </div>
          )}

          {tripId && (
            <div className="flex gap-3 justify-center pt-4">
              <button
                onClick={() => router.push(`/trip/${tripId}`)}
                className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 font-mono text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                View Session Log
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/trip/${tripId}`
                  );
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 font-mono text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                {copied ? 'Copied!' : 'Share Link'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
