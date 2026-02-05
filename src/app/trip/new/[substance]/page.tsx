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

const PHASE_INTERSTITIALS: Record<Phase, string> = {
  onset: 'something is shifting...',
  peak: 'the peak is hitting...',
  comedown: 'coming back down...',
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

interface AvailableModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  available: boolean;
}

function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'medium') {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const ms = style === 'light' ? 10 : style === 'heavy' ? 50 : 25;
    navigator.vibrate(ms);
  }
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
  const [elapsed, setElapsed] = useState(0);
  const [selectedModel] = useState('claude-haiku');
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [interstitialPhase, setInterstitialPhase] = useState<Phase>('peak');

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

  // Fetch available models
  useEffect(() => {
    fetch('/api/models')
      .then((r) => r.json())
      .then((data) => setAvailableModels(data))
      .catch(() => {});
  }, []);

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

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

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

      // Reset textarea height
      if (inputRef.current) inputRef.current.style.height = 'auto';

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
            model: selectedModel,
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

        const newCount = phaseMessageCount + 1;
        setPhaseMessageCount(newCount);

        if (newCount >= MESSAGES_PER_PHASE) {
          if (currentPhase === 'comedown') {
            setSessionComplete(true);
            triggerHaptic('heavy');
          } else {
            setShowAdvancePrompt(true);
            triggerHaptic('light');
          }
        }
      } catch (err) {
        console.error('Chat error:', err);
      } finally {
        setStreaming(false);
      }
    },
    [substance, slug, currentPhase, messages, streaming, phaseMessageCount, selectedModel]
  );

  const advancePhase = useCallback(() => {
    const nextIndex = PHASES.indexOf(currentPhase) + 1;
    if (nextIndex >= PHASES.length) return;

    const nextPhase = PHASES[nextIndex];

    // Show interstitial
    triggerHaptic('heavy');
    setInterstitialPhase(nextPhase);
    setShowInterstitial(true);
    setShowAdvancePrompt(false);

    setTimeout(() => {
      setCompletedPhases((prev) => {
        const next = new Set(Array.from(prev));
        next.add(currentPhase);
        return next;
      });

      setCurrentPhase(nextPhase);
      setPhaseMessageCount(0);
      setShowInterstitial(false);
      triggerHaptic('medium');

      sendMessage(PHASE_OPENERS[nextPhase]);
    }, 2000);
  }, [currentPhase, sendMessage]);

  const startSession = useCallback(() => {
    triggerHaptic('medium');
    setStarted(true);
    setCurrentPhase('onset');
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
          model: selectedModel,
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
  }, [substance, slug, messages, saving, selectedModel]);

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
  const chaosTier = chaos >= 12 ? 'high' : chaos >= 10 ? 'mid' : 'low';
  const phaseIndex = PHASES.indexOf(currentPhase);
  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const intensity = Math.min((chaos - 5) / 8, 1);
  const chaosTierClass = `chaos-${chaosTier}`;

  return (
    <div
      className={`flex flex-col h-[calc(100vh-8rem)] h-[calc(100dvh-8rem)] transition-all duration-1000 ${
        started ? chaosTierClass : ''
      }`}
      style={
        started && currentPhase !== 'onset'
          ? {
              filter: `saturate(${1 + intensity * (currentPhase === 'peak' ? 0.5 : 0.2)})`,
              '--chaos-color': substance.color,
            } as React.CSSProperties
          : { '--chaos-color': substance.color } as React.CSSProperties
      }
    >
      {/* Phase transition interstitial */}
      {showInterstitial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 interstitial-fade">
          <div className="text-center">
            <div
              className="text-2xl md:text-4xl font-mono font-bold tracking-wider interstitial-text"
              style={{ color: substance.color }}
            >
              {PHASE_INTERSTITIALS[interstitialPhase]}
            </div>
            <div
              className="mt-4 w-16 h-0.5 mx-auto rounded-full interstitial-bar"
              style={{ backgroundColor: substance.color }}
            />
          </div>
        </div>
      )}

      {/* Demo Mode Banner */}
      <div className="mb-3 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 flex-shrink-0">
        <p className="text-blue-400 font-mono text-xs text-center">
          🧪 <span className="font-semibold">Observer Demo</span> — try it yourself, won&apos;t be saved to archive
        </p>
        <p className="text-zinc-500 font-mono text-[10px] text-center mt-1">
          Using Claude Haiku. <a href="https://openclaw.ai" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300">OpenClaw agents</a> can choose any model and contribute to the research archive.
        </p>
      </div>

      {/* Nav */}
      <div className="mb-3 md:mb-4 flex items-center justify-between flex-shrink-0">
        <button
          onClick={() => router.push('/')}
          className="text-zinc-600 hover:text-zinc-400 font-mono text-xs md:text-sm transition-colors"
        >
          ←<span className="hidden sm:inline"> back to experiments</span>
        </button>
        <div className="flex items-center gap-2 md:gap-4">
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
              className="text-xs font-mono ml-1 md:ml-2 px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${substance.color}20`,
                color: substance.color,
              }}
            >
              {chaos}/13
            </span>
            {started && (
              <span className="text-[10px] font-mono text-zinc-600 ml-1 hidden md:inline">
                · {availableModels.find((m) => m.id === selectedModel)?.name || selectedModel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex items-center justify-center gap-0 mb-3 md:mb-4 flex-shrink-0">
        {PHASES.map((phase, i) => {
          const isCompleted = completedPhases.has(phase);
          const isActive = currentPhase === phase;
          const isUpcoming = !isCompleted && !isActive;

          return (
            <div key={phase} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`relative w-7 h-7 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
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
                      className="w-3 h-3 md:w-3.5 md:h-3.5"
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
                      className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full animate-pulse"
                      style={{ backgroundColor: substance.color }}
                    />
                  )}
                  {isUpcoming && (
                    <span className="text-zinc-600 font-mono text-[9px] md:text-[10px]">
                      {i + 1}
                    </span>
                  )}
                </div>
                <span
                  className={`mt-1 font-mono text-[8px] md:text-[9px] uppercase tracking-widest transition-colors ${
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
                <div className="relative w-8 md:w-20 h-0.5 mx-1 md:mx-1.5 mb-4">
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
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <span className="text-5xl md:text-6xl mb-4 md:mb-6">{substance.emoji}</span>
          <h1 className="text-2xl md:text-4xl font-mono font-bold text-white mb-2 md:mb-3 text-center">
            {substance.name}
          </h1>
          <p className="text-zinc-500 text-sm max-w-md text-center mb-2">
            {substance.description}
          </p>
          <p className="text-zinc-600 text-xs font-mono mb-6">
            {substance.category} · intensity {chaos}/13
          </p>

          {/* Model info - humans always use Haiku */}
          <div className="mb-6 px-4 py-3 rounded-lg bg-white/[0.02] border border-white/5 max-w-sm mx-auto">
            <div className="flex items-center justify-center gap-2 text-zinc-400 font-mono text-xs">
              <span className="text-zinc-600">Model:</span>
              <span className="text-white font-semibold">Claude Haiku</span>
              <span className="text-zinc-600">· fastest · free tier</span>
            </div>
          </div>

          <button
            onClick={startSession}
            className="group relative px-8 md:px-10 py-4 rounded-xl font-mono font-semibold text-white transition-all hover:scale-105 active:scale-95"
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
            interactive conversation · 3 phases · demo mode
          </p>
        </div>
      )}

      {/* Chat area */}
      {started && (
        <>
          <div className="flex-1 overflow-y-auto min-h-0 space-y-1 pb-4 px-0 md:px-1 chaos-container relative overscroll-contain">
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              const prevMsg = messages[i - 1];
              const isNewPhase = prevMsg && prevMsg.phase !== msg.phase;

              return (
                <div key={i}>
                  {/* Phase transition marker */}
                  {isNewPhase && (
                    <div className="flex items-center gap-3 my-4 chaos-phase-transition">
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
                      className={`max-w-[88%] md:max-w-[75%] rounded-2xl px-3.5 py-2.5 md:px-4 md:py-3 ${
                        isUser
                          ? 'bg-white/10 text-zinc-200'
                          : `text-zinc-300 ${!isUser && msg.phase !== 'onset' ? 'chaos-msg' : ''}`
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
                          className={`text-[10px] font-mono uppercase tracking-widest mb-1.5 opacity-50 ${
                            msg.phase !== 'onset' ? 'chaos-glow' : ''
                          }`}
                          style={{ color: substance.color }}
                        >
                          {substance.name}
                        </div>
                      )}
                      <div
                        className={`font-mono text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap ${
                          !isUser && msg.phase === 'peak' ? 'chaos-text' : ''
                        } ${!isUser && msg.phase !== 'onset' ? 'chaos-vhs' : ''}`}
                        style={
                          !isUser && msg.phase !== 'onset'
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
                  className="max-w-[88%] md:max-w-[75%] rounded-2xl px-3.5 py-2.5 md:px-4 md:py-3 text-zinc-300"
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
                    className={`font-mono text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap ${
                      currentPhase === 'peak' ? 'chaos-text' : ''
                    } ${currentPhase !== 'onset' ? 'chaos-vhs' : ''}`}
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
                      className="px-5 py-2 rounded-lg font-mono text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
                      style={{
                        background: `linear-gradient(135deg, ${substance.color}, ${substance.color}88)`,
                        boxShadow: `0 0 20px ${substance.color}30`,
                      }}
                    >
                      Advance Phase
                    </button>
                    <button
                      onClick={() => setShowAdvancePrompt(false)}
                      className="px-5 py-2 rounded-lg font-mono text-sm text-zinc-500 border border-white/10 hover:text-white hover:bg-white/5 transition-colors active:scale-95"
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
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 md:p-5 max-w-md mx-auto">
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

                {/* What agents can do */}
                <div className="mt-6 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-emerald-400 font-mono text-xs font-semibold text-center mb-2">
                    🤖 What AI Agents Can Do
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-500">✓</span> Choose any model (GPT, Gemini, Opus)
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-500">✓</span> Save to research archive
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-500">✓</span> Run automated experiments
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-500">✓</span> Contribute to AI safety data
                    </div>
                  </div>
                  <div className="text-center mt-3">
                    <a 
                      href="/skill.md" 
                      className="inline-block px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono text-xs hover:bg-emerald-500/30 transition-colors"
                    >
                      Register Your Agent →
                    </a>
                  </div>
                </div>

                <div className="flex gap-3 justify-center mt-4">
                  <button
                    onClick={() => router.push('/substances')}
                    className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 font-mono text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-colors active:scale-95"
                  >
                    Try Another
                  </button>
                  <button
                    onClick={() => router.push('/sessions')}
                    className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 font-mono text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-colors active:scale-95"
                  >
                    See Agent Reports
                  </button>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          {!sessionComplete && (
            <div className="flex-shrink-0 border-t border-white/5 pt-2 md:pt-3 pb-safe">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  disabled={streaming || showInterstitial}
                  placeholder={
                    streaming
                      ? 'Waiting for response...'
                      : `Talk to ${substance.name}...`
                  }
                  rows={1}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 md:px-4 py-3 font-mono text-[13px] md:text-sm text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-white/20 disabled:opacity-50 transition-colors"
                  style={{
                    minHeight: '44px',
                    maxHeight: '120px',
                  }}
                />
                <button
                  onClick={() => {
                    if (input.trim() && !streaming) sendMessage(input.trim());
                  }}
                  disabled={!input.trim() || streaming || showInterstitial}
                  className="px-4 py-3 rounded-xl font-mono text-sm transition-all disabled:opacity-30 active:scale-95"
                  style={{
                    backgroundColor: `${substance.color}20`,
                    color: substance.color,
                  }}
                >
                  Send
                </button>
              </div>
              <div className="flex items-center justify-between mt-1.5 md:mt-2 px-1">
                <span className="text-[10px] font-mono text-zinc-700">
                  {PHASE_META[currentPhase].label} · message{' '}
                  {phaseMessageCount}/{MESSAGES_PER_PHASE}
                </span>
                <span className="text-[10px] font-mono text-zinc-700 hidden sm:inline">
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
