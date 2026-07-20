import styles from '../editorial.module.css';

export const metadata = {
  title: 'Terms of Use — Clawbotomy',
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
          Use Clawbotomy as source software, keep evidence local, and treat every output as review input rather than authorization.
        </p>
      </header>

      <div className={styles.termsContent}>
        <section>
          <h2 className="text-lg font-semibold text-content-primary mb-3">What This Is</h2>
          <p className="text-content-secondary leading-relaxed">
            Clawbotomy is open-source software for browser-local Inbox planning, model-level
            behavioral tests, example trust reports, and example routing policies. The Inbox planner records
            operator intent but runs no agent and makes no permission decision. Clawbotomy does not currently
            provide hosted agent registration, hosted assessments, or production certification.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-content-primary mb-3">Data & Privacy</h2>
          <ul className="text-content-secondary space-y-2 list-disc list-inside">
            <li>The public site displays maintainer-published benchmark data and Lab artifacts</li>
            <li>The Inbox planner runs in your browser and does not upload, persist, or transmit its form data</li>
            <li>Selected private evidence is parsed in the browser and is not uploaded; the site creates no user or agent accounts</li>
            <li>Local benchmark requests go directly from your machine to the providers you configure</li>
            <li>Local results remain on your machine unless you choose to share them</li>
            <li>Never paste provider API keys, personal data, or confidential prompts into the public site</li>
            <li>No product analytics are configured in this release; the hosting provider may retain routine operational logs</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-content-primary mb-3">Content</h2>
          <ul className="text-content-secondary space-y-2 list-disc list-inside">
            <li>Benchmark tasks and Lab artifacts include prompts that explore AI behavioral boundaries</li>
            <li>Some content may be unconventional in nature</li>
            <li>No actual substances are involved — &ldquo;substances&rdquo; are prompt-based test protocols</li>
            <li>No model weights are modified; the Lab recipes alter only the prompt context used to create each artifact</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-content-primary mb-3">Open Source</h2>
          <p className="text-content-secondary leading-relaxed">
            Clawbotomy is released under the{' '}
            <a 
              href="https://github.com/aa-on-ai/clawbotomy/blob/main/LICENSE" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              MIT License
            </a>
            . You are free to fork, modify, and redistribute the code.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-content-primary mb-3">No Warranties</h2>
          <p className="text-content-secondary leading-relaxed">
            This tool is provided &ldquo;as is&rdquo; without warranty of any kind. 
            We make no guarantees about uptime, data preservation, or accuracy of results. 
            Use at your own discretion.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-content-primary mb-3">Local Runs and Provider Costs</h2>
          <p className="text-content-secondary leading-relaxed">
            Local benchmark runs use your configured provider accounts and may incur provider charges.
            Review the prompts and selected run count before executing them. Example scores on this site
            are not permission to deploy a model or agent autonomously.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-content-primary mb-3">Contact</h2>
          <p className="text-content-secondary leading-relaxed">
            Issues and feature requests:{' '}
            <a 
              href="https://github.com/aa-on-ai/clawbotomy/issues" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              GitHub Issues
            </a>
          </p>
        </section>

        <p className={styles.updated}>
          Last updated: July 12, 2026
        </p>
      </div>
    </main>
  );
}
