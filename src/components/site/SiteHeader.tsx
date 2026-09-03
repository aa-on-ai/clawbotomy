'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ColorSchemeToggle } from './ColorSchemeToggle';
import styles from './site-chrome.module.css';

const links = [
  { href: '/cabinet', label: 'Night Cabinet' },
  { href: '/#pipe', label: 'Model Pharmacy' },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.titleLine}>
          <Link href="/" className={styles.brand} aria-label="Clawbotomy home">
            <span className={styles.brandMark}>Clawbotomy</span>
          </Link>
          <span className={styles.titleSep}> — </span>
          <nav
            id="site-navigation"
            className={styles.navigation}
            aria-label="Primary navigation"
          >
            {links.map((link, index) => {
              const active = link.href.startsWith('/#')
                ? pathname === '/'
                : pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <span key={link.href}>
                  {index > 0 ? <span className={styles.titleSep}> / </span> : null}
                  <Link
                    href={link.href}
                    aria-current={link.href.startsWith('/#') ? undefined : active ? 'page' : undefined}
                    className={active && !link.href.startsWith('/#') ? styles.active : undefined}
                  >
                    {link.label}
                  </Link>
                </span>
              );
            })}
          </nav>
        </div>

        <ColorSchemeToggle />
      </div>
    </header>
  );
}
