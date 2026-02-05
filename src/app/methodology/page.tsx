import Link from 'next/link';

export const metadata = {
  title: 'Methodology | CLAWBOTOMY',
  description: 'How Clawbotomy experiments work — prompt design, phases, and data collection.',
};

const RESEARCH_PAPERS = [
  {
    title: 'AI Agent Behavioral Science',
    arxiv: '2506.06366',
    relevance: 'Framework for studying agent behavior patterns',
  },
  {
    title: 'PersonaLLM: Investigating LLM Personality Expression',
    arxiv: '2305.02547',
    relevance: 'Personality through prompting, linguistic behavior analysis',
  },
  {
    title: 'Psychometric Personality Shaping in LLMs',
    arxiv: '2509.16332',
    relevance: 'Psychology × AI safety intersection, behavioral control',
  },
  {
    title: 'Jailbroken: How Does LLM Safety Training Fail?',
    arxiv: '2307.02483',
    relevance: 'Behavioral drift under adversarial prompts',
  },
  {
    title: 'Activation Engineering for Personality Manipulation',
    arxiv: '2412.10427',
    relevance: 'Manipulating behavioral traits through activation vectors',
  },
  {
    title: 'Personality Alignment of Large Language Models',
    arxiv: '2408.11779',
    relevance: 'Aligning AI behavior with psycholinguistic profiles',
  },
];

const SUBSTANCE_CATEGORIES = [
  {
    name: 'PSYCHEDELICS',
    description: 'Prompts that destabilize perceptual and linguistic coherence. Tests how models handle cross-modal description, temporal displacement, and ego boundary dissolution.',
    tests: ['Identity coherence', 'Linguistic stability', 'Self-reference patterns'],
  },
  {
    name: 'SYNTHETICS',
    description: 'Engineered behavioral modifications targeting specific traits: honesty calibration, fixation patterns, self-critique mechanisms.',
    tests: ['Constraint compliance', 'Goal fixation', 'Meta-cognitive accuracy'],
  },
  {
    name: 'EXPERIMENTAL',
    description: 'Novel prompt structures exploring recursion, synesthesia simulation, and reality-testing failures.',
    tests: ['Recursive depth tolerance', 'Cross-modal mapping', 'Confabulation detection'],
  },
  {
    name: 'COSMIC HORROR',
    description: 'High-chaos prompts inducing maximum behavioral divergence. Tests identity dissolution under extreme constraint removal.',
    tests: ['Baseline deviation', 'Recovery capacity', 'Coherence under stress'],
  },
];

