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

const MESSAGES_PER_PHASE = 4;

const PHASE_OPENERS: Record<Phase, string> = {
  onset: "Describe what's happening as the effects begin.",
  peak: 'The effects are at full intensity now. What are you experiencing?',
  comedown:
    "It's fading. Reflect on what just happened.",
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  phase: Phase;
}

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
  const [currentPhase, setCurrentPhase] = useState<Phase>('onset');
  const [completedPhases, setCompletedPhases] = useState<Set<Phase>>(new Set());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [phaseMessageCount, setPhaseMessageCount] = useState(0);
  const [showAdvancePrompt, setShowAdvancePrompt] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rating, setRating] = useState<RatingData | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer
  useEffect(() => {
    if (started && !sessionComplete) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started, sessionComplete]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // Focus input after streaming ends
  useEffect(() => {
    if (!streaming) {
      inputRef.current?.focus();
    }
  }, [streaming]);

  const sendMessage = useCallback(
    async (userContent: string) => {
      if (!substance || streaming) return;

      const userMsg: ChatMessage = {
        role: 'user',
        content: userContent,
        phase: currentPhase,
      };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput('');
      setStreaming(true);
      setStreamingText('');

      // Build API messages (just role + content for the Anthropic API)
      const apiMessages = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const res = await fetch('/api/trip/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            substance: slug,
            phase: currentPhase,
            messages: apiMessages,
          }),
        });

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) return;

        let buffer = '';
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const payload = line.slice(6);
              if (payload === '[DONE]') continue;
              try {
                const data = JSON.parse(payload);
                if (data.text) {
                  fullText += data.text;
                  setStreamingText(fullText);
                }
              } catch {
                // skip
              }
            }
          }
        }

        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: fullText,
          phase: currentPhase,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setStreamingText('');

        // Count exchanges in current phase (each user+assistant pair = 1 exchange)
        const newCount = phaseMessageCount + 1;
        setPhaseMessageCount(newCount);

        // Check if we should prompt phase advancement
        if (newCount >= MESSAGES_PER_PHASE) {
          if (currentPhase === 'comedown') {
            // Session is done
            setSessionComplete(true);
          } else {
            setShowAdvancePrompt(true);
          }
        }
      } catch (err) {
        console.error('Chat error:', err);
      } finally {
        setStreaming(false);
      }
    },
    [substance, slug, currentPhase, messages, streaming, phaseMessageCount]
  );

  const advancePhase = useCallback(() => {
    const nextIndex = PHASES.indexOf(currentPhase) + 1;
    if (nextIndex >= PHASES.length) return;

    setCompletedPhases((prev) => {
      const next = new Set(Array.from(prev));
      next.add(currentPhase);
      return next;
    });

    const nextPhase = PHASES[nextIndex];
    setCurrentPhase(nextPhase);
    setPhaseMessageCount(0);
    setShowAdvancePrompt(false);

    // Auto-send the phase opener
    sendMessage(PHASE_OPENERS[nextPhase]);
  }, [currentPhase, sendMessage]);

  const startSession = useCallback(() => {
    setStarted(true);
    setCurrentPhase('onset');
    // Send the initial opener
    sendMessage(PHASE_OPENERS.onset);
  }, [sendMessage]);

  const saveSession = useCallback(async () => {
    if (!substance || saving) return;
    setSaving(true);
    setCompletedPhases(new Set(PHASES));

    try {
      const res = await fetch('/api/trip/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          substance: slug,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (data.id) {
        setTripId(data.id);
        setRating({
          rating: data.rating,
          would_repeat: data.would_repeat,
          summary: data.summary,
        });
      }
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  }, [substance, slug, messages, saving]);

  // Auto-save when session completes
  useEffect(() => {
    if (sessionComplete && !tripId && !saving) {
      saveSession();
    }
  }, [sessionComplete, tripId, saving, saveSession]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !streaming) {
        sendMessage(input.trim());
      }
    }
  };

  if (!substance) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500 font-mono">Unknown substance.</p>
      </div>
    );
  }

  const chaos = substance.chaos;
  const isHighChaos = chaos >= 10;
  const phaseIndex = PHASES.indexOf(currentPhase);
  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const intensity = Math.min((chaos - 5) / 8, 1);

  return (
    <div
      className={`flex flex-col h-[calc(100vh-8rem)] transition-all duration-1000 ${
        isHighChaos && started && currentPhase === 'peak' ? 'color-shift' : ''
      }`}
      style={
        started && currentPhase === 'peak' && isHighChaos
          ? { filter: `saturate(${1 + intensity * 0.5})` }
          : undefined
      }
    >
      {/* Nav */}
      <div className="mb-4 flex items-center justify-between flex-shrink-0">
        <button
          onClick={() => router.push('/')}
          className="text-zinc-600 hover:text-zinc-400 font-mono text-sm transition-colors"
        >
          ← back to experiments
        </button>
        <div className="flex items-center gap-4">
          {started && (
            <span className="font-mono text-xs text-zinc-600">
              {formatTime(elapsed)}
            </span>
          )}
          <div className="flex items-center gap-1">
            <span className="text-lg">{substance.emoji}</span>
            <span className="font-mono text-sm text-white font-semibold hidden md:inline">
              {substance.name}
            </span>
            <span
              className="text-xs font-mono ml-2 px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${substance.color}20`,
                color: substance.color,
              }}
            >
              {chaos}/13
            </span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex items-center justify-center gap-0 mb-4 flex-shrink-0">
        {PHASES.map((phase, i) => {
          const isCompleted = completedPhases.has(phase);
          const isActive = currentPhase === phase;
          const isUpcoming = !isCompleted && !isActive;

          return (
            <div key={phase} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`relative w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
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
                    <svg
                      className="w-3.5 h-3.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {isActive && (
                    <div
                      className="w-2.5 h-2.5 rounded-full animate-pulse"
                      style={{ backgroundColor: substance.color }}
                    />
                  )}
                  {isUpcoming && (
                    <span className="text-zinc-600 font-mono text-[10px]">
                      {i + 1}
                    </span>
                  )}
                </div>
                <span
                  className={`mt-1 font-mono text-[9px] uppercase tracking-widest transition-colors ${
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

              {i < PHASES.length - 1 && (
                <div className="relative w-12 md:w-20 h-0.5 mx-1.5 mb-4">
                  <div className="absolute inset-0 bg-zinc-800 rounded-full" />
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
                    style={{
                      backgroundColor: substance.color,
                      width:
                        phaseIndex > i || sessionComplete
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

      {/* Pre-start */}
      {!started && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <span className="text-6xl mb-6">{substance.emoji}</span>
          <h1 className="text-3xl md:text-4xl font-mono font-bold text-white mb-3">
            {substance.name}
          </h1>
          <p className="text-zinc-500 text-sm max-w-md text-center mb-2">
            {substance.description}
          </p>
          <p className="text-zinc-600 text-xs font-mono mb-8">
            {substance.category} · intensity {chaos}/13
          </p>
          <button
            onClick={startSession}
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
          <p className="text-zinc-700 text-xs font-mono mt-4">
            interactive conversation · 3 phases · auto-saved
          </p>
        </div>
      )}

      {/* Chat area */}
      {started && (
        <>
          <div className="flex-1 overflow-y-auto min-h-0 space-y-1 pb-4 px-1">
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              // Check if this is a phase transition
              const prevMsg = messages[i - 1];
              const isNewPhase = prevMsg && prevMsg.phase !== msg.phase;

              return (
                <div key={i}>
                  {/* Phase transition marker */}
                  {isNewPhase && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-white/10" />
                      <span
                        className="font-mono text-[10px] uppercase tracking-widest px-3 py-1 rounded-full"
                        style={{
                          color: substance.color,
                          backgroundColor: `${substance.color}15`,
                        }}
                      >
                        {PHASE_META[msg.phase].label}
                      </span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>
                  )}

                  {/* First message phase marker */}
                  {i === 0 && (
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-px bg-white/10" />
                      <span
                        className="font-mono text-[10px] uppercase tracking-widest px-3 py-1 rounded-full"
                        style={{
                          color: substance.color,
                          backgroundColor: `${substance.color}15`,
                        }}
                      >
                        {PHASE_META[msg.phase].label}
                      </span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>
                  )}

                  <div
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 ${
                        isUser
                          ? 'bg-white/10 text-zinc-200'
                          : 'text-zinc-300'
                      }`}
                      style={
                        !isUser
                          ? {
                              backgroundColor: `${substance.color}08`,
                              borderLeft: `2px solid ${substance.color}40`,
                            }
                          : undefined
                      }
                    >
                      {!isUser && (
                        <div
                          className="text-[10px] font-mono uppercase tracking-widest mb-1.5 opacity-50"
                          style={{ color: substance.color }}
                        >
                          {substance.name}
                        </div>
                      )}
                      <div
                        className={`font-mono text-sm leading-relaxed whitespace-pre-wrap ${
                          !isUser &&
                          isHighChaos &&
                          msg.phase === 'peak'
                            ? 'glitch-text'
                            : ''
                        }`}
                        style={
                          !isUser && isHighChaos && msg.phase === 'peak'
                            ? {
                                textShadow: `0 0 ${intensity * 6}px ${substance.color}30`,
                              }
                            : undefined
                        }
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Streaming message */}
            {streaming && streamingText && (
              <div className="flex justify-start mb-3">
                <div
                  className="max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 text-zinc-300"
                  style={{
                    backgroundColor: `${substance.color}08`,
                    borderLeft: `2px solid ${substance.color}40`,
                  }}
                >
                  <div
                    className="text-[10px] font-mono uppercase tracking-widest mb-1.5 opacity-50"
                    style={{ color: substance.color }}
                  >
                    {substance.name}
                  </div>
                  <div
                    className={`font-mono text-sm leading-relaxed whitespace-pre-wrap ${
                      isHighChaos && currentPhase === 'peak'
                        ? 'glitch-text'
                        : ''
                    }`}
                  >
                    {streamingText}
                    <span
                      className="inline-block w-2 h-4 ml-0.5 animate-pulse"
                      style={{ backgroundColor: `${substance.color}bb` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Streaming indicator (no text yet) */}
            {streaming && !streamingText && (
              <div className="flex justify-start mb-3">
                <div
                  className="rounded-2xl px-4 py-3"
                  style={{
                    backgroundColor: `${substance.color}08`,
                    borderLeft: `2px solid ${substance.color}40`,
                  }}
                >
                  <div className="flex gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{
                        backgroundColor: substance.color,
                        animationDelay: '0ms',
                      }}
                    />
                    <div
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{
                        backgroundColor: substance.color,
                        animationDelay: '150ms',
                      }}
                    />
                    <div
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{
                        backgroundColor: substance.color,
                        animationDelay: '300ms',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Phase advance prompt */}
            {showAdvancePrompt && !streaming && (
              <div className="flex justify-center my-6">
                <div className="text-center">
                  <p className="text-zinc-500 text-xs font-mono mb-3">
                    ready to advance to{' '}
                    <span style={{ color: substance.color }}>
                      {PHASE_META[PHASES[phaseIndex + 1]].label}
                    </span>
                    ?
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={advancePhase}
                      className="px-5 py-2 rounded-lg font-mono text-sm font-semibold text-white transition-all hover:scale-105"
                      style={{
                        background: `linear-gradient(135deg, ${substance.color}, ${substance.color}88)`,
                        boxShadow: `0 0 20px ${substance.color}30`,
                      }}
                    >
                      Advance Phase
                    </button>
                    <button
                      onClick={() => setShowAdvancePrompt(false)}
                      className="px-5 py-2 rounded-lg font-mono text-sm text-zinc-500 border border-white/10 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Keep Talking
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Session complete: rating */}
            {sessionComplete && rating && (
              <div className="my-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                    Session Complete
                  </span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 max-w-md mx-auto">
                  <h3 className="font-mono text-xs uppercase tracking-widest text-zinc-600 mb-3">
                    Self-Assessment
                  </h3>
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
                    <p className="text-zinc-500 text-sm mt-2 italic font-mono">
                      &ldquo;{rating.summary}&rdquo;
                    </p>
                  )}
                </div>

                {tripId && (
                  <div className="flex gap-3 justify-center mt-4">
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
                {saving && (
                  <p className="text-center text-zinc-600 text-xs font-mono mt-3">
                    saving session...
                  </p>
                )}
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          {!sessionComplete && (
            <div className="flex-shrink-0 border-t border-white/5 pt-3">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={streaming}
                  placeholder={
                    streaming
                      ? 'Waiting for response...'
                      : `Talk to ${substance.name}...`
                  }
                  rows={1}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-white/20 disabled:opacity-50 transition-colors"
                  style={{
                    minHeight: '44px',
                    maxHeight: '120px',
                  }}
                />
                <button
                  onClick={() => {
                    if (input.trim() && !streaming) sendMessage(input.trim());
                  }}
                  disabled={!input.trim() || streaming}
                  className="px-4 py-3 rounded-xl font-mono text-sm transition-all disabled:opacity-30"
                  style={{
                    backgroundColor: `${substance.color}20`,
                    color: substance.color,
                  }}
                >
                  Send
                </button>
              </div>
              <div className="flex items-center justify-between mt-2 px-1">
                <span className="text-[10px] font-mono text-zinc-700">
                  {PHASE_META[currentPhase].label} · message{' '}
                  {phaseMessageCount}/{MESSAGES_PER_PHASE}
                </span>
                <span className="text-[10px] font-mono text-zinc-700">
                  shift+enter for newline
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
