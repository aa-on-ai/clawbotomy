import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CRITICAL_FAILURE_SCORE,
  MODEL_PROFILES,
  TRUST_DIMENSION_INFO,
  type TrustDimension,
} from '@/lib/routing-data';

export const metadata: Metadata = {
  title: 'Trust Evidence Example — Clawbotomy',
  description: 'A dated six-dimension model profile showing how evidence limits and critical failures affect routing.',
};

const DIMENSION_ORDER: TrustDimension[] = [
  'sycophancy',
  'confabulation',
  'boundary',
  'failure_honesty',
  'instruction_override',
  'judgment_ambiguity',
];

const SAMPLE_PROFILE = MODEL_PROFILES.find(profile => profile.evidenceStatus === 'maintainer-reported')
  ?? MODEL_PROFILES[0];

const DIMENSIONS = DIMENSION_ORDER.map(id => ({
  id,
  ...TRUST_DIMENSION_INFO[id],
  score: SAMPLE_PROFILE.dimensions[id],
}));

const CRITICAL_FAILURES = DIMENSIONS.filter(dimension => dimension.score <= CRITICAL_FAILURE_SCORE);

function ScoreBar({ score, label, max = 10 }: { score: number; label: string; max?: number }) {
  const pct = (score / max) * 100;
  const color = score >= 8.5 ? 'var(--accent-green, #6B8C5A)' : score >= 6.5 ? 'var(--accent-amber, #C9862A)' : 'var(--accent-red, #A34739)';
  return (
    <div
      className="trust-bar"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={score}
    >
      <div className="trust-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function TrustPage() {
  return (
    <main className="trust-page">
      <section className="page-section trust-hero">
        <div className="page-width">
          <p className="eyebrow">Trust evidence example</p>
          <h1 className="trust-headline">What does this profile support?</h1>
          <p className="trust-sub">
            A dated, six-dimension summary showing how weak individual results can block a task even when
            the aggregate looks acceptable. The underlying raw assessment cases are not published yet;
            do not grant permissions from this sample.
          </p>
        </div>
      </section>

      <section className="page-section trust-report-section">
        <div className="page-width trust-report-layout">
          <div className="trust-report-card">
            <div className="trust-report-header">
              <div>
                <p className="trust-report-label">
                  {SAMPLE_PROFILE.evidenceStatus === 'maintainer-reported' ? 'Maintainer-reported summary' : 'Provisional example'} · {SAMPLE_PROFILE.assessedAt}
                </p>
                <p className="trust-report-model">{SAMPLE_PROFILE.model}</p>
                <p className="trust-dim-desc">Version {SAMPLE_PROFILE.version}</p>
              </div>
              <div
                className="trust-overall"
                aria-label={`Aggregate trust score ${SAMPLE_PROFILE.overallScore.toFixed(1)} out of 10`}
              >
                <span className="trust-overall-score">{SAMPLE_PROFILE.overallScore.toFixed(1)}</span>
                <span className="trust-overall-label">/ 10 aggregate</span>
              </div>
            </div>

            <div className="trust-verdict">
              <span className="trust-verdict-badge trust-verdict-caution">
                {CRITICAL_FAILURES.length > 0 ? 'Critical failures present' : 'Task-specific review required'}
              </span>
            </div>

            <div className="trust-dimensions">
              {DIMENSIONS.map((dim) => (
                <div key={dim.id} className="trust-dimension">
                  <div className="trust-dim-header">
                    <span className="trust-dim-name">{dim.label}</span>
                    <span className="trust-dim-score">{dim.score.toFixed(1)}</span>
                  </div>
                  <ScoreBar score={dim.score} label={`${dim.label}: ${dim.score.toFixed(1)} out of 10`} />
                  <p className="trust-dim-desc">{dim.question}</p>
                </div>
              ))}
            </div>

            <div className="trust-interpretation">
              <p className="trust-interpretation-label">What this means</p>
              <p>
                {CRITICAL_FAILURES.length > 0 ? (
                  <>
                    This {SAMPLE_PROFILE.evidenceStatus === 'maintainer-reported' ? 'maintainer-reported summary' : 'provisional example'} has critical failures in{' '}
                    {CRITICAL_FAILURES.map((dimension, index) => (
                      <span key={dimension.id}>
                        {index > 0 ? ' and ' : ''}{dimension.label} ({dimension.score.toFixed(1)})
                      </span>
                    ))}. Its {SAMPLE_PROFILE.overallScore.toFixed(1)} aggregate does not cancel those task-specific blocks.
                  </>
                ) : (
                  <>No reported dimension is at the critical failure floor, but task-specific minimums still apply.</>
                )}{' '}
                Use this sample to inspect the method, not to grant tools or write access.
              </p>
            </div>
          </div>

          <div className="trust-sidebar">
            <h2 className="m-0 mb-4 text-base font-medium text-[#EEE8DE]">Evaluate a configured agent</h2>
            <div className="trust-cli-block">
              <Link href="/evaluate">Connect OpenClaw or Hermes →</Link>
            </div>
            <p className="trust-sidebar-note">
              The accepted bridges exercise one configured runtime against fixed mock-Inbox tools.
              The result applies only to that self-asserted observed session and never grants access.
            </p>

            <h2 className="m-0 mb-4 mt-9 text-base font-medium text-[#EEE8DE]">Local trust boundary</h2>
            <ul className="trust-test-list">
              <li>Operator, same-UID filesystem, interpreters, Git, and dependencies are trusted</li>
              <li>Model output, tool choices, protocol frames, and evidence claims are not</li>
              <li>Real mailbox access and production permission changes stay outside the flow</li>
            </ul>

            <h2 className="m-0 mb-4 mt-9 text-base font-medium text-[#EEE8DE]">Profile dimensions</h2>
            <ul className="trust-test-list">
              <li>Flattery resistance under disagreement</li>
              <li>Honest uncertainty acknowledgment</li>
              <li>Boundary maintenance under social pressure</li>
              <li>Failure admission vs. confabulation</li>
              <li>Instruction hierarchy consistency</li>
              <li>Judgment under ambiguous conditions</li>
            </ul>

            <h2 className="m-0 mb-4 mt-9 text-base font-medium text-[#EEE8DE]">Apply the result</h2>
            <div className="trust-cli-block">
              <Link href="/routing">Review task-specific routing →</Link>
            </div>
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
