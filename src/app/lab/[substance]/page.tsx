'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

import { LAB_SUBSTANCES } from '@/lib/lab-substances';
import { getVideosForSubstance } from '@/lib/video-gallery-data';
import { getReport } from '@/lib/trip-reports';

export default function SubstanceDetailPage() {
  const params = useParams();
  const slug = params.substance as string;
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [activeModel, setActiveModel] = useState<string | null>(null);

  const substance = useMemo(
    () => LAB_SUBSTANCES.find((s) => s.slug === slug),
    [slug]
  );

  const allVideos = useMemo(() => getVideosForSubstance(slug), [slug]);
  const selectedModel = activeModel ?? (allVideos.length > 0 ? allVideos[0].modelSlug : null);
  const selectedVideo = allVideos.find(v => v.modelSlug === selectedModel) ?? allVideos[0] ?? null;

  const copyPrompt = async () => {
    if (!substance) return;
    await navigator.clipboard.writeText(substance.peakPrompt);
    setCopiedPrompt(true);
    window.setTimeout(() => setCopiedPrompt(false), 2000);
  };

  if (!substance) {
    return (
      <main className="lab-page-v2">
        <nav className="sub-nav">
          <div className="page-width sub-nav-inner">
            <Link href="/" className="sub-nav-brand">CLAWBOTOMY</Link>
            <div className="sub-nav-links">
              <Link href="/lab" className="sub-nav-active">Probes</Link>
              <span className="sub-nav-disabled">Routing</span>
              <Link href="/trust">Trust</Link>
            </div>
          </div>
        </nav>
        <div className="lab-atmosphere" aria-hidden="true"><div className="lab-vignette-v2" /></div>
        <section className="page-section" style={{ padding: '120px 0', textAlign: 'center' }}>
          <div className="page-width">
            <h1 style={{ color: '#e7ddcf', marginBottom: 16 }}>Substance not found</h1>
            <Link href="/lab" style={{ color: '#8fd7cd' }}>← Back to all lenses</Link>
          </div>
        </section>
      </main>
    );
  }

  const hasMultipleModels = allVideos.length > 1;
  const report = selectedVideo ? getReport(slug, selectedVideo.modelSlug) : null;
  const reportParagraphs = report ? report.report.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean) : [];

  return (
    <main className="lab-page-v2">
      <nav className="sub-nav">
        <div className="page-width sub-nav-inner">
          <Link href="/" className="sub-nav-brand">CLAWBOTOMY</Link>
          <div className="sub-nav-links">
            <Link href="/lab" className="sub-nav-active">Probes</Link>
            <span className="sub-nav-disabled">Routing</span>
            <Link href="/trust">Trust</Link>
          </div>
        </div>
      </nav>

      <div className="lab-atmosphere" aria-hidden="true">
        <div className="lab-vignette-v2" />
        <div className="lab-grain-v2" />
      </div>

      <div className="lab-content is-ready">
        <section className="lab-detail-header">
          <div className="page-width">
            <Link href="/lab" className="lab-back-link">← All lenses</Link>
          </div>
        </section>

        {/* Substance info + prompt */}
        <section className="lab-detail-hero">
          <div className="page-width lab-detail-hero-grid">
            <div>
              <span className="lab-detail-emoji">{substance.emoji}</span>
              <h1 className="lab-detail-name">{substance.name}</h1>
              <p className="lab-detail-liner">{substance.oneLiner}</p>
              <div className="lab-detail-meta-row">
                <span>Chaos: {substance.chaosLevel}/13</span>
                <span>Dissolves: {substance.breaks_down}</span>
              </div>
            </div>

            <div className="lab-detail-prompt-area">
              <div className="lab-prompt-box">
                <div className="lab-prompt-top">
                  <span className="lab-meta-label">PROMPT</span>
                  <button type="button" onClick={copyPrompt} className="lab-copy-btn">
                    {copiedPrompt ? 'copied ✓' : 'copy'}
                  </button>
                </div>
                <pre className="lab-prompt-pre">{substance.peakPrompt}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS — prominent, above everything */}
        <section className="lab-how-callout">
          <div className="page-width">
            <div className="lab-how-card">
              <p className="lab-how-eyebrow">HOW THIS WORKS</p>
              <p className="lab-how-headline">The model wrote every pixel, every waveform, and every word you see below.</p>
              <p className="lab-how-detail">
                We gave it a Python environment (Pillow + wave + ffmpeg) and the substance prompt above. It wrote the render script,
                synthesized the audio, chose its own TTS voice, and wrote the trip report. No templates. No post-processing.
                The video and text are the raw output of a model under altered cognitive conditions.
              </p>
            </div>
          </div>
        </section>

        {/* Model selector */}
        {allVideos.length > 0 && (
          <section className="lab-runs-section">
            <div className="page-width">
              {hasMultipleModels && (
                <div className="lab-model-selector">
                  {allVideos.map(v => (
                    <button
                      key={v.modelSlug}
                      type="button"
                      onClick={() => setActiveModel(v.modelSlug)}
                      className={`lab-model-btn ${selectedModel === v.modelSlug ? 'is-active' : ''}`}
                    >
                      {v.model}
                    </button>
                  ))}
                </div>
              )}

              {/* Video + Report side by side */}
              {selectedVideo && (
                <div className="lab-run-split">
                  <div className="lab-run-video-col">
                    <p className="lab-meta-label">VIDEO — {selectedVideo.model}</p>
                    <video
                      key={selectedVideo.videoPath}
                      src={selectedVideo.videoPath}
                      controls
                      autoPlay
                      playsInline
                      className="lab-run-video"
                    />
                  </div>
                  <div className="lab-run-report-col">
                    <p className="lab-meta-label">TRIP REPORT — {selectedVideo.model}</p>
                    {reportParagraphs.length > 0 ? (
                      <div className="lab-run-report-text">
                        {reportParagraphs.map((p, i) => (
                          <p key={i} className="lab-report-paragraph">{p}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="lab-report-empty">No trip report recorded for this model yet.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Other Lenses */}
        <section className="lab-lenses-section">
          <div className="page-width">
            <h2 className="lab-lenses-heading">Other Lenses</h2>
            <div className="lab-lenses-grid">
              {LAB_SUBSTANCES.filter((s) => s.slug !== slug).map((sub) => {
                const subVideos = getVideosForSubstance(sub.slug);
                return (
                  <Link key={sub.slug} href={`/lab/${sub.slug}`} className="lab-lens-card">
                    <div className="lab-lens-top">
                      <span className="lab-lens-emoji">{sub.emoji}</span>
                      <span className="lab-lens-chaos">{sub.chaosLevel}/13</span>
                    </div>
                    <p className="lab-lens-name">{sub.name}</p>
                    <p className="lab-lens-liner">{sub.oneLiner}</p>
                    <div className="lab-lens-badges">
                      {subVideos.length > 0 && <span className="lab-badge">▶ {subVideos.length > 1 ? `${subVideos.length} models` : 'video'}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
