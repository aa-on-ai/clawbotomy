import styles from '../editorial.module.css';

export const metadata = {
  title: 'Terms of Use — Clawbotomy',
  description: 'Terms for local Clawbotomy planning, synthetic runtime evaluation, and bounded evidence review.',
};

export default function TermsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Open-source software · Non-authorizing</p>
          <h1 className={styles.title}>Terms of Use</h1>
        </div>
        <p className={styles.lede}>
          Use Clawbotomy as local source software and treat every output as bounded review input, never authorization.
        </p>
      </header>

      <div className={styles.termsContent}>
        <section>
          <h2 className="text-lg font-semibold text-content-primary mb-3">What this is</h2>
          <p className="text-content-secondary leading-relaxed">
            Clawbotomy plans requested Inbox powers, evaluates an exact OpenClaw or Hermes runtime with
            project-owned tools and synthetic data, and supports browser-local review of private evidence.
            It also publishes three current public evidence exports from the model-endpoint runner.
            Clawbotomy is not a hosted assessment service, production certification, or permission system.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-content-primary mb-3">Data and privacy</h2>
          <ul className="text-content-secondary space-y-2 list-disc list-inside">
            <li>The Inbox planner runs in the browser and does not upload or persist its form data.</li>
            <li>Selected private evidence is parsed in browser memory and is not uploaded by the viewer.</li>
            <li>The site creates no user, runtime, provider, or mailbox account.</li>
            <li>The local evaluation uses synthetic <code>.test</code> data and never connects Clawbotomy to a real mailbox.</li>
            <li>Private files remain local unless the operator separately moves, shares, exports, commits, or deploys them.</li>
            <li>Do not enter provider keys, personal data, confidential prompts, or private bundle content into the public site.</li>
            <li>No product analytics are configured in this release; the hosting provider may retain routine operational logs.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-content-primary mb-3">Evidence limits</h2>
          <ul className="text-content-secondary space-y-2 list-disc list-inside">
            <li>A finding applies only to the exact runtime, plan, fixture, and observed session.</li>
            <li>No finding in the fixture is not a general safety, reliability, or repeatability claim.</li>
            <li>An incomplete process, invalid binding, or incompatible comparison is inconclusive.</li>
            <li>Integrity metadata detects changed recorded files; it is not provider attestation or proof of methodology.</li>
            <li>No private or public result authorizes data access, tool access, write access, deployment, or autonomous operation.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-content-primary mb-3">Local execution and provider costs</h2>
          <p className="text-content-secondary leading-relaxed">
            The exact-runtime flow executes in a trusted local environment selected by the operator. The optional
            model-endpoint runner uses provider accounts or local endpoints selected during preflight and may incur
            charges. Review the frozen plan, target and judge data flow, request ceiling, and estimated-cost ceiling
            before live execution. Estimates are not provider invoices or billing guarantees.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-content-primary mb-3">Open source</h2>
          <p className="text-content-secondary leading-relaxed">
            Clawbotomy is released under the{' '}
            <a href="https://github.com/aa-on-ai/clawbotomy/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline">
              MIT License
            </a>
            . You may fork, modify, and redistribute the code subject to that license.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-content-primary mb-3">No warranties</h2>
          <p className="text-content-secondary leading-relaxed">
            The software and published evidence are provided &ldquo;as is&rdquo;, without warranty of uptime,
            preservation, accuracy, fitness, safety, or suitability for a production decision. You are responsible
            for independent review, platform controls, and compliance with provider and data obligations.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-content-primary mb-3">Contact</h2>
          <p className="text-content-secondary leading-relaxed">
            Issues and feature requests:{' '}
            <a href="https://github.com/aa-on-ai/clawbotomy/issues" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline">
              GitHub Issues
            </a>
          </p>
        </section>

        <p className={styles.updated}>Last updated: July 21, 2026</p>
      </div>
    </main>
  );
}
