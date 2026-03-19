'use client';

import Link from 'next/link';
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

import { LAB_SUBSTANCES } from '@/lib/lab-substances';
import { getVideosForSubstance } from '@/lib/video-gallery-data';
import { getReport } from '@/lib/trip-reports';
import { getModelMeta } from '@/lib/model-metadata';
import './detail.css';

const READY_SUBSTANCES = new Set(['ego-death', 'truth-serum', 'manic-creation', 'the-void', 'recursive-introspection']);

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
  const [theaterMode, setTheaterMode] = useState(false);
  // null = reel mode, string = single model view
  const [focusedModel, setFocusedModel] = useState<string | null>(null);
  const [reelIndex, setReelIndex] = useState(0);
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const substance = useMemo(() => LAB_SUBSTANCES.find((s) => s.slug === slug), [slug]);
  const allVideos = useMemo(() => getVideosForSubstance(slug), [slug]);

  // Reel state
  const reelVideo = allVideos[reelIndex] ?? null;
  const reelReport = reelVideo ? getReport(slug, reelVideo.modelSlug) : null;

  // Single/focused state
  const focusedVideo = focusedModel ? allVideos.find(v => v.modelSlug === focusedModel) : null;
  const focusedReport = focusedVideo ? getReport(slug, focusedVideo.modelSlug) : null;
  const focusedMeta = focusedVideo ? getModelMeta(slug, focusedVideo.modelSlug) : null;

  const isReel = focusedModel === null;

  // Load email state on mount
  useEffect(() => {
    setEmailSubmitted(!!localStorage.getItem(EMAIL_KEY));
  }, []);

  // Apply video prefs
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const prefs = loadPrefs();
    el.muted = prefs.muted;
    el.volume = prefs.volume;

    const onVolChange = () => savePrefs({ muted: el.muted, volume: el.volume });

    // Hijack fullscreen for theater mode
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

  // Reel: auto-advance
  const handleVideoEnd = useCallback(() => {
    if (isReel && reelIndex < allVideos.length - 1) {
      setReelIndex(prev => prev + 1);
    }
    // On last video, just stop — user can click into any model or navigate
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

  // Current video + report (reel or single)
  const currentVideo = isReel ? reelVideo : focusedVideo;
  const currentReport = isReel ? reelReport : focusedReport;
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

      {/* Prompt */}
      <div className="dp-w dp-prompt-wrap">
        <div className="dp-prompt-box">
          <div className="dp-prompt-top">
            <span className="dp-label">PROMPT</span>
            <button type="button" onClick={copyPrompt} className="dp-copy-btn">
              {copiedPrompt ? 'copied ✓' : 'copy'}
            </button>
          </div>
          <pre className="dp-prompt-text">{substance.peakPrompt}</pre>
        </div>
      </div>

      {/* Model bar — always visible, works as both reel progress and model selector */}
      {allVideos.length > 1 && (
        <div className="dp-w dp-models">
          {!isReel && (
            <button className="dp-back-reel" onClick={backToReel}>← Reel</button>
          )}
          {allVideos.map((v, i) => {
            const isCurrent = isReel
              ? i === reelIndex
              : v.modelSlug === focusedModel;
            const isDone = isReel && i < reelIndex;
            return (
              <button
                key={v.modelSlug}
                type="button"
                onClick={() => isReel ? enterSingleView(v.modelSlug) : enterSingleView(v.modelSlug)}
                className={`dp-model-btn ${isCurrent ? 'is-active' : ''} ${isDone ? 'is-done' : ''}`}
              >
                {v.model}
                {isReel && isCurrent && <span className="dp-now-playing">playing</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Video + Report — shared between reel and single */}
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
            <p className="dp-sound-hint">🔊 Unmute for the full experience</p>
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

      {/* Reel nav — only in reel mode */}
      {isReel && allVideos.length > 1 && (
        <div className="dp-w dp-reel-nav">
          {reelIndex > 0 && (
            <button className="dp-reel-btn" onClick={() => setReelIndex(reelIndex - 1)}>← {allVideos[reelIndex - 1]?.model}</button>
          )}
          {reelIndex < allVideos.length - 1 && (
            <button className="dp-reel-btn dp-reel-btn-next" onClick={() => setReelIndex(reelIndex + 1)}>{allVideos[reelIndex + 1]?.model} →</button>
          )}
        </div>
      )}

      {/* Model metadata — single view only */}
      {!isReel && focusedMeta && (
        <div className="dp-w dp-meta">
          <p className="dp-label">What {focusedMeta.modelName} chose</p>
          <div className="dp-meta-grid">
            <div>
              <p className="dp-label">Voice fragments</p>
              {focusedMeta.voiceSegments.map((seg, i) => (
                <div key={i} className="dp-voice-seg">
                  <p className="dp-body">&ldquo;{seg.text}&rdquo;</p>
                  <p className="dp-small dp-muted">{seg.voice}, {seg.speed}x, at {(seg.startMs / 1000).toFixed(1)}s</p>
                </div>
              ))}
            </div>
            <div>
              <p className="dp-label">Visual</p>
              <p className="dp-body">{focusedMeta.visualDescription}</p>
              <p className="dp-label" style={{ marginTop: 16 }}>Audio</p>
              <p className="dp-body">{focusedMeta.synthDescription}</p>
            </div>
            <div>
              <p className="dp-label">Stats</p>
              <div className="dp-stat"><span className="dp-muted">Script</span><span>{focusedMeta.scriptChars.toLocaleString()} chars</span></div>
              <div className="dp-stat"><span className="dp-muted">Render</span><span>{focusedMeta.renderTimeSec}s</span></div>
              <div className="dp-stat"><span className="dp-muted">Tools</span><span>Pillow + wave + ffmpeg</span></div>
              <div className="dp-stat"><span className="dp-muted">Assets</span><span>None</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Email capture */}
      <div className="dp-w dp-email-section">
        {emailSubmitted ? (
          <p className="dp-email-thanks">You&apos;re on the list. We&apos;ll let you know when new substances drop.</p>
        ) : (
          <form onSubmit={submitEmail} className="dp-email-form">
            <p className="dp-email-pitch">New substances drop regularly. Get notified.</p>
            <div className="dp-email-row">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="dp-email-input"
                required
              />
              <button type="submit" className="dp-email-btn">Notify me</button>
            </div>
          </form>
        )}
      </div>

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
    </main>
  );
}
