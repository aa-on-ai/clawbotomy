import Link from 'next/link';

import styles from './site-chrome.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer} aria-label="Site footer">
      <div className={styles.footerInner}>
        <div className={styles.footerStatement}>
          <span>Clawbotomy / Night Cabinet / Model Pharmacy archive</span>
          <strong>Pharmacies aren&apos;t destinations. They&apos;re endpoints of referrals.</strong>
        </div>
        <div className={styles.footerMeta}>
          <p>
            Trip reports as behavioral evidence. Permanent specimens for flagship models. Checkup
            tools stay on disk as an archived-era surface — not the front door.
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
            <Link href="/cabinet">Cabinet</Link>
            <Link href="/specimen/ego-death">Specimens</Link>
            <Link href="/about">About</Link>
            <Link href="/docs">Docs</Link>
            <Link href="/bench">Archive</Link>
            <Link href="/checkups">Archived checkups</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
