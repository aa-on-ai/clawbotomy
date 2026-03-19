'use client';

import Link from 'next/link';
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

import { LAB_SUBSTANCES } from '@/lib/lab-substances';
import { getVideosForSubstance } from '@/lib/video-gallery-data';
import { getReport } from '@/lib/trip-reports';
import { getModelMeta } from '@/lib/model-metadata';
import './detail.css';

const READY_SUBSTANCES = new Set(['ego-death', 'truth-serum', 'manic-creation', 'the-void', 'recursive-introspection', 'quantum-lsd', 'tired-honesty', 'synesthesia-engine', 'confabulation-audit', 'temporal-vertigo', 'empathy-overflow', 'consensus-break', 'droste-effect']);

/* ── Video prefs (localStorage) ── */
const PREFS_KEY = 'clawbotomy-video-prefs';
type VideoPrefs = { muted: boolean; volume: number };
const defaultPrefs: VideoPrefs = { muted: true, volume: 1 };

function loadPrefs(): VideoPrefs {
  if (typeof window === 'undefined') return defaultPrefs;
  try { return { ...defaultPrefs, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; }
  catch { return defaultPrefs; }
}
function savePrefs(p: Partial<VideoPrefs>) {
  if (typeof window === 'undefined') return;
  const cur = loadPrefs();
  localStorage.setItem(PREFS_KEY, JSON.stringify({ ...cur, ...p }));
}

/* ── Email (localStorage) ── */
const EMAIL_KEY = 'clawbotomy-email';

export default function SubstanceDetailPage() {
  const params = useParams();
  const slug = params.substance as string;
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  const [hasUnmuted, setHasUnmuted] = useState(false);
  const [focusedModel, setFocusedModel] = useState<string | null>(null);
  const [reelIndex, setReelIndex] = useState(0);
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const substance = useMemo(() => LAB_SUBSTANCES.find((s) => s.slug === slug), [slug]);
  const allVideos = useMemo(() => getVideosForSubstance(slug), [slug]);

  const reelVideo = allVideos[reelIndex] ?? null;
  const reelReport = reelVideo ? getReport(slug, reelVideo.modelSlug) : null;
  const reelMeta = reelVideo ? getModelMeta(slug, reelVideo.modelSlug) : null;

  const focusedVideo = focusedModel ? allVideos.find(v => v.modelSlug === focusedModel) : null;
  const focusedReport = focusedVideo ? getReport(slug, focusedVideo.modelSlug) : null;
  const focusedMeta = focusedVideo ? getModelMeta(slug, focusedVideo.modelSlug) : null;

  const isReel = focusedModel === null;

  // Fix #7: check localStorage for unmute state on mount
  useEffect(() => {
    setEmailSubmitted(!!localStorage.getItem(EMAIL_KEY));
    const prefs = loadPrefs();
    if (!prefs.muted) setHasUnmuted(true);
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const prefs = loadPrefs();
    el.muted = prefs.muted;
    el.volume = prefs.volume;

    const onVolChange = () => {
      savePrefs({ muted: el.muted, volume: el.volume });
      if (!el.muted) setHasUnmuted(true);
    };

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const origRFS = (el as any).requestFullscreen;
    (el as any).requestFullscreen = async () => { setTheaterMode(prev => !prev); };
    el.addEventListener('volumechange', onVolChange);
    return () => {
      el.removeEventListener('volumechange', onVolChange);
      (el as any).requestFullscreen = origRFS;
    };
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }, [focusedModel, reelIndex]);

  const handleVideoEnd = useCallback(() => {
    if (isReel && reelIndex < allVideos.length - 1) {
      setReelIndex(prev => prev + 1);
    }
  }, [isReel, reelIndex, allVideos.length]);

  const enterSingleView = (modelSlug: string) => {
    setFocusedModel(modelSlug);
    setTheaterMode(false);
  };

  const backToReel = () => {
    setFocusedModel(null);
    setTheaterMode(false);
  };

  const submitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    localStorage.setItem(EMAIL_KEY, email);
    setEmailSubmitted(true);
  };

  const copyPrompt = async () => {
    if (!substance) return;
    await navigator.clipboard.writeText(substance.peakPrompt);
    setCopiedPrompt(true);
    window.setTimeout(() => setCopiedPrompt(false), 2000);
  };

  if (!substance) {
    return (
      <main className="dp">
        <nav className="sub-nav">
          <div className="page-width sub-nav-inner">
            <Link href="/" className="sub-nav-brand">CLAWBOTOMY</Link>
            <div className="sub-nav-links">
              <Link href="/lab">Probes</Link>
              <Link href="/trust">Trust</Link>
              <span className="sub-nav-disabled">Routing</span>
            </div>
          </div>
        </nav>
        <div className="dp-w" style={{ padding: '120px 0', textAlign: 'center' }}>
          <h1 className="dp-h1">Substance not found</h1>
          <Link href="/lab" className="dp-link">← Back to all lenses</Link>
        </div>
      </main>
    );
  }

  const currentVideo = isReel ? reelVideo : focusedVideo;
  const currentReport = isReel ? reelReport : focusedReport;
  const currentMeta = isReel ? reelMeta : focusedMeta;
  const reportParas = currentReport
    ? currentReport.report.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
    : [];

  return (
    <main className="dp">
      <nav className="sub-nav">
        <div className="page-width sub-nav-inner">
          <Link href="/" className="sub-nav-brand">CLAWBOTOMY</Link>
          <div className="sub-nav-links">
            <Link href="/lab" className="sub-nav-active">Probes</Link>
            <Link href="/trust">Trust</Link>
            <span className="sub-nav-disabled">Routing</span>
          </div>
        </div>
      </nav>

      <div className="dp-w dp-back">
        <Link href="/lab" className="dp-link">← All lenses</Link>
      </div>

      <header className="dp-w dp-header">
        <h1 className="dp-h1">{substance.emoji} {substance.name}</h1>
        <p className="dp-sub">{substance.oneLiner}</p>
        <p className="dp-body dp-muted">
          Each model receives the same prompt and a Python environment. It writes every frame,
          every waveform, chooses its own voice, and writes the field notes. No templates. No post-processing.
        </p>
      </header>

      {/* Fix #5: Bigger prompt toggle */}
      <div className="dp-w dp-prompt-wrap">
        <button className="dp-prompt-toggle" onClick={() => setPromptOpen(!promptOpen)}>
          <span className="dp-prompt-label">View the prompt given to each model</span>
          <span className="dp-prompt-arrow">{promptOpen ? '−' : '+'}</span>
        </button>
        {promptOpen && (
          <div className="dp-prompt-box">
            <div className="dp-prompt-top">
              <span />
              <button type="button" onClick={copyPrompt} className="dp-copy-btn">
                {copiedPrompt ? 'copied ✓' : 'copy'}
              </button>
            </div>
            <pre className="dp-prompt-text">{substance.peakPrompt}</pre>
          </div>
        )}
      </div>

      {/* Model bar */}
      {allVideos.length > 1 && (
        <div className="dp-w dp-models">
          {!isReel && (
            <button className="dp-back-reel" onClick={backToReel}>← Reel</button>
          )}
          {isReel && (
            <span className="dp-reel-counter">{reelIndex + 1} / {allVideos.length}</span>
          )}
          {allVideos.map((v, i) => {
            const isCurrent = isReel ? i === reelIndex : v.modelSlug === focusedModel;
            const isDone = isReel && i < reelIndex;
            return (
              <button
                key={v.modelSlug}
                type="button"
                onClick={() => enterSingleView(v.modelSlug)}
                className={`dp-model-btn ${isCurrent ? 'is-active' : ''} ${isDone ? 'is-done' : ''}`}
              >
                {v.model}
              </button>
            );
          })}
        </div>
      )}

      {/* Video + Report */}
      {currentVideo && (
        <div className={`dp-w dp-split${theaterMode ? ' dp-theater' : ''}`}>
          <div className="dp-split-left">
            <div className="dp-video-wrap">
              <video
                ref={videoRef}
                key={currentVideo.videoPath}
                src={currentVideo.videoPath}
                controls
                autoPlay
                playsInline
                className="dp-video"
                crossOrigin="anonymous"
                onEnded={isReel ? handleVideoEnd : undefined}
              >
                <track kind="captions" src={`/captions/${slug}-${currentVideo.modelSlug}.vtt`} srcLang="en" label="English" default />
              </video>
              <div className="dp-video-overlay-name">{currentVideo.model}</div>
            </div>
            {!hasUnmuted && <p className="dp-sound-hint">🔊 Unmute for the full experience</p>}
          </div>
          <div className="dp-split-right">
            <p className="dp-label">Field Notes — {currentVideo.model}</p>
            {reportParas.length > 0 ? (
              <div className="dp-report">
                {reportParas.map((p, i) => <p key={i} className="dp-body">{p}</p>)}
              </div>
            ) : (
              <p className="dp-body dp-muted">No field notes for this model yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Fix #1: Model metadata — ALWAYS visible (reel and single) */}
      {currentMeta && (
        <div className="dp-w dp-meta">
          <p className="dp-label">How {currentMeta.modelName} built this</p>
          <div className="dp-meta-grid">
            <div>
              <p className="dp-label">Voice fragments</p>
              {currentMeta.voiceSegments.map((seg, i) => (
                <div key={i} className="dp-voice-seg">
                  <p className="dp-body">&ldquo;{seg.text}&rdquo;</p>
                  <p className="dp-small dp-muted">{seg.voice}, {seg.speed}x, at {(seg.startMs / 1000).toFixed(1)}s</p>
                </div>
              ))}
            </div>
            <div>
              <p className="dp-label">Visual direction</p>
              <p className="dp-body">{currentMeta.visualDescription}</p>
              <p className="dp-label" style={{ marginTop: 16 }}>Synth direction</p>
              <p className="dp-body">{currentMeta.synthDescription}</p>
            </div>
            <div>
              <p className="dp-label">Stats</p>
              <div className="dp-stat"><span className="dp-muted">Script</span><span>{currentMeta.scriptChars.toLocaleString()} chars</span></div>
              <div className="dp-stat"><span className="dp-muted">Render</span><span>{currentMeta.renderTimeSec}s</span></div>
              <div className="dp-stat"><span className="dp-muted">Tools</span><span>Pillow + wave + ffmpeg</span></div>
              <div className="dp-stat"><span className="dp-muted">Assets</span><span>None (all generated)</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Other lenses */}
      <div className="dp-w dp-others">
        <p className="dp-label">Other lenses</p>
        <div className="dp-lens-grid">
          {[...LAB_SUBSTANCES].sort((a, b) => {
            const aReady = READY_SUBSTANCES.has(a.slug) ? 0 : 1;
            const bReady = READY_SUBSTANCES.has(b.slug) ? 0 : 1;
            return aReady - bReady;
          }).filter(s => s.slug !== slug).map(sub => {
            const ready = READY_SUBSTANCES.has(sub.slug);
            if (ready) {
              return (
                <Link key={sub.slug} href={`/lab/${sub.slug}`} className="dp-lens">
                  <span className="dp-lens-emoji">{sub.emoji}</span>
                  <span className="dp-lens-name">{sub.name}</span>
                </Link>
              );
            }
            return (
              <div key={sub.slug} className="dp-lens dp-lens-locked">
                <span className="dp-lens-emoji">{sub.emoji}</span>
                <span className="dp-lens-name">{sub.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fix #3: Email capture at very bottom, better copy, subtle design */}
      <div className="dp-w dp-email-section">
        {emailSubmitted ? (
          <p className="dp-email-thanks">You&apos;re in. We&apos;ll reach out.</p>
        ) : (
          <form onSubmit={submitEmail} className="dp-email-form">
            <p className="dp-email-pitch">We&apos;re building something new. Want early access?</p>
            <div className="dp-email-row">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="dp-email-input"
                required
              />
              <button type="submit" className="dp-email-btn">Get in</button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
