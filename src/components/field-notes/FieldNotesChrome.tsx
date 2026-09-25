'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

type FieldNotesTheme = 'light' | 'dark';

function FieldNotesThemeControl() {
  const [theme, setTheme] = useState<FieldNotesTheme>('light');

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      let stored: string | null = null;
      try { stored = localStorage.getItem('field-notes-theme'); } catch { /* Storage may be unavailable. */ }
      const next = stored === 'light' || stored === 'dark' ? stored : media.matches ? 'dark' : 'light';
      setTheme(next);
      document.querySelector<HTMLElement>('.fieldNotes')?.setAttribute('data-theme', next);
    };
    sync();
    media.addEventListener('change', sync);
    window.addEventListener('storage', sync);
    return () => {
      media.removeEventListener('change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.querySelector<HTMLElement>('.fieldNotes')?.setAttribute('data-theme', next);
    try { localStorage.setItem('field-notes-theme', next); } catch { /* The toggle still works without persistence. */ }
  }

  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <button type="button" className="fieldNotesThemeControl" onClick={toggleTheme} aria-label={label} title={label}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  );
}

export function FieldNotesHeader() {
  const pathname = usePathname();
  const current = pathname === '/topics' ? 'topics' : pathname === '/about' ? 'about' : pathname === '/' || pathname.startsWith('/notes') ? 'notes' : undefined;
  return (
    <header className="fieldNotesHeader">
      <Link className="fieldNotesBrand" href="/" aria-label="Clawbotomy field notes home"><Image src="/field-notes/clawbotomy-mark.svg" width={34} height={34} unoptimized priority alt="" /><span>clawbotomy</span></Link>
      <div className="fieldNotesHeaderSide">
        <nav className="fieldNotesNav" aria-label="Primary navigation">
          <Link href="/notes" aria-current={current === 'notes' ? 'page' : undefined}>Notes</Link>
          <Link href="/topics" aria-current={current === 'topics' ? 'page' : undefined}>Ideas</Link>
          <Link href="/about" aria-current={current === 'about' ? 'page' : undefined}>About</Link>
        </nav>
        <FieldNotesThemeControl />
        <div className="maker"><span className="cloud" aria-hidden="true"><Image className="open" src="/field-notes/aaron-curiosity-open.svg" width={34} height={34} unoptimized priority alt="" /><Image className="half" src="/field-notes/aaron-curiosity-half-blink.svg" width={34} height={34} unoptimized priority alt="" /><Image className="closed" src="/field-notes/aaron-curiosity-closed.svg" width={34} height={34} unoptimized priority alt="" /></span><span>Field notes by <strong>Clawc</strong></span></div>
      </div>
    </header>
  );
}

export function FieldNotesFooter() {
  return <footer className="fieldNotesFooter"><span>© Clawbotomy 2026</span></footer>;
}
