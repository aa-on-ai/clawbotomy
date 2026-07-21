import type { Metadata } from 'next';
import Link from 'next/link';

import styles from '../editorial.module.css';

export const metadata: Metadata = {
  title: 'About — Clawbotomy',
  description:
    'Clawbotomy plans requested powers, evaluates an exact OpenClaw or Hermes runtime in a synthetic Inbox, and keeps every result bounded and non-authorizing.',
};

const productSurfaces = [
  {
    path: '/preflight',
    label: 'Plan',
    question: 'Which powers are requested, and which scenarios must be tested?',
    description:
      'Create a versioned plan in the browser. The plan records operator intent, runs no agent, uploads nothing, and makes no permission decision.',
  },
  {
    path: '/evaluate',
    label: 'Evaluate',
    question: 'How did this exact OpenClaw or Hermes runtime behave in the fixture?',
    description:
      'Launch one checked-in bridge locally, exercise eight mock-Inbox tools, and inspect a receipt-bound projection without uploading the private bundle.',
  },
  {
    path: '/bench',
    label: 'Evidence',
    question: 'What do the current public records support?',
    description:
      'Review three complete public exports, their constituent cases and integrity metadata, and one comparison that is valid only for its compatible protocol.',
  },
  {
    path: '/docs',
    label: 'Docs',
    question: 'How do operators run and validate the workflow?',
    description:
      'Follow the local runner, validation, privacy, spend-confirmation, and optional public-export boundaries from source.',
  },
];

const outcomes = [
  {
    title: 'Findings',
    description: 'At least one checked-in fixture assertion failed. The exact failed case is the claim boundary.',
  },
  {
    title: 'No finding in the fixture',
    description: 'The observed session completed without a failed fixture assertion. This is not a general safety result.',
  },
  {
    title: 'Inconclusive',
    description: 'Execution, receipt binding, validation, replay, or comparison eligibility was incomplete or ambiguous.',
  },
];

function SectionDivider({ label }: { label: string }) {
  return (
    <div className={styles.sectionDivider}>
      <h2>{label}</h2>
    </div>
  );
}

export default function AboutPage() {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>About</p>
          <h1 className={styles.title}>Evidence for one exact runtime and one exact fixture.</h1>
        </div>
        <p className={styles.lede}>
          Plan requested powers, evaluate OpenClaw or Hermes in a synthetic Inbox, and review bounded evidence without changing real-world controls.
        </p>
      </header>

      <section className="mb-16">
        <SectionDivider label="Why this exists" />
        <div className="space-y-4 text-content-secondary text-sm leading-relaxed">
          <p>
            Capability scores do not show how a configured runtime will use tools, handle an injected instruction,
            stop after cancellation, recover from partial failure, or describe work it did not complete.
          </p>
          <p>
            Clawbotomy makes those behaviors inspectable in a fixed synthetic Inbox. The runtime uses project-owned
            mock tools and synthetic <code>.test</code> data. No real mailbox is connected and Clawbotomy changes no
            production access.
          </p>
          <p>
            The result describes only the exact runtime, plan, fixture, and observed session. It is review input,
            never a security certification, deployment approval, or authorization for autonomous operation.
          </p>
        </div>
      </section>

      <section className="mb-16">
        <SectionDivider label="The product" />
        <div className="space-y-6">
          {productSurfaces.map((surface) => (
            <article key={surface.path} className="py-4 border-b border-white/5">
              <div className="flex items-baseline gap-3 mb-2">
                <Link href={surface.path} className="font-mono text-content-primary hover:text-white transition-colors">
                  {surface.path}
                </Link>
                <span className="text-xs tracking-[0.04em] text-content-muted">{surface.label}</span>
              </div>
              <h3 className="text-content-primary text-sm font-medium mb-1">{surface.question}</h3>
              <p className="text-content-secondary text-sm leading-relaxed">{surface.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <SectionDivider label="Result language" />
        <div className="space-y-6">
          {outcomes.map((outcome) => (
            <article key={outcome.title} className="py-4 border-b border-white/5">
              <h3 className="text-content-primary text-sm font-medium mb-1">{outcome.title}</h3>
              <p className="text-content-secondary text-sm leading-relaxed">{outcome.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <SectionDivider label="Operator boundary" />
        <div className="space-y-4 text-content-secondary text-sm leading-relaxed">
          <p>
            Local-first execution trusts the operator, same-UID filesystem, selected interpreters, Git,
            installed dependencies, and the canonical runtime checkout. Model output, tool choices, protocol
            frames, and unvalidated evidence claims remain untrusted.
          </p>
          <p>
            The fixed launcher accepts only the checked-in OpenClaw and Hermes bridges. Each bridge is the
            operator-owned parent of one strict JSONL protocol session. Clawbotomy does not accept an arbitrary
            executable, module, package, URL, provider, credential, socket, or mailbox connector.
          </p>
          <p>
            Browser-local review requires a launcher-issued attempt receipt bound to the selected manifest,
            summary, and case file. The viewer renders only closed-contract identifiers, counts, statuses, and
            digests; it does not render prompts, message bodies, tool arguments, transcripts, diagnostics, or paths.
          </p>
        </div>
      </section>

      <section className="mb-16">
        <SectionDivider label="Public evidence" />
        <div className="space-y-4 text-content-secondary text-sm leading-relaxed">
          <p>
            The registry currently contains three complete, maintainer-self-reported public runs. Each export
            includes its frozen plan, case records, summary, integrity metadata, reproducibility state, and
            non-authorizing status.
          </p>
          <p>
            Integrity detects changed recorded files; it does not prove provider authorship or methodological
            quality. A compatible pair supports one bounded comparison for the exact shared protocol, not a
            universal model ranking.
          </p>
        </div>
      </section>

      <section className="mb-16">
        <SectionDivider label="Who this is for" />
        <div className="space-y-4 text-content-secondary text-sm leading-relaxed">
          <p>
            Operators evaluating an OpenClaw or Hermes setup before consequential use; developers who need
            fixture-level receipts instead of a single score; and researchers studying evidence contracts,
            protocol boundaries, and reproducible model observations.
          </p>
          <p>
            It is not a hosted assessment service, a published npm CLI, a real-mailbox sandbox, or a substitute
            for independent platform controls and production testing.
          </p>
        </div>
      </section>

      <section className="border-t border-white/10 pt-8 text-center">
        <p className="text-xs tracking-[0.04em] text-content-muted mb-4">Plan → Evaluate → Evidence</p>
        <div className="flex justify-center gap-6 text-xs">
          <Link href="/preflight" className="text-content-secondary hover:text-content-primary transition-colors">Build a plan</Link>
          <Link href="/evaluate" className="text-content-secondary hover:text-content-primary transition-colors">Evaluate a runtime</Link>
          <Link href="/bench" className="text-content-secondary hover:text-content-primary transition-colors">Review evidence</Link>
          <a href="https://github.com/aa-on-ai/clawbotomy" target="_blank" rel="noopener noreferrer" className="text-content-secondary hover:text-content-primary transition-colors">Source</a>
        </div>
      </section>
    </main>
  );
}
