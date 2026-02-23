'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored) {
      setDark(stored === 'dark');
    } else {
      setDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <button
      type="button"
      onClick={() => setDark(!dark)}
      className="font-mono text-xs text-content-muted hover:text-content-primary transition-colors"
      aria-label="Toggle theme"
    >
      {dark ? 'light' : 'dark'}
    </button>
  );
}
