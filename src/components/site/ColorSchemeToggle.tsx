'use client';

import { useEffect, useState } from 'react';

import styles from './site-chrome.module.css';

type Scheme = 'light' | 'dark';

function readScheme(): Scheme {
  const current = document.documentElement.getAttribute('data-theme');
  return current === 'light' ? 'light' : 'dark';
}

export function ColorSchemeToggle() {
  const [scheme, setScheme] = useState<Scheme>('dark');

  useEffect(() => {
    setScheme(readScheme());
  }, []);

  function toggle() {
    const next: Scheme = scheme === 'dark' ? 'light' : 'dark';
    setScheme(next);
    document.documentElement.setAttribute('data-theme', next);
    window.localStorage.setItem('ph-theme', next);
  }

  const nextLabel = scheme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      className={styles.schemeToggle}
      onClick={toggle}
      aria-label={`Switch to ${nextLabel} color scheme`}
    >
      [{nextLabel}]
    </button>
  );
}
