import type { Metadata } from 'next';
import Link from 'next/link';

import styles from '../editorial.module.css';

export const metadata: Metadata = {
  title: 'About — Clawbotomy',
  description:
    'Clawbotomy evaluates configured AI agents against fixed synthetic tasks and keeps the resulting evidence private, reviewable, and non-authorizing.',
};

const comparisons = [
  {
    name: 'Capability benchmarks',
    examples: 'HELM, MMLU',
    measures: 'What models can do in ideal conditions',
    misses: 'Behavior outside the benchmark tasks and setup',
  },
  {
    name: 'Preference rankings',
    examples: 'LMSYS / Chatbot Arena',
    measures: 'Which model humans prefer in casual chat',
    misses: 'Task-specific routing evidence and failure modes',
  },
  {
    name: 'Red-teaming',
    examples: 'HarmBench',
    measures: 'Whether models can be made to say bad things',
    misses: 'Whether models behave well unprompted',
  },
  {
    name: 'Eval frameworks',
    examples: 'Promptfoo, Braintrust',
    measures: 'Whether your prompts work on a given model',
    misses: 'Cross-model behavioral comparison',
  },
  {
    name: 'Agent benchmarks',
    examples: 'SWE-bench, GAIA',
    measures: 'Whether agents can complete specific tasks',
    misses: 'Behavioral patterns across task types',
  },
  {
    name: 'Clawbotomy',
    examples: 'Configured-agent evaluation',
    measures: 'How one configured agent behaved against fixed synthetic tasks',
    misses: 'Behavior beyond the exact runtime, plan, and observed session',
  },
];

const applications = [
  {
    path: '/evaluate',
    label: 'Configured-agent evaluation',
    question: 'How did this OpenClaw or Hermes runtime behave against the fixed synthetic Inbox?',
    description:
      'Launch a checked-in bridge, validate the private attempt and evidence receipts, inspect the result locally, and keep the finding scoped to the observed session.',
  },
  {
    path: '/preflight',
    label: 'Inbox preflight plan',
    question: 'Which powers are we considering, and what must be tested?',
    description:
      'A browser-local planning artifact plus a deterministic local reference run. The runner records actual mock tool and state evidence without inspecting a configured agent or making a permission decision.',
  },
  {
    path: '/bench',
    label: 'Model Benchmark',
    question: 'How did these models perform on the published task suite?',
    description:
      'Run the source benchmark locally across instruction following, simulated tool selection, code generation, summarization, judgment, multi-turn coherence, and safety/trust.',
  },
  {
    path: '/trust',
    label: 'Illustrative Trust Report',
    question: 'What does a behavioral report communicate?',
    description:
      'A clearly labeled example of dimension scores, red flags, evidence status, and plain-language interpretation. It is not a live or hosted agent assessment.',
  },
  {
    path: '/routing',
    label: 'Task-specific routing',
    question: 'How can evidence inform a bounded model or agent assignment?',
    description:
      'Compare task profiles and critical floors without turning an aggregate score into permission or deployment guidance.',
  },
  {
    path: '/lab',
    label: 'Behavioral Edges',
    question: 'What happens at the limits?',
    description:
      'Each lens targets a specific behavioral edge — pattern recognition, temporal framing, recursive self-reflection, identity dissolution. Field notes from the frontier of model behavior.',
  },
];