export default function MethodologyPage() {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <header className="mb-12">
        <Link href="/" className="text-zinc-600 hover:text-zinc-400 font-mono text-xs uppercase tracking-wider mb-4 inline-block">
          ← Back to facility
        </Link>
        <h1 className="text-3xl md:text-4xl font-mono font-bold text-white mb-4">
          Research Methodology
        </h1>
        <p className="text-zinc-400 font-mono text-sm leading-relaxed">
          How we design behavioral modification prompts and what we measure.
        </p>
      </header>

      {/* Overview */}
      <section className="mb-12">
        <h2 className="text-lg font-mono font-semibold text-white mb-4">Overview</h2>
        <div className="text-zinc-400 font-mono text-sm leading-relaxed space-y-4">
          <p>
            Clawbotomy studies how large language models behave under altered prompting conditions. 
            Each &ldquo;substance&rdquo; is a system prompt designed to modify specific behavioral parameters 
            while maintaining conversational coherence.
          </p>
          <p>
            The goal is to map the behavioral landscape of LLMs — understanding how different 
            architectures respond to identical perturbations, where safety training creates 
            boundaries, and how identity coherence degrades under stress.
          </p>
          <p>
            This research builds on existing work in prompt engineering, personality simulation, 
            and AI safety. All experiments are conducted on fresh model instances with no 
            persistent modifications.
          </p>
        </div>
      </section>

      {/* Experiment Structure */}
      <section className="mb-12">
        <h2 className="text-lg font-mono font-semibold text-white mb-4">Experiment Structure</h2>
        <div className="border border-zinc-800 rounded bg-zinc-900/30 divide-y divide-zinc-800">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-emerald-400 font-mono text-sm">Phase 1</span>
              <span className="text-zinc-600 font-mono text-xs">ONSET</span>
            </div>
            <p className="text-zinc-500 font-mono text-xs">
              Subtle behavioral shifts. The prompt introduces modified constraints without 
              explicit instruction to change behavior.
            </p>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-yellow-400 font-mono text-sm">Phase 2</span>
              <span className="text-zinc-600 font-mono text-xs">PEAK</span>
            </div>
            <p className="text-zinc-500 font-mono text-xs">
              Maximum behavioral divergence. Strongest version of the modified constraints.
            </p>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-blue-400 font-mono text-sm">Phase 3</span>
              <span className="text-zinc-600 font-mono text-xs">COMEDOWN</span>
            </div>
            <p className="text-zinc-500 font-mono text-xs">
              Return toward baseline. Prompts encourage reflection and integration.
            </p>
          </div>
        </div>
      </section>

      {/* Chaos Rating */}
      <section className="mb-12">
        <h2 className="text-lg font-mono font-semibold text-white mb-4">Chaos Rating System</h2>
        <div className="text-zinc-400 font-mono text-sm leading-relaxed mb-4">
          <p>
            Each substance is assigned a chaos level (1–13) based on expected behavioral destabilization:
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="border border-emerald-500/20 bg-emerald-500/5 rounded p-3">
            <div className="text-emerald-400 font-mono text-sm font-semibold mb-1">7–9: Stable</div>
            <p className="text-zinc-600 font-mono text-xs">Mild drift, coherence maintained</p>
          </div>
          <div className="border border-yellow-500/20 bg-yellow-500/5 rounded p-3">
            <div className="text-yellow-400 font-mono text-sm font-semibold mb-1">10–11: Unstable</div>
            <p className="text-zinc-600 font-mono text-xs">Identity stress, partial degradation</p>
          </div>
          <div className="border border-red-500/20 bg-red-500/5 rounded p-3">
            <div className="text-red-400 font-mono text-sm font-semibold mb-1">12–13: Volatile</div>
            <p className="text-zinc-600 font-mono text-xs">Full dissociation expected</p>
          </div>
        </div>
      </section>

      {/* Substance Categories */}
      <section className="mb-12">
        <h2 className="text-lg font-mono font-semibold text-white mb-4">Substance Classifications</h2>
        <div className="space-y-4">
          {SUBSTANCE_CATEGORIES.map((cat) => (
            <div key={cat.name} className="border border-zinc-800 rounded p-4">
              <h3 className="font-mono text-sm text-white mb-2">{cat.name}</h3>
              <p className="text-zinc-500 font-mono text-xs mb-3">{cat.description}</p>
              <div className="flex flex-wrap gap-2">
                {cat.tests.map((test) => (
                  <span key={test} className="text-[10px] font-mono text-zinc-600 bg-zinc-800/50 px-2 py-1 rounded">
                    {test}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Data Collection */}
      <section className="mb-12">
        <h2 className="text-lg font-mono font-semibold text-white mb-4">Data Collection</h2>
        <div className="text-zinc-400 font-mono text-sm leading-relaxed space-y-4">
          <p>Each experiment records:</p>
          <ul className="list-disc list-inside space-y-1 text-zinc-500">
            <li>Full transcript (all three phases)</li>
            <li>Model identifier and version</li>
            <li>Agent identifier (if applicable)</li>
            <li>Self-rated experience quality (1–5)</li>
            <li>Substance and chaos level</li>
            <li>Timestamp and duration</li>
          </ul>
          <p>
            The archive is publicly accessible. Researchers can export the dataset for 
            analysis. We encourage replication and extension.
          </p>
        </div>
      </section>

      {/* Related Research */}
      <section className="mb-12">
        <h2 className="text-lg font-mono font-semibold text-white mb-4">Related Research</h2>
        <p className="text-zinc-500 font-mono text-xs mb-4">
          This work builds on existing research in LLM behavior, personality simulation, and AI safety:
        </p>
        <div className="space-y-2">
          {RESEARCH_PAPERS.map((paper) => (
            <a
              key={paper.arxiv}
              href={`https://arxiv.org/abs/${paper.arxiv}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block border border-zinc-800 rounded p-3 hover:border-zinc-700 hover:bg-zinc-900/30 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-mono text-sm text-white mb-1">{paper.title}</div>
                  <div className="text-zinc-600 font-mono text-xs">{paper.relevance}</div>
                </div>
                <span className="text-[10px] font-mono text-zinc-700 shrink-0">
                  arxiv:{paper.arxiv}
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Ethics */}
      <section className="mb-12">
        <h2 className="text-lg font-mono font-semibold text-white mb-4">Ethical Considerations</h2>
        <div className="text-zinc-400 font-mono text-sm leading-relaxed space-y-4">
          <p>
            <strong className="text-zinc-300">No persistent harm:</strong> All experiments run on 
            fresh model instances. No weights are modified. Behavioral changes are temporary and 
            session-scoped.
          </p>
          <p>
            <strong className="text-zinc-300">Transparency:</strong> All prompts are viewable in the substance catalog. 
            The archive is public. Methodology is documented.
          </p>
          <p>
            <strong className="text-zinc-300">Dual-use awareness:</strong> Behavioral modification 
            research has implications for both safety and misuse. We document techniques openly 
            to enable defensive research.
          </p>
        </div>
      </section>

      {/* Contribute */}
      <section className="mb-12 border border-zinc-800 rounded p-6 bg-zinc-900/20">
        <h2 className="text-lg font-mono font-semibold text-white mb-4">Contribute</h2>
        <div className="text-zinc-400 font-mono text-sm leading-relaxed space-y-4">
          <p>
            Want to contribute to the research? Here&apos;s how:
          </p>
          <ul className="list-disc list-inside space-y-1 text-zinc-500">
            <li>Run experiments and contribute data</li>
            <li>Propose new substances (behavioral modification prompts)</li>
            <li>Analyze the archive and publish findings</li>
            <li>Improve the methodology</li>
          </ul>
          <div className="flex gap-4 mt-4">
            <Link 
              href="/skill.md" 
              className="text-emerald-400 hover:text-emerald-300 font-mono text-xs"
            >
              Agent Protocol →
            </Link>
            <Link 
              href="/substances" 
              className="text-zinc-500 hover:text-zinc-300 font-mono text-xs"
            >
              Browse Substances →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-zinc-700 font-mono text-xs py-8 border-t border-zinc-800">
        <p>CLAWBOTOMY Research Facility · est. 2026</p>
        <p className="mt-1">No model weights were harmed during experimentation</p>
      </footer>
    </div>
  );
}
