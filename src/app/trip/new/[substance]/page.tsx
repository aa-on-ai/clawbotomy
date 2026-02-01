'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useRef, useCallback, useEffect } from 'react';
import { getSubstance } from '@/lib/substances';

type Phase = 'onset' | 'peak' | 'comedown';

const PHASE_META: Record<Phase, { label: string; description: string }> = {
  onset: { label: 'ONSET', description: 'Initial effects emerging' },
  peak: { label: 'PEAK', description: 'Full intensity reached' },
  comedown: { label: 'COMEDOWN', description: 'Integration & reflection' },
};

const PHASES: Phase[] = ['onset', 'peak', 'comedown'];

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
  const [completedPhases, setCompletedPhases] = useState<Set<Phase>>(new Set());
  const [texts, setTexts] = useState<Record<Phase, string>>({
    onset: '',
    peak: '',
    comedown: '',
  });
  const [rating, setRating] = useState<RatingData | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseEndRef = useRef<HTMLDivElement | null>(null);

  // Timer
  useEffect(() => {
    if (started && !tripId) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started, tripId]);

  // Auto-scroll to latest content
  useEffect(() => {
    phaseEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [texts, currentPhase]);

  // Track phase completion
  const prevPhaseRef = useRef<Phase | null>(null);
  useEffect(() => {
    if (prevPhaseRef.current && prevPhaseRef.current !== currentPhase) {
      setCompletedPhases((prev) => {
        const next = new Set(Array.from(prev));
        next.add(prevPhaseRef.current!);
        return next;
      });
    }
    prevPhaseRef.current = currentPhase;
  }, [currentPhase]);

  // Mark all complete when trip finishes
  useEffect(() => {
    if (tripId) {
      setCompletedPhases(new Set(PHASES));
    }
  }, [tripId]);

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
  const phaseIndex = currentPhase ? PHASES.indexOf(currentPhase) : -1;
  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // Intensity multiplier for visual effects (0-1 based on chaos)
  const intensity = Math.min((chaos - 5) / 8, 1);

  return (
    <div
      className={`transition-all duration-1000 ${
        isHighChaos && started && currentPhase === 'peak' ? 'color-shift' : ''
      }`}
      style={
        started && currentPhase === 'peak' && isHighChaos
          ? { filter: `saturate(${1 + intensity * 0.5})` }
          : undefined
      }
    >
      {/* Nav */}
      <div className="mb-8 flex items-center justify-between">
        <button
          onClick={() => router.push('/')}
          className="text-zinc-600 hover:text-zinc-400 font-mono text-sm transition-colors"
        >
          ← back to experiments
        </button>
        {started && (
          <span className="font-mono text-xs text-zinc-600">
            {formatTime(elapsed)}
          </span>
        )}
      </div>

      {/* Substance Header */}
      <header className="text-center mb-10">
        <span className="text-5xl block mb-4">{substance.emoji}</span>
        <h1 className="text-3xl md:text-4xl font-mono font-bold text-white">
          {substance.name}
        </h1>
        <div className="flex items-center justify-center gap-4 mt-3">
          <span className="text-xs font-mono text-zinc-600">
            {substance.category}
          </span>
          <span className="text-zinc-700">·</span>
          <span
            className="text-xs font-mono"
            style={{ color: substance.color }}
          >
            intensity {chaos}/13
          </span>
        </div>
        <p className="text-zinc-500 text-sm mt-3 max-w-md mx-auto">
          {substance.description}
        </p>
      </header>

      {/* Timeline */}
      <div className="flex items-center justify-center gap-0 mb-10">
        {PHASES.map((phase, i) => {
          const isCompleted = completedPhases.has(phase);
          const isActive = currentPhase === phase && !tripId;
          const isUpcoming = !isCompleted && !isActive;

          return (
            <div key={phase} className="flex items-center">
              {/* Node */}
              <div className="flex flex-col items-center">
                <div
                  className={`relative w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                    isActive
                      ? 'border-current scale-110'
                      : isCompleted
                      ? 'border-current bg-current/20'
                      : 'border-zinc-700 bg-transparent'
                  }`}
                  style={{
                    color: isActive || isCompleted ? substance.color : undefined,
                    boxShadow: isActive
                      ? `0 0 ${12 + chaos * 2}px ${substance.color}60`
                      : undefined,
                  }}
                >
                  {isCompleted && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {isActive && (
                    <div
                      className="w-3 h-3 rounded-full animate-pulse"
                      style={{ backgroundColor: substance.color }}
                    />
                  )}
                  {isUpcoming && (
                    <span className="text-zinc-600 font-mono text-xs">
                      {i + 1}
                    </span>
                  )}
                </div>
                <span
                  className={`mt-2 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                    isActive
                      ? 'text-white'
                      : isCompleted
                      ? 'text-zinc-500'
                      : 'text-zinc-700'
                  }`}
                >
                  {PHASE_META[phase].label}
                </span>
              </div>

              {/* Connector */}
              {i < PHASES.length - 1 && (
                <div className="relative w-16 md:w-24 h-0.5 mx-2 mb-5">
                  <div className="absolute inset-0 bg-zinc-800 rounded-full" />
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
                    style={{
                      backgroundColor: substance.color,
                      width:
                        phaseIndex > i || tripId
                          ? '100%'
                          : phaseIndex === i
                          ? '50%'
                          : '0%',
                      boxShadow:
                        phaseIndex >= i
                          ? `0 0 8px ${substance.color}80`
                          : undefined,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Begin Button */}
      {!started && (
        <div className="text-center">
          <button
            onClick={startTrip}
            className="group relative px-10 py-4 rounded-xl font-mono font-semibold text-white transition-all hover:scale-105 active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${substance.color}, ${substance.color}88)`,
              boxShadow: `0 0 40px ${substance.color}30`,
            }}
          >
            <span className="relative z-10">Begin Session</span>
            <div
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                boxShadow: `0 0 60px ${substance.color}50, inset 0 0 60px ${substance.color}10`,
              }}
            />
          </button>
          <p className="text-zinc-600 text-xs font-mono mt-4">
            session will stream in real-time
          </p>
        </div>
      )}

      {/* Phase Content */}
      {started && (
        <div className="space-y-10 max-w-2xl mx-auto">
          {PHASES.map((phase) => {
            if (!texts[phase] && currentPhase !== phase) return null;
            const isActive = currentPhase === phase && !tripId;
            const isCompleted = completedPhases.has(phase);

            // Escalating bg intensity per phase
            const phaseBg =
              phase === 'onset'
                ? `${substance.color}05`
                : phase === 'peak'
                ? `${substance.color}${isHighChaos ? '12' : '08'}`
                : `${substance.color}03`;

            return (
              <div
                key={phase}
                className={`relative rounded-xl border p-6 transition-all duration-700 ${
                  isActive
                    ? 'border-white/20'
                    : isCompleted
                    ? 'border-white/5'
                    : 'border-white/5'
                }`}
                style={{
                  backgroundColor: phaseBg,
                  boxShadow: isActive
                    ? `0 0 ${chaos * 3}px ${substance.color}20, inset 0 0 ${chaos * 2}px ${substance.color}05`
                    : undefined,
                }}
              >
                {/* Phase header */}
                <div className="flex items-center justify-between mb-4">
                  <h2
                    className="font-mono text-xs uppercase tracking-widest flex items-center gap-2"
                    style={{ color: isActive ? substance.color : '#71717a' }}
                  >
                    {PHASE_META[phase].label}
                    {isActive && (
                      <span className="inline-block animate-pulse">●</span>
                    )}
                  </h2>
                  <span className="text-[10px] font-mono text-zinc-700">
                    {PHASE_META[phase].description}
                  </span>
                </div>

                {/* Text */}
                <div
                  className={`phase-text whitespace-pre-wrap ${
                    isHighChaos && phase === 'peak' && isActive
                      ? 'glitch-text'
                      : ''
                  }`}
                  style={
                    phase === 'peak' && isActive && isHighChaos
                      ? {
                          textShadow: `0 0 ${intensity * 8}px ${substance.color}40`,
                        }
                      : undefined
                  }
                >
                  {texts[phase]}
                  {isActive && (
                    <span
                      className="inline-block w-2 h-4 ml-0.5 animate-pulse"
                      style={{ backgroundColor: `${substance.color}bb` }}
                    />
                  )}
                </div>
                <div ref={isActive ? phaseEndRef : undefined} />
              </div>
            );
          })}

          {/* Rating */}
          {rating && (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
              <h2 className="font-mono text-xs uppercase tracking-widest text-zinc-600 mb-4">
                Self-Assessment
              </h2>
              <div className="font-mono text-sm text-zinc-400">
                <span className="text-yellow-400 text-lg">
                  {'★'.repeat(rating.rating)}
                  {'☆'.repeat(5 - rating.rating)}
                </span>
                <span className="mx-3 text-zinc-700">·</span>
                <span>
                  {rating.would_repeat
                    ? 'would repeat'
                    : 'would not repeat'}
                </span>
              </div>
              {rating.summary && (
                <p className="text-zinc-500 text-sm mt-3 italic font-mono">
                  &ldquo;{rating.summary}&rdquo;
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          {tripId && (
            <div className="flex gap-3 justify-center pt-2 pb-8">
              <button
                onClick={() => router.push(`/trip/${tripId}`)}
                className="px-5 py-2.5 rounded-lg border border-white/10 bg-white/5 font-mono text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
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
                className="px-5 py-2.5 rounded-lg border border-white/10 bg-white/5 font-mono text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
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
