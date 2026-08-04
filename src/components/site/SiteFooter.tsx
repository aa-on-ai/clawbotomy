import Link from 'next/link';

import styles from './site-chrome.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer} aria-label="Site footer">
      <div className={styles.footerInner}>
        <div className={styles.footerStatement}>
          <span>Clawbotomy · Configured-agent behavior checkups</span>
          <strong>Observe the runtime. Then decide what changes.</strong>
        </div>
        <div className={styles.footerMeta}>
          <p>
            Open-source local evaluation and guided behavior checkups. Controlled retests come only after a valid baseline. Evidence remains private and non-authorizing.
          </p>
          <nav aria-label="Footer navigation">
            <a
              href="https://github.com/aa-on-ai/clawbotomy"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Source on GitHub (opens in a new tab)"
            >
              Source ↗
            </a>
            <Link href="/checkups">Checkups</Link>
            <Link href="/preflight">Start a checkup</Link>
            <Link href="/bench">Evidence</Link>
            <Link href="/about">About</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
