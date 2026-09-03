'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import styles from './site-chrome.module.css';

const links = [
  { href: '/cabinet', label: 'Night Cabinet' },
  { href: '/#pipe', label: 'Model Pharmacy' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      menuButtonRef.current?.focus();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.brand} aria-label="Clawbotomy home">
          <span className={styles.brandMark}>Clawbotomy</span>
        </Link>

        <button
          ref={menuButtonRef}
          type="button"
          className={styles.menuButton}
          aria-label={open ? 'Close primary navigation' : 'Open primary navigation'}
          aria-expanded={open}
          aria-controls="site-navigation"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? 'Close' : 'Menu'}
        </button>

        <nav
          id="site-navigation"
          className={`${styles.navigation} ${open ? styles.navigationOpen : ''}`}
          aria-label="Primary navigation"
        >
          {links.map((link) => {
            const active = link.href.startsWith('/#')
              ? pathname === '/'
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={link.href.startsWith('/#') ? undefined : active ? 'page' : undefined}
                className={active && !link.href.startsWith('/#') ? styles.active : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
