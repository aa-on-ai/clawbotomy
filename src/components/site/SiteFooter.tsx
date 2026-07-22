import Link from 'next/link';

import styles from './site-chrome.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer} aria-label="Site footer">
      <div className={styles.footerInner}>
        <div className={styles.footerStatement}>
          <span>Clawbotomy · Local-first agent evaluation</span>
          <strong>Plan. Evaluate. Review evidence.</strong>
        </div>
        <div className={styles.footerMeta}>
          <p>
            Local-first execution, browser-local review, and bounded public evidence.
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
            <a
              href="https://github.com/aa-on-ai/clawbotomy-aftercare"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Aftercare archive on GitHub (opens in a new tab)"
            >
              Aftercare archive ↗
            </a>
            <Link href="/preflight">Plan</Link>
            <Link href="/evaluate">Evaluate</Link>
            <Link href="/bench">Evidence</Link>
            <Link href="/about">About</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
