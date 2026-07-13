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
            Browser-local Inbox planning, source-available evidence tooling, and non-authorizing routing examples.
          </p>
          <nav aria-label="Footer navigation">
            <a href="https://github.com/aa-on-ai/clawbotomy" target="_blank" rel="noopener noreferrer">Source</a>
            <Link href="/bench">Evidence</Link>
            <Link href="/about">About</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
