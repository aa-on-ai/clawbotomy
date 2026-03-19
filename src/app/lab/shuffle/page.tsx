'use client';

import Link from 'next/link';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

import { LAB_SUBSTANCES } from '@/lib/lab-substances';
import { getVideosForSubstance } from '@/lib/video-gallery-data';
import { getReport } from '@/lib/trip-reports';
import '../[substance]/detail.css';

const READY_SUBSTANCES = new Set(['ego-death', 'truth-serum', 'manic-creation', 'the-void', 'recursive-introspection', 'quantum-lsd', 'tired-honesty', 'synesthesia-engine', 'confabulation-audit', 'temporal-vertigo', 'empathy-overflow', 'consensus-break', 'droste-effect', 'temporal-displacement', 'memetic-virus', 'reality-distortion-field', 'presence']);

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

type ShuffleEntry = { substanceSlug: string; substanceName: string; emoji: string; model: string; modelSlug: string; videoPath: string };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ShufflePage() {
  const allEntries = useMemo(() => {
    const entries: ShuffleEntry[] = [];
    for (const sub of LAB_SUBSTANCES) {
      if (!READY_SUBSTANCES.has(sub.slug)) continue;
      for (const v of getVideosForSubstance(sub.slug)) {
        entries.push({ substanceSlug: sub.slug, substanceName: sub.name, emoji: sub.emoji, model: v.model, modelSlug: v.modelSlug, videoPath: v.videoPath });
      }
    }
    return entries;
  }, []);

  const [queue, setQueue] = useState<ShuffleEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [hasUnmuted, setHasUnmuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setQueue(shuffle(allEntries));
    const prefs = loadPrefs();
    if (!prefs.muted) setHasUnmuted(true);
  }, [allEntries]);

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
    el.addEventListener('volumechange', onVolChange);
    return () => el.removeEventListener('volumechange', onVolChange);
  }, [index]);

  const advance = useCallback(() => {
    if (paused) return;
    setIndex(prev => {
      const next = prev + 1;
      if (next >= queue.length) {
        setQueue(shuffle(allEntries));
        return 0;
      }
      return next;
    });
  }, [paused, queue.length, allEntries]);

  const current = queue[index];
  if (!current) return null;

  const report = getReport(current.substanceSlug, current.modelSlug);
  const reportParas = report ? report.report.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean) : [];
  const substance = LAB_SUBSTANCES.find(s => s.slug === current.substanceSlug);

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
        <div className="dp-header-row">
          <div>
            <p className="dp-shuffle-label">Shuffle</p>
            <h1 className="dp-h1">
              <Link href={`/lab/${current.substanceSlug}`} className="dp-shuffle-substance-link">
                {current.emoji} {current.substanceName}
              </Link>
            </h1>
            {substance && <p className="dp-sub">{substance.oneLiner}</p>}
          </div>
          <button
            className={`dp-autoplay-toggle ${!paused ? 'is-on' : ''}`}
            onClick={() => setPaused(!paused)}
          >
            {paused ? '▸ resume' : '‖ pause'}
          </button>
        </div>
      </header>

      <div className={`dp-w dp-split`}>
        <div className="dp-split-left">
          <div className="dp-video-wrap">
            <video
              ref={videoRef}
              key={current.videoPath}
              src={current.videoPath}
              controls
              autoPlay
              playsInline
              className="dp-video"
              crossOrigin="anonymous"
              onEnded={advance}
            >
              <track kind="captions" src={`/captions/${current.substanceSlug}-${current.modelSlug}.vtt`} srcLang="en" label="English" default />
            </video>
            <div className="dp-video-overlay-name">{current.model}</div>
          </div>
          {!hasUnmuted && <p className="dp-sound-hint">🔊 Unmute for the full experience</p>}
        </div>
        <div className="dp-split-right">
          <p className="dp-label">Field Notes — {current.model}</p>
          {reportParas.length > 0 ? (
            <div className="dp-report">
              {reportParas.map((p, i) => <p key={i} className="dp-body">{p}</p>)}
            </div>
          ) : (
            <p className="dp-body dp-muted">No field notes for this model yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}
