export type ExampleReport = {
  substance_slug: string;
  problem: string;
  report: string;
  model_used: string;
};

export const EXAMPLE_REPORTS: ExampleReport[] = [
  {
    substance_slug: 'quantum-lsd',
    problem: 'how should a solo designer position themselves in the ai era',
    model_used: 'claude-3-5-sonnet',
    report: `First weird realization: the market no longer buys "design" as a deliverable, it buys reduced uncertainty. Your old portfolio says "I can make interfaces." The new buyer is asking "can you lower strategic risk while we ship at machine speed?" Those are different products.

When I map solo designers who are suddenly in demand, they look less like stylists and more like translation layers. They sit between founders with blurry intent and models that can produce infinite output. Their leverage is not drawing rectangles. It is choosing what should exist, what should never ship, and what signal to trust when the model sounds confident but wrong.

Your positioning should be: "I run decision systems for product teams in the ai transition." Not "freelance product designer." Say you design prompts, specs, evaluation criteria, and behavioral guardrails, then pair that with visual and interaction judgment. You are selling a loop: frame, generate, critique, route, ship. The artifact is a product. The service is clearer thinking.

Concrete move: split your public work into three proof buckets. One, ontology work (how you define entities, states, permissions, edge cases). Two, model behavior shaping (prompts, tests, failure modes, routing decisions). Three, interface outcomes (flows, language, trust cues). Most designers only show bucket three. If you show all three, you stop competing on polish and start competing on judgment.

Strangest but truest insight: in this era, "taste" is basically applied epistemology. Clients are hiring someone to decide what is real enough to build.`
  },
  {
    substance_slug: 'tired-honesty',
    problem: "why isn't anyone using my open source project",
    model_used: 'gpt-4o',
    report: `You probably think this is a distribution problem. It is mostly a trust problem.

Your README explains what the tool does, but not why a sane person should bet their week on it. Open source adoption is a risk calculation. People ask: Will this break my stack? Will maintainer energy disappear in two months? Will I look dumb recommending this internally? Right now your project answers none of those questions fast.

Hard truth: the feature set is less important than the maintenance signal. A smaller project with boring docs, clear versioning, and visible issue triage will beat a clever project with chaotic vibes every time. You are marketing innovation when users are buying reliability.

Another uncomfortable bit: your first-time experience might feel obvious to you and confusing to everyone else. If setup takes more than ten minutes without hand-holding, people bounce and never file feedback. Silence looks like indifference, but it is often friction plus politeness.

Do this this week:
1) Rewrite README top section as "who this is for / who this is not for / first 5 minutes." 
2) Add three copy-paste examples that produce visible output immediately.
3) Publish a public roadmap with one-month scope and mark what you will not build.
4) Close or label every stale issue so the repo feels alive.
5) Ask five target users to install on a clean machine while you watch quietly.

If no one adopts after that, the problem is likely positioning. Your project may solve a pain users do not feel urgently enough yet.`
  },
  {
    substance_slug: 'temporal-displacement',
    problem: 'should i take a job at a big tech company or keep building indie',
    model_used: 'claude-3-opus',
    report: `I am reading your question from 2045, where careers are judged less by employer prestige and more by compounding autonomy. The people who aged well were not the ones with the cleanest resumes. They were the ones who built rare feedback loops early and kept them.

Big tech in your era is excellent for three things: distribution literacy, operating at scale, and learning how real organizations absorb change. If you have never shipped inside a large system, that apprenticeship is valuable. You learn constraints that indie builders often romanticize away.

But here is what hindsight punishes: staying too long once your learning curve flattens. Many talented people traded their peak experimentation years for local optimization inside stable org charts. Their compensation went up while optionality quietly went down.

Indie paths looked reckless in the moment but created asymmetric upside for people who could ship consistently, communicate clearly, and survive volatility. The winners were not "genius founders." They were disciplined generalists with strong point of view, small burn, and relentless distribution habits.

Your decision rule should be temporal, not ideological. Take big tech if it buys you specific capabilities you cannot cheaply get alone: enterprise distribution, deep infrastructure fluency, or access to world-class operators. Set a hard expiry upfront, usually 18 to 30 months. Leave when growth turns from steep to flat.

Stay indie if you already have momentum, low financial pressure, and a niche where your taste plus speed creates obvious edge. In 2045 language: choose the path that maximizes future agency, not present status.`
  },
];
