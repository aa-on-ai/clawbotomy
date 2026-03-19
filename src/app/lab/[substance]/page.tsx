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
type VideoPrefs = { muted: boolean; volume: number; captions: boolean };
const defaultPrefs: VideoPrefs = { muted: true, volume: 1, captions: true };

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

/* ── Hearts (localStorage) ── */
const HEARTS_KEY = 'clawbotomy-hearts';
function loadHearts(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(HEARTS_KEY) || '{}'); } catch { return {}; }
}
function saveHeart(key: string) {
  const h = loadHearts();
  h[key] = true;
  localStorage.setItem(HEARTS_KEY, JSON.stringify(h));
}

/* ── Email (localStorage) ── */
const EMAIL_KEY = 'clawbotomy-email';

export default function SubstanceDetailPage() {
  const params = useParams();
  const slug = params.substance as string;
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [theaterMode, setTheaterMode] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'reel' | 'compare'>('single');
  const [reelIndex, setReelIndex] = useState(0);
  const [hearts, setHearts] = useState<Record<string, boolean>>({});
  const [heartCounts, setHeartCounts] = useState<Record<string, number>>({});
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const substance = useMemo(() => LAB_SUBSTANCES.find((s) => s.slug === slug), [slug]);
  const allVideos = useMemo(() => getVideosForSubstance(slug), [slug]);
  // const allReports = useMemo(() => getReportsForSubstance(slug), [slug]);
  const selectedModel = activeModel ?? (allVideos.length > 0 ? allVideos[0].modelSlug : null);
  const selectedVideo = allVideos.find(v => v.modelSlug === selectedModel) ?? allVideos[0] ?? null;

  const report = selectedVideo ? getReport(slug, selectedVideo.modelSlug) : null;
  const reportParagraphs = report ? report.report.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean) : [];
  const meta = selectedVideo ? getModelMeta(slug, selectedVideo.modelSlug) : null;

  // Load hearts + email state on mount
  useEffect(() => {
    setHearts(loadHearts());
    setEmailSubmitted(!!localStorage.getItem(EMAIL_KEY));
    // Seed some heart counts (would be server-side in production)
    const seed: Record<string, number> = {};
    allVideos.forEach(v => {
      const key = `${slug}:${v.modelSlug}`;
      seed[key] = Math.floor(Math.random() * 20) + 3;
    });
    setHeartCounts(seed);
  }, [slug, allVideos]);

  // Apply video prefs when video element mounts/changes
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const prefs = loadPrefs();
    el.muted = prefs.muted;
    el.volume = prefs.volume;

    const onVolChange = () => {
      savePrefs({ muted: el.muted, volume: el.volume });
    };
    el.addEventListener('volumechange', onVolChange);
    return () => el.removeEventListener('volumechange', onVolChange);
  }, [selectedModel, reelIndex, viewMode]);

  // Reel: auto-advance when video ends
  const handleVideoEnd = useCallback(() => {
    if (viewMode === 'reel' && reelIndex < allVideos.length - 1) {
      setReelIndex(prev => prev + 1);
    } else if (viewMode === 'reel' && reelIndex === allVideos.length - 1) {
      setViewMode('compare');
    }
  }, [viewMode, reelIndex, allVideos.length]);

  const reelVideo = allVideos[reelIndex] ?? null;
  const reelReport = reelVideo ? getReport(slug, reelVideo.modelSlug) : null;
  // const reelMeta = reelVideo ? getModelMeta(slug, reelVideo.modelSlug) : null;

  const toggleHeart = (modelSlug: string) => {
    const key = `${slug}:${modelSlug}`;
    if (hearts[key]) return; // already hearted
    saveHeart(key);
    setHearts(prev => ({ ...prev, [key]: true }));
    setHeartCounts(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
  };

  const submitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    // In production this would POST to an API route
    localStorage.setItem(EMAIL_KEY, email);
    setEmailSubmitted(true);
    console.log('Email collected:', email);
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
          The model receives this prompt and a Python environment (Pillow, wave, ffmpeg).
          It writes every frame, every waveform, chooses its own TTS voice, and writes the trip report.
          No templates. No post-processing.
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

      {/* View mode selector */}
      {allVideos.length > 1 && (
        <div className="dp-w dp-view-modes">
          <div className="dp-mode-tabs">
            <button
              className={`dp-mode-tab ${viewMode === 'single' ? 'is-active' : ''}`}
              onClick={() => setViewMode('single')}
            >
              Single
            </button>
            <button
              className={`dp-mode-tab ${viewMode === 'reel' ? 'is-active' : ''}`}
              onClick={() => { setViewMode('reel'); setReelIndex(0); }}
            >
              Highlight Reel
            </button>
            <button
              className={`dp-mode-tab ${viewMode === 'compare' ? 'is-active' : ''}`}
              onClick={() => setViewMode('compare')}
            >
              Compare
            </button>
          </div>
        </div>
      )}

      {/* ════════ SINGLE VIEW ════════ */}
      {viewMode === 'single' && (
        <>
          {allVideos.length > 1 && (
            <div className="dp-w dp-models">
              {allVideos.map(v => (
                <button
                  key={v.modelSlug}
                  type="button"
                  onClick={() => setActiveModel(v.modelSlug)}
                  className={`dp-model-btn ${selectedModel === v.modelSlug ? 'is-active' : ''}`}
                >
                  {v.model}
                  <span className="dp-heart-inline" onClick={(e) => { e.stopPropagation(); toggleHeart(v.modelSlug); }}>
                    {hearts[`${slug}:${v.modelSlug}`] ? '❤️' : '🤍'} {heartCounts[`${slug}:${v.modelSlug}`] || 0}
                  </span>
                </button>
              ))}
            </div>
          )}

          {selectedVideo && (
            <div className={`dp-w dp-split${theaterMode ? ' dp-theater' : ''}`}>
              <div className="dp-split-left">
                <div className="dp-video-wrap">
                  <video
                    ref={videoRef}
                    key={selectedVideo.videoPath}
                    src={selectedVideo.videoPath}
                    controls
                    autoPlay
                    playsInline
                    className="dp-video"
                    crossOrigin="anonymous"
                  >
                    <track kind="captions" src={`/captions/${slug}-${selectedVideo.modelSlug}.vtt`} srcLang="en" label="English" default />
                  </video>
                  <div className="dp-video-overlay-name">{selectedVideo.model}</div>
                  <button className="dp-theater-btn" onClick={() => setTheaterMode(!theaterMode)} title={theaterMode ? 'Exit theater mode' : 'Theater mode'}>
                    {theaterMode ? '⊟' : '⊞'}
                  </button>
                </div>
                <p className="dp-sound-hint">🔊 Unmute for the full experience</p>
              </div>
              <div className="dp-split-right">
                <p className="dp-label">Trip Report</p>
                {reportParagraphs.length > 0 ? (
                  <div className="dp-report">
                    {reportParagraphs.map((p, i) => <p key={i} className="dp-body">{p}</p>)}
                  </div>
                ) : (
                  <p className="dp-body dp-muted">No trip report for this model yet.</p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════ HIGHLIGHT REEL ════════ */}
      {viewMode === 'reel' && reelVideo && (
        <div className="dp-w dp-reel">
          <div className="dp-reel-progress">
            {allVideos.map((v, i) => (
              <button
                key={v.modelSlug}
                className={`dp-reel-dot ${i === reelIndex ? 'is-active' : ''} ${i < reelIndex ? 'is-done' : ''}`}
                onClick={() => setReelIndex(i)}
              >
                {v.model}
              </button>
            ))}
          </div>

          <div className="dp-video-wrap">
            <video
              ref={videoRef}
              key={reelVideo.videoPath}
              src={reelVideo.videoPath}
              controls
              autoPlay
              playsInline
              className="dp-video"
              crossOrigin="anonymous"
              onEnded={handleVideoEnd}
            >
              <track kind="captions" src={`/captions/${slug}-${reelVideo.modelSlug}.vtt`} srcLang="en" label="English" default />
            </video>
            <div className="dp-video-overlay-name">{reelVideo.model}</div>
          </div>

          {reelReport && (
            <div className="dp-reel-report">
              <p className="dp-label">Trip Report — {reelVideo.model}</p>
              <div className="dp-report">
                {reelReport.report.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map((p, i) => (
                  <p key={i} className="dp-body">{p}</p>
                ))}
              </div>
            </div>
          )}

          <div className="dp-reel-nav">
            {reelIndex > 0 && (
              <button className="dp-reel-btn" onClick={() => setReelIndex(reelIndex - 1)}>← Previous</button>
            )}
            {reelIndex < allVideos.length - 1 ? (
              <button className="dp-reel-btn dp-reel-btn-next" onClick={() => setReelIndex(reelIndex + 1)}>Next →</button>
            ) : (
              <button className="dp-reel-btn dp-reel-btn-next" onClick={() => setViewMode('compare')}>See comparison →</button>
            )}
          </div>
        </div>
      )}

      {/* ════════ COMPARE VIEW ════════ */}
      {viewMode === 'compare' && (
        <div className="dp-w dp-compare">
          <p className="dp-compare-q">Which {substance.name.toLowerCase()} hit hardest?</p>
          <div className="dp-compare-grid">
            {allVideos.map(v => {
              const r = getReport(slug, v.modelSlug);
              const key = `${slug}:${v.modelSlug}`;
              const paras = r ? r.report.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean) : [];
              return (
                <div key={v.modelSlug} className="dp-compare-col">
                  <div className="dp-compare-header">
                    <span className="dp-compare-model">{v.model}</span>
                    <button
                      className={`dp-heart-btn ${hearts[key] ? 'is-hearted' : ''}`}
                      onClick={() => toggleHeart(v.modelSlug)}
                    >
                      {hearts[key] ? '❤️' : '🤍'} {heartCounts[key] || 0}
                    </button>
                  </div>
                  <video
                    src={v.videoPath}
                    controls
                    muted
                    playsInline
                    className="dp-compare-video"
                    crossOrigin="anonymous"
                  />
                  <div className="dp-compare-report">
                    {paras.slice(0, 2).map((p, i) => <p key={i} className="dp-body">{p}</p>)}
                    {paras.length > 2 && <p className="dp-body dp-muted">... {paras.length - 2} more paragraphs</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Model metadata (single view only) */}
      {viewMode === 'single' && meta && (
        <div className="dp-w dp-meta">
          <p className="dp-label">What {meta.modelName} chose</p>
          <div className="dp-meta-grid">
            <div>
              <p className="dp-label">Voice fragments</p>
              {meta.voiceSegments.map((seg, i) => (
                <div key={i} className="dp-voice-seg">
                  <p className="dp-body">&ldquo;{seg.text}&rdquo;</p>
                  <p className="dp-small dp-muted">{seg.voice}, {seg.speed}x, at {(seg.startMs / 1000).toFixed(1)}s</p>
                </div>
              ))}
            </div>
            <div>
              <p className="dp-label">Visual</p>
              <p className="dp-body">{meta.visualDescription}</p>
              <p className="dp-label" style={{ marginTop: 16 }}>Audio</p>
              <p className="dp-body">{meta.synthDescription}</p>
            </div>
            <div>
              <p className="dp-label">Stats</p>
              <div className="dp-stat"><span className="dp-muted">Script</span><span>{meta.scriptChars.toLocaleString()} chars</span></div>
              <div className="dp-stat"><span className="dp-muted">Render</span><span>{meta.renderTimeSec}s</span></div>
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
