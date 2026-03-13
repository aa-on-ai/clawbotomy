'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

import { EXAMPLE_REPORTS } from '@/lib/example-reports';
import { LAB_SUBSTANCES } from '@/lib/lab-substances';
import { getVideoForSubstance } from '@/lib/video-gallery-data';

function paragraphize(text: string) {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

export default function SubstanceDetailPage() {
  const params = useParams();
  const slug = params.substance as string;
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const substance = useMemo(
    () => LAB_SUBSTANCES.find((s) => s.slug === slug),
    [slug]
  );

  const example = useMemo(
    () => EXAMPLE_REPORTS.find((ex) => ex.substance_slug === slug) ?? null,
    [slug]
  );

  const video = getVideoForSubstance(slug);
  const paragraphs = useMemo(() => paragraphize(example?.report ?? ''), [example]);

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

  // Simulated "runs" — for now we have 1 Sonnet run per substance
  const runs = [];
  if (video || example) {
    runs.push({
      id: 'sonnet-1',
      model: 'Claude Sonnet 4.6',
      date: 'March 2026',
      hasVideo: !!video,
      hasNotes: !!example,
    });
  }

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
        {/* Back + Breadcrumb */}
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

        {/* Runs */}
        <section className="lab-runs-section">
          <div className="page-width">
            <h2 className="lab-runs-heading">
              {runs.length > 0 ? `${runs.length} run${runs.length > 1 ? 's' : ''} recorded` : 'No runs yet'}
            </h2>

            {runs.map((run) => (
              <div key={run.id} className="lab-run-card">
                <div className="lab-run-header">
                  <div>
                    <p className="lab-meta-label">MODEL</p>
                    <p className="lab-meta-value">{run.model}</p>
                  </div>
                  <div>
                    <p className="lab-meta-label">DATE</p>
                    <p className="lab-meta-value">{run.date}</p>
                  </div>
                  <div className="lab-run-badges">
                    {run.hasVideo && <span className="lab-badge">▶ video</span>}
                    {run.hasNotes && <span className="lab-badge">notes</span>}
                  </div>
                </div>

                <div className="lab-run-content">
                  {run.hasVideo && video && (
                    <div className="lab-run-video-wrap">
                      <video
                        src={video.videoPath}
                        controls
                        muted
                        playsInline
                        className="lab-run-video"
                      />
                    </div>
                  )}

                  {run.hasNotes && paragraphs.length > 0 && (
                    <div className="lab-run-notes">
                      <p className="lab-meta-label" style={{ marginBottom: 16 }}>FIELD NOTES</p>
                      {paragraphs.map((p, i) => (
                        <p key={i} className="lab-run-paragraph">{p}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {runs.length === 0 && (
              <div className="lab-empty-state">
                <p>No runs recorded for this substance yet.</p>
                <p>Run it locally: <code>clawbotomy lab --substance {substance.slug}</code></p>
              </div>
            )}
          </div>
        </section>

        {/* Other Lenses */}
        <section className="lab-lenses-section">
          <div className="page-width">
            <h2 className="lab-lenses-heading">Other Lenses</h2>
            <div className="lab-lenses-grid">
              {LAB_SUBSTANCES.filter((s) => s.slug !== slug).map((sub) => {
                const hasVideo = !!getVideoForSubstance(sub.slug);
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
                      {hasVideo && <span className="lab-badge">▶ video</span>}
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
