'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

import { EXAMPLE_REPORTS } from '@/lib/example-reports';
import { LAB_SUBSTANCES } from '@/lib/lab-substances';
import { getVideosForSubstance } from '@/lib/video-gallery-data';

function paragraphize(text: string) {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

export default function SubstanceDetailPage() {
  const params = useParams();
  const slug = params.substance as string;
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [activeModel, setActiveModel] = useState<string | null>(null);

  const substance = useMemo(
    () => LAB_SUBSTANCES.find((s) => s.slug === slug),
    [slug]
  );

  const example = useMemo(
    () => EXAMPLE_REPORTS.find((ex) => ex.substance_slug === slug) ?? null,
    [slug]
  );

  const allVideos = useMemo(() => getVideosForSubstance(slug), [slug]);
  const paragraphs = useMemo(() => paragraphize(example?.report ?? ''), [example]);

  // Pick active video
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
        <div className="lab-atmosphere" aria-hidden="true">
          <div className="lab-vignette-v2" />
        </div>
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
        {/* Back */}
        <section className="lab-detail-header">
          <div className="page-width">
            <Link href="/lab" className="lab-back-link">← All lenses</Link>
          </div>
        </section>

        {/* Substance Hero */}
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
              <p className="lab-detail-lens">{substance.lensPrompt}</p>
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
              <div className="lab-cli-block" style={{ marginTop: 12 }}>
                <code>
                  <span className="lab-cli-dim">$</span> clawbotomy lab --substance {substance.slug}
                </code>
              </div>
            </div>
          </div>
        </section>

        {/* Video Section */}
        {allVideos.length > 0 && (
          <section className="lab-runs-section">
            <div className="page-width">
              {hasMultipleModels ? (
                <>
                  <h2 className="lab-runs-heading">
                    Same substance. {allVideos.length} models. Compare.
                  </h2>
                  <p className="lab-runs-sub">
                    Each model received the same prompt and the same creative tools (Pillow, wave, ffmpeg).
                    Every visual, every sound, and every voice fragment was the model&apos;s choice.
                  </p>

                  {/* Model selector */}
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
                </>
              ) : (
                <h2 className="lab-runs-heading">1 run recorded</h2>
              )}

              {/* Active video */}
              {selectedVideo && (
                <div className="lab-run-card">
                  <div className="lab-run-header">
                    <div>
                      <p className="lab-meta-label">MODEL</p>
                      <p className="lab-meta-value">{selectedVideo.model}</p>
                    </div>
                    <div>
                      <p className="lab-meta-label">DURATION</p>
                      <p className="lab-meta-value">{selectedVideo.durationSec}s</p>
                    </div>
                    <div className="lab-run-badges">
                      <span className="lab-badge">▶ video</span>
                      <span className="lab-badge">🔊 audio</span>
                    </div>
                  </div>
                  <div className="lab-run-content">
                    <div className="lab-run-video-wrap">
                      <video
                        key={selectedVideo.videoPath}
                        src={selectedVideo.videoPath}
                        controls
                        autoPlay
                        playsInline
                        className="lab-run-video"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* How this was made */}
        {allVideos.length > 0 && (
          <section className="lab-how-section">
            <div className="page-width">
              <p className="lab-how-eyebrow">HOW THIS WAS MADE</p>
              <p className="lab-how-text">
                We gave the model a Python environment (Pillow + wave + ffmpeg) and the substance prompt.
                It wrote the entire render script: every frame, every waveform, every creative decision.
                Then it wrote its own voice fragments and chose which TTS voice to deliver them.
                No templates. No filters. The code is the art.
              </p>
            </div>
          </section>
        )}

        {/* Field Notes (if we have text report) */}
        {paragraphs.length > 0 && (
          <section className="lab-notes-section">
            <div className="page-width">
              <h2 className="lab-runs-heading">Field Notes</h2>
              <div className="lab-run-notes">
                {paragraphs.map((p, i) => (
                  <p key={i} className="lab-run-paragraph">{p}</p>
                ))}
              </div>
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
                const hasNotes = !!EXAMPLE_REPORTS.find((ex) => ex.substance_slug === sub.slug);
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
                      {hasNotes && <span className="lab-badge">notes</span>}
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
