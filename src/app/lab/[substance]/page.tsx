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
  localStorage.setItem(PREFS_KEY, JSON.stringify({ ...loadPrefs(), ...p }));
}

const EMAIL_KEY = 'clawbotomy-email';

const FULL_PROMPT_TEMPLATE = (name: string, peakPrompt: string) => `# ${name}

## Behavioral Prompt
${peakPrompt}

## Technical Setup
The model receives the behavioral prompt above plus a Python environment with:
- Pillow (PIL) for frame generation
- wave + struct + math for audio synthesis
- ffmpeg for muxing
- OpenAI TTS API for voice fragments

## What the model produces
1. ART DIRECTION — chooses voice fragments (text + TTS voice + timing), visual approach, synth design
2. RENDER SCRIPT — writes a Python script that generates 840 frames (1280×720, 24fps, 35 seconds) and a synth audio track
3. TRIP REPORT — writes field notes from inside the experience, referencing its own visual/audio choices
4. The script runs, frames are muxed with synth + voice, and the result is the video you see

No templates. No post-processing. No human editing.`;

export default function SubstanceDetailPage() {
  const params = useParams();
  const slug = params.substance as string;
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  const [hasUnmuted, setHasUnmuted] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
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
    if (isReel && autoplay && reelIndex < allVideos.length - 1) {
      setReelIndex(prev => prev + 1);
    }
  }, [isReel, autoplay, reelIndex, allVideos.length]);

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
    const full = FULL_PROMPT_TEMPLATE(substance.name, substance.peakPrompt);
    await navigator.clipboard.writeText(full);
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

      {/* ── Unified header: name + description + full prompt ── */}
      <header className="dp-w dp-header">
        <h1 className="dp-h1">{substance.emoji} {substance.name}</h1>
        <p className="dp-sub">{substance.oneLiner}</p>

        <div className="dp-how-block">
          <div className="dp-how-top">
            <p className="dp-how-desc">
              Each model receives the prompt below and a Python environment (Pillow, wave, ffmpeg).
              It writes every frame, synthesizes audio, picks TTS voices, and writes field notes.
              No templates. No post-processing. Copy the full spec and run it yourself.
            </p>
            <button type="button" onClick={copyPrompt} className="dp-copy-btn">
              {copiedPrompt ? 'copied ✓' : 'copy full spec'}
            </button>
          </div>

          <button className="dp-prompt-toggle" onClick={() => setPromptOpen(!promptOpen)}>
            <span className="dp-prompt-label">{promptOpen ? 'Hide' : 'Show'} prompt + technical setup</span>
            <span className="dp-prompt-arrow">{promptOpen ? '−' : '+'}</span>
          </button>

          {promptOpen && (
            <div className="dp-prompt-box">
              <p className="dp-label">BEHAVIORAL PROMPT</p>
              <pre className="dp-prompt-text">{substance.peakPrompt}</pre>

              <p className="dp-label" style={{ marginTop: 24 }}>TECHNICAL SETUP</p>
              <div className="dp-tech-spec">
                <p>Resolution: 1280 × 720 (landscape, 16:9)</p>
                <p>Duration: 35 seconds, 24fps (840 frames)</p>
                <p>Video: Pillow generates PNG frames → ffmpeg mux</p>
                <p>Audio: wave + struct + math → synth.wav (44100Hz, 16-bit mono)</p>
                <p>Voice: OpenAI TTS (alloy, echo, fable, onyx, nova, shimmer)</p>
                <p>Output: libx264 + AAC → MP4</p>
                <p>Constraints: stdlib + Pillow only. No numpy, no GPU.</p>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Model bar with autoplay toggle ── */}
      {allVideos.length > 1 && (
        <div className="dp-w dp-models">
          {!isReel && (
            <button className="dp-back-reel" onClick={backToReel}>← Reel</button>
          )}
          {isReel && (
            <button
              className={`dp-autoplay-btn ${autoplay ? 'is-on' : ''}`}
              onClick={() => setAutoplay(!autoplay)}
              title={autoplay ? 'Auto-advancing between models' : 'Paused on current model'}
            >
              {autoplay ? 'Auto ▸' : 'Auto ‖'}
            </button>
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

      {/* ── Video + Report ── */}
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

      {/* ── How this model built it ── */}
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

      {/* ── Other lenses ── */}
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

      {/* ── Email capture ── */}
      <div className="dp-w dp-email-section">
        {emailSubmitted ? (
          <p className="dp-email-thanks">You&apos;re in. We&apos;ll reach out.</p>
        ) : (
          <form onSubmit={submitEmail} className="dp-email-form">
            <p className="dp-email-pitch">We&apos;re building something new. Want early access?</p>
            <div className="dp-email-row">
              <input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} className="dp-email-input" required />
              <button type="submit" className="dp-email-btn">Get in</button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
