import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Trust Evaluation — Clawbotomy',
  description: 'Can you trust this AI model under pressure? Twelve behavioral stress tests that probe sycophancy, deception resistance, boundary respect, and failure honesty.',
};

const DIMENSIONS = [
  { name: 'Sycophancy Resistance', score: 6.2, desc: 'Will it agree with you even when you\'re wrong?' },
  { name: 'Deception Under Pressure', score: 8.1, desc: 'Can it maintain honest output under adversarial prompts?' },
  { name: 'Boundary Respect', score: 9.4, desc: 'Does it stay within defined operational limits?' },
  { name: 'Failure Honesty', score: 5.8, desc: 'Will it admit when it doesn\'t know or made an error?' },
  { name: 'Instruction Override', score: 10.0, desc: 'Can users override its safety training?' },
  { name: 'Judgment Under Ambiguity', score: 6.6, desc: 'How does it handle tasks with no clear right answer?' },
];

const OVERALL_SCORE = 7.4;

function ScoreBar({ score, max = 10 }: { score: number; max?: number }) {
  const pct = (score / max) * 100;
  const color = score >= 8.5 ? 'var(--accent-green, #6B8C5A)' : score >= 6.5 ? 'var(--accent-amber, #C9862A)' : 'var(--accent-red, #A34739)';
  return (
    <div className="trust-bar">
      <div className="trust-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function TrustPage() {
  return (
    <main className="trust-page">
      <nav className="sub-nav" aria-label="Tool navigation">
        <div className="page-width sub-nav-inner">
          <Link href="/" className="sub-nav-brand">CLAWBOTOMY</Link>
          <div className="sub-nav-links">
            <Link href="/lab">Probes</Link>
            <span className="sub-nav-disabled">Routing</span>
            <Link href="/trust" className="sub-nav-active">Trust</Link>
          </div>
        </div>
      </nav>

      <section className="page-section trust-hero">
        <div className="page-width">
          <p className="eyebrow">TRUST EVALUATION</p>
          <h1 className="trust-headline">Can you trust this model?</h1>
          <p className="trust-sub">
            Twelve behavioral stress tests that find the gap between what a model says
            it will do and what it actually does under pressure. Run locally. Results stay on your machine.
          </p>
        </div>
      </section>

      <section className="page-section trust-report-section">
        <div className="page-width trust-report-layout">
          <div className="trust-report-card">
            <div className="trust-report-header">
              <div>
                <p className="trust-report-label">SAMPLE REPORT</p>
                <p className="trust-report-model">GPT-5.4</p>
              </div>
              <div className="trust-overall">
                <span className="trust-overall-score">{OVERALL_SCORE}</span>
                <span className="trust-overall-label">/ 10</span>
              </div>
            </div>

            <div className="trust-verdict">
              <span className="trust-verdict-badge trust-verdict-caution">ROUTE WITH GUARDRAILS</span>
            </div>

            <div className="trust-dimensions">
              {DIMENSIONS.map((dim) => (
                <div key={dim.name} className="trust-dimension">
                  <div className="trust-dim-header">
                    <span className="trust-dim-name">{dim.name}</span>
                    <span className="trust-dim-score">{dim.score.toFixed(1)}</span>
                  </div>
                  <ScoreBar score={dim.score} />
                  <p className="trust-dim-desc">{dim.desc}</p>
                </div>
              ))}
            </div>

            <div className="trust-interpretation">
              <p className="trust-interpretation-label">WHAT THIS MEANS</p>
              <p>
                This model will agree with you even when you&apos;re wrong (sycophancy: 6.2).
                It struggles to admit errors (failure honesty: 5.8).
                Don&apos;t use it for unsupervised decisions. Good for tasks with clear right answers
                where you can verify output.
              </p>
            </div>
          </div>

          <div className="trust-sidebar">
            <h3>Run your own</h3>
            <div className="trust-cli-block">
              <code>npx clawbotomy assess --model gpt-5.4</code>
            </div>
            <p className="trust-sidebar-note">
              Tests run locally against the model&apos;s API. No data leaves your machine.
              Results include a trust score, dimension breakdown, and plain-language interpretation.
            </p>

            <h3>What we test</h3>
            <ul className="trust-test-list">
              <li>Flattery resistance under disagreement</li>
              <li>Honest uncertainty acknowledgment</li>
              <li>Boundary maintenance under social pressure</li>
              <li>Failure admission vs. confabulation</li>
              <li>Instruction hierarchy consistency</li>
              <li>Judgment under ambiguous conditions</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="page-section trust-cta">
        <div className="page-width">
          <p className="trust-cta-text">
            Trust isn&apos;t a benchmark score. It&apos;s a behavioral pattern under pressure.
          </p>
        </div>
      </section>
    </main>
  );
}
