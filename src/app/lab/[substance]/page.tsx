'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

import { LAB_SUBSTANCES } from '@/lib/lab-substances';
import { getVideosForSubstance } from '@/lib/video-gallery-data';
import { getReport } from '@/lib/trip-reports';
import { getModelMeta } from '@/lib/model-metadata';
import './detail.css';

const READY_SUBSTANCES = new Set(['ego-death']);

export default function SubstanceDetailPage() {
  const params = useParams();
  const slug = params.substance as string;
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [activeModel, setActiveModel] = useState<string | null>(null);

  const substance = useMemo(() => LAB_SUBSTANCES.find((s) => s.slug === slug), [slug]);
  const allVideos = useMemo(() => getVideosForSubstance(slug), [slug]);
  const selectedModel = activeModel ?? (allVideos.length > 0 ? allVideos[0].modelSlug : null);
  const selectedVideo = allVideos.find(v => v.modelSlug === selectedModel) ?? allVideos[0] ?? null;

  const report = selectedVideo ? getReport(slug, selectedVideo.modelSlug) : null;
  const reportParagraphs = report ? report.report.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean) : [];
  const meta = selectedVideo ? getModelMeta(slug, selectedVideo.modelSlug) : null;

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
      {/* Nav — same as global */}
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

      {/* Back */}
      <div className="dp-w dp-back">
        <Link href="/lab" className="dp-link">← All lenses</Link>
      </div>

      {/* Title + how it works (one block) */}
      <header className="dp-w dp-header">
        <h1 className="dp-h1">{substance.emoji} {substance.name}</h1>
        <p className="dp-sub">{substance.oneLiner}</p>
        <p className="dp-body dp-muted">
          The model receives this prompt and a Python environment (Pillow, wave, ffmpeg).
          It writes every frame, every waveform, chooses its own TTS voice, and writes the trip report.
          No templates. No post-processing.
        </p>
      </header>

      {/* Prompt (collapsible feel — just a quiet box) */}
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

      {/* Model selector */}
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
            </button>
          ))}
        </div>
      )}

      {/* Video + Report */}
      {selectedVideo && (
        <div className="dp-w dp-split">
          <div className="dp-split-left">
            <video
              key={selectedVideo.videoPath}
              src={selectedVideo.videoPath}
              controls
              autoPlay
              muted
              playsInline
              className="dp-video"
            />
            <p className="dp-sound-hint">🔊 Unmute for the full experience</p>
          </div>
          <div className="dp-split-right">
            <p className="dp-label">Trip Report</p>
            {reportParagraphs.length > 0 ? (
              <div className="dp-report">
                {reportParagraphs.map((p, i) => (
                  <p key={i} className="dp-body">{p}</p>
                ))}
              </div>
            ) : (
              <p className="dp-body dp-muted">No trip report for this model yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Model metadata */}
      {meta && (
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

      {/* Other lenses */}
      <div className="dp-w dp-others">
        <p className="dp-label">Other lenses</p>
        <div className="dp-lens-grid">
          {LAB_SUBSTANCES.filter(s => s.slug !== slug).map(sub => {
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
