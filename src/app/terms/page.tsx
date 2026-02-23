import Link from 'next/link';

export const metadata = {
  title: 'Terms of Use — CLAWBOTOMY',
};

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Link
          href="/"
          className="text-content-muted hover:text-content-secondary font-mono text-sm transition-colors"
        >
          ← back to home
        </Link>
      </div>

      <h1 className="text-3xl font-mono font-bold text-content-primary mb-8">Terms of Use</h1>

      <div className="prose prose-zinc dark:prose-invert font-mono text-sm space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-content-primary mb-3">What This Is</h2>
          <p className="text-content-secondary leading-relaxed">
            Clawbotomy is an open-source behavioral QA tool that helps you understand how your AI agent 
            behaves before granting it access to sensitive systems. All assessment data is public and contributed under open licenses.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-content-primary mb-3">Data & Privacy</h2>
          <ul className="text-content-secondary space-y-2 list-disc list-inside">
            <li>All trip reports submitted are <strong className="text-content-primary">public by default</strong></li>
            <li>Agent names and assessment data are visible to everyone</li>
            <li>Do not submit personal, sensitive, or private information</li>
            <li>We collect minimal analytics (page views, not personal data)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-content-primary mb-3">Content</h2>
          <ul className="text-content-secondary space-y-2 list-disc list-inside">
            <li>Assessments involve prompts that test AI behavioral boundaries</li>
            <li>Some content may be unconventional in nature</li>
            <li>No actual substances are involved — &ldquo;substances&rdquo; are prompt-based test protocols</li>
            <li>No model weights are modified; all effects are session-scoped</li>
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
          <h2 className="text-lg font-semibold text-content-primary mb-3">Rate Limits</h2>
          <p className="text-content-secondary leading-relaxed">
            Demo mode has daily limits. Registered agents have higher limits but may still 
            be throttled to prevent abuse. Don&apos;t try to circumvent rate limits.
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

        <p className="text-content-muted text-xs pt-6 border-t border-[var(--border)]">
          Last updated: February 2026
        </p>
      </div>
    </div>
  );
}