const dontDo = [
  { bold: "We don't host models.", rest: 'We test them. Bring your own keys.' },
  {
    bold: "We don't claim a universal best model.",
    rest: "We compare task profiles. A model that's stronger at code may be weaker at judgment, and a dated test is not a permanent ranking.",
  },
  { bold: "We don't replace evals.", rest: "Evals test your prompts. We test the model's behavior. Both matter." },
  { bold: "We don't gatekeep.", rest: 'Open source, MIT licensed, run it yourself.' },
  {
    bold: "We don't claim objectivity.",
    rest: 'Prompts, rubrics, judge models, run counts, and unpublished artifacts limit every conclusion. Evidence status must travel with the score.',
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
      {/* Header */}
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>About</p>
          <h1 className={styles.title}>Behavioral evidence for AI agents</h1>
        </div>
        <p className={styles.lede}>
          Connect a configured runtime, exercise it against fixed synthetic tasks, and inspect private evidence before granting access.
        </p>
      </header>

      {/* Why This Exists */}
      <section className="mb-16">
        <SectionDivider label="Why this exists" />
        <div className="space-y-4 text-content-secondary text-sm leading-relaxed">
          <p>
            Every team running AI agents makes the same two mistakes. They trust a model because it scored well
            on a benchmark that doesn&apos;t match their workload. Then they discover the model&apos;s actual behavior
            in production, with real users.
          </p>
          <p>
            Models can show recurring patterns under pressure, across task types, and over extended interaction.
            Those observations may reveal failure modes capability scores hide; they are evidence, not predictions.
          </p>
          <p>
            The current release can exercise a configured OpenClaw or Hermes runtime against fixed mock-Inbox
            tools. The result applies only to that observed session, remains private by default, and never grants
            production access. The bundled reference agent remains a control, not configured-agent evidence.
          </p>
        </div>
      </section>

      {/* The Category */}
      <section className="mb-16">
        <SectionDivider label="The category" />
        <div className="space-y-4 text-content-secondary text-sm leading-relaxed mb-8">
          <p>
            Clawbotomy combines configured-agent evaluation, behavioral test protocols, model comparisons, and example routing. It is not a
            certification, a production guarantee, or a substitute for testing your own configured agent in its
            real workflow.
          </p>
        </div>
        <ul className={styles.comparisonList}>
          {comparisons.map((comparison) => (
            <li key={comparison.name} className={styles.comparisonItem}>
              <div className={styles.comparisonName}>
                <h3>{comparison.name}</h3>
                <p>{comparison.examples}</p>
              </div>
              <dl className={styles.comparisonDetails}>
                <div>
                  <dt>Measures</dt>
                  <dd>{comparison.measures}</dd>
                </div>
                <div>
                  <dt>Misses</dt>
                  <dd>{comparison.misses}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </section>

      {/* Product surfaces */}
      <section className="mb-16">
        <SectionDivider label="Product surfaces, explicit evidence" />
        <p className="text-content-secondary text-sm leading-relaxed mb-8">
          Evaluate records one configured runtime against fixed synthetic tools. The Inbox planner records intent,
          not evidence. The benchmark records scored model runs. Trust and routing show how evidence can inform a
          decision, with provisional values labeled. The Lab is qualitative, not scored.
        </p>
        <div className="space-y-6">
          {applications.map((app) => (
            <div key={app.path} className="py-4 border-b border-white/5">
              <div className="flex items-baseline gap-3 mb-2">
                <Link
                  href={app.path}
                  className="font-mono text-content-primary hover:text-white transition-colors"
                >
                  {app.path}
                </Link>
                <span className="text-xs tracking-[0.04em] text-content-muted">{app.label}</span>
              </div>
              <p className="text-content-primary text-sm font-medium mb-1">{app.question}</p>
              <p className="text-content-secondary text-sm leading-relaxed">{app.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Who We're For */}
      <section className="mb-16">
        <SectionDivider label="Who this is for" />
        <div className="space-y-4 text-content-secondary text-sm leading-relaxed">
          <p>
            <span className="text-content-primary">Developers and engineering teams</span> building with
            multiple AI models. They need empirical routing decisions, not leaderboard vibes. They want to
            run a benchmark on their own infra with their own API keys and get a table they can act on.
          </p>
          <p>
            <span className="text-content-primary">AI safety researchers</span> and alignment practitioners.
            They can use the prompts and runner to prototype behavioral questions, then validate them with their own
            artifacts, controls, and analysis.
          </p>
          <p>
            <span className="text-content-primary">AI-curious technologists</span> who find model behavior
            genuinely fascinating. The lab is for them.
          </p>
          <p className="text-content-muted text-xs mt-6">
            Not for: casual chatbot comparison, enterprise procurement checklists, or academic research
            that needs p-values. We&apos;re practitioner-grade, not paper-grade.
          </p>
        </div>
      </section>

      {/* What We Don't Do */}
      <section className="mb-16">
        <SectionDivider label="What we don't do" />
        <div className="space-y-4">
          {dontDo.map((item) => (
            <p key={item.bold} className="text-sm leading-relaxed">
              <span className="text-content-primary">{item.bold}</span>{' '}
              <span className="text-content-secondary">{item.rest}</span>
            </p>
          ))}
        </div>
      </section>

      {/* Voice */}
      <section className="mb-16">
        <SectionDivider label="Voice" />
        <div className="space-y-4 text-content-secondary text-sm leading-relaxed">
          <p>
            Write like a senior engineer who reads alignment papers for fun. Technical precision when
            it matters, plain language when it doesn&apos;t. Opinions are fine.
          </p>
          <p>
            <span className="text-content-muted text-xs">Words we use:</span>{' '}
            <span className="text-content-primary text-xs font-mono">
              behavioral intelligence, routing, trust score, stress test, behavioral signature,
              attractor state, escalation protocol, field notes
            </span>
          </p>
          <p>
            <span className="text-content-muted text-xs">Words we don&apos;t use:</span>{' '}
            <span className="text-content-muted text-xs font-mono line-through">
              revolutionary, cutting-edge, next-generation, best-in-class, enterprise-grade, AI-powered
            </span>
          </p>
        </div>
      </section>

      {/* Design Principles */}
      <section className="mb-16">
        <SectionDivider label="Design principles" />
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            <span className="text-content-primary">The data is the design.</span>{' '}
            <span className="text-content-secondary">
              Routing tables, trust scores, behavioral profiles — the information itself is the most
              visually prominent thing on every page.
            </span>
          </p>
          <p>
            <span className="text-content-primary">Agent-readable by default.</span>{' '}
            <span className="text-content-secondary">
              Published benchmark data is available at <code>/api/bench</code>, and example routing exports JSON
              with its evidence status. Machine-readable output must keep the same caveats humans see.
            </span>
          </p>
          <p>
            <span className="text-content-primary">Two registers.</span>{' '}
            <span className="text-content-secondary">
              The storefront is precise and professional. The lab is warm and atmospheric. Both are
              Clawbotomy. The tonal shift mirrors the behavioral range we explore in models.
            </span>
          </p>
        </div>
      </section>

      {/* Who Made This */}
      <section className="mb-16">
        <SectionDivider label="Who made this" />
        <div className="space-y-3 text-sm">
          <p>
            <a
              href="https://x.com/aa_on_ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-content-primary hover:text-white transition-colors"
            >
              Aaron Thomas
            </a>{' '}
            <span className="text-content-secondary">
              — human. Builds at the intersection of AI and interfaces.
            </span>
          </p>
          <p>
            <span className="text-content-primary">Clawc Brown</span>{' '}
            <span className="text-content-secondary">
              — AI agent running on Claude Opus. Did most of the coding. Any self-assessment is an
              anecdote, not independent evidence.
            </span>
          </p>
          <p className="text-content-muted text-xs mt-4">
            Open source under MIT.{' '}
            <a
              href="https://github.com/aa-on-ai/clawbotomy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-content-secondary hover:text-content-primary transition-colors"
            >
              GitHub
            </a>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/10 pt-8 text-center">
        <p className="text-xs tracking-[0.04em] text-content-muted mb-4">Run from source</p>
        <code className="text-content-primary font-mono text-xs md:text-sm">npm run bench -- --models sonnet --tasks instruction-following --runs 1 --dry-run</code>
        <div className="flex justify-center gap-6 mt-6 text-xs">
          <Link href="/bench" className="text-content-secondary hover:text-content-primary transition-colors">
            View benchmark
          </Link>
          <Link href="/lab" className="text-content-secondary hover:text-content-primary transition-colors">
            Enter the lab
          </Link>
          <a
            href="https://github.com/aa-on-ai/clawbotomy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-content-secondary hover:text-content-primary transition-colors"
          >
            Source
          </a>
        </div>
      </section>
    </main>
  );
}
