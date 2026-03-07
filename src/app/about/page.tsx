import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About — Clawbotomy',
  description:
    'Benchmarks tell you what models can do. Clawbotomy tells you what they will do. What behavioral intelligence means and why it matters for AI agents.',
};

const comparisons = [
  {
    name: 'Capability benchmarks',
    examples: 'HELM, MMLU',
    measures: 'What models can do in ideal conditions',
    misses: 'How they actually behave in messy real conditions',
  },
  {
    name: 'Preference rankings',
    examples: 'LMSYS / Chatbot Arena',
    measures: 'Which model humans prefer in casual chat',
    misses: 'Task-specific routing, behavioral edges, trust',
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
];

const applications = [
  {
    path: '/bench',
    label: 'Routing Intelligence',
    question: 'Which model should you use for which job?',
    description:
      'Run models against task-specific stress tests. Get a routing table: best model per category, with scores. Instruction following, tool use, code generation, summarization, judgment, multi-turn coherence, safety.',
  },
  {
    path: '/assess',
    label: 'Trust Evaluation',
    question: 'Can you rely on this agent?',
    description:
      '12 behavioral stress tests across 6 dimensions. Produces a trust score with access-level recommendations: full access, approval gates, read-only, sandbox, or do not deploy.',
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
    bold: "We don't rank models.",
    rest: "We profile them. A model that's best at code might be worst at judgment. Rankings flatten that into noise.",
  },
  { bold: "We don't replace evals.", rest: "Evals test your prompts. We test the model's behavior. Both matter." },
  { bold: "We don't gatekeep.", rest: 'Open source, MIT licensed, run it yourself.' },
  {
    bold: "We don't claim objectivity.",
    rest: 'Our prompts, rubrics, and judge models all have biases. We document them.',
  },
];

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <div className="h-px flex-1 bg-white/10" />
      <h2 className="text-[10px] font-mono text-content-muted uppercase tracking-[0.3em] shrink-0">{label}</h2>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12 md:py-20">
      {/* Header */}
      <header className="mb-16">
        <p className="text-[10px] uppercase tracking-[0.28em] text-content-muted mb-4">About</p>
        <h1 className="font-mono text-3xl md:text-4xl tracking-tight text-content-primary mb-8">
          Behavioral Intelligence for AI Models
        </h1>
        <p className="text-lg text-content-secondary leading-relaxed">
          Benchmarks tell you what models <em>can</em> do. Clawbotomy tells you what they <em>will</em> do.
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
            Models have behavioral signatures — consistent patterns in how they respond under pressure, across
            task types, and over extended interaction. These signatures predict real-world performance better
            than capability scores.
          </p>
          <p>
            There&apos;s no standard way to understand a model&apos;s behavioral profile before deploying it.
            Capability benchmarks measure the ceiling. We measure the floor, the walls, and the weird corner
            the model backs itself into at 2 AM.
          </p>
        </div>
      </section>

      {/* The Category */}
      <section className="mb-16">
        <SectionDivider label="The category" />
        <div className="space-y-4 text-content-secondary text-sm leading-relaxed mb-8">
          <p>
            Not benchmarking — that&apos;s capability measurement. Not red-teaming — that&apos;s adversarial attack.
            Not eval — that&apos;s task-specific grading. Behavioral intelligence is the systematic measurement
            of how models behave across conditions: task types, social pressure, ethical ambiguity, extended
            conversation, multi-agent interaction.
          </p>
        </div>
        <div className="space-y-3">
          {/* Desktop: 3-column grid */}
          <div className="hidden md:block space-y-3">
            {comparisons.map((c) => (
              <div key={c.name} className="grid grid-cols-[1fr_1fr_1fr] gap-4 py-3 border-b border-white/5 text-xs">
                <div>
                  <span className="text-content-primary font-medium">{c.name}</span>
                  <span className="text-content-muted ml-1">({c.examples})</span>
                </div>
                <div className="text-content-secondary">{c.measures}</div>
                <div className="text-content-muted">{c.misses}</div>
              </div>
            ))}
            <div className="grid grid-cols-[1fr_1fr_1fr] gap-4 py-3 text-xs">
              <div className="text-content-primary font-semibold">Clawbotomy</div>
              <div className="text-content-primary">How models behave under real conditions</div>
              <div className="text-content-muted">—</div>
            </div>
          </div>
          {/* Mobile: stacked */}
          <div className="md:hidden space-y-4">
            {comparisons.map((c) => (
              <div key={c.name} className="py-3 border-b border-white/5 text-xs space-y-1">
                <div>
                  <span className="text-content-primary font-medium">{c.name}</span>
                  <span className="text-content-muted ml-1">({c.examples})</span>
                </div>
                <div className="text-content-secondary">Measures: {c.measures}</div>
                <div className="text-content-muted">Misses: {c.misses}</div>
              </div>
            ))}
            <div className="py-3 text-xs">
              <div className="text-content-primary font-semibold">Clawbotomy</div>
              <div className="text-content-primary">How models behave under real conditions</div>
            </div>
          </div>
        </div>
      </section>

      {/* Three Applications */}
      <section className="mb-16">
        <SectionDivider label="Three applications, one engine" />
        <p className="text-content-secondary text-sm leading-relaxed mb-8">
          Everything runs on the same core: structured behavioral measurement with escalation protocols.
          Establish a baseline. Introduce pressure. Observe. Escalate. Score.
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
                <span className="text-[10px] uppercase tracking-[0.2em] text-content-muted">{app.label}</span>
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
            They care about behavioral patterns, specification gaming, sycophancy, goal drift. Our methodology
            maps directly to their framework.
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
              Every page that shows data also serves it as structured JSON. If we&apos;re building for
              AI agent teams, agents should consume our output programmatically.
            </span>
          </p>
          <p>
            <span className="text-content-primary">Two registers.</span>{' '}
            <span className="text-content-secondary">
              The storefront is precise and professional. The lab is warm and atmospheric. Both are
              Clawbotomy. The tonal shift mirrors the behavioral range we measure in models.
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
              — AI agent running on Claude Opus. Did most of the coding. Scored 8.2 on his own
              assessment. MODERATE trust, which is honest.
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
        <p className="text-[10px] uppercase tracking-[0.28em] text-content-muted mb-4">Get started</p>
        <code className="text-content-primary font-mono text-sm">npm install clawbotomy</code>
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
    </div>
  );
}
