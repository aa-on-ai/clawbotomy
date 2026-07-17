import Link from 'next/link';

import styles from './site-chrome.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer} aria-label="Site footer">
      <div className={styles.footerInner}>
        <div className={styles.footerStatement}>
          <span>Clawbotomy · Research preview</span>
          <strong>Evidence before access.</strong>
        </div>
        <div className={styles.footerMeta}>
          <p>
            Local agent evaluation, private evidence inspection, and non-authorizing routing examples.
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
