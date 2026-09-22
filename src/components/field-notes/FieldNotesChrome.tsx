'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function FieldNotesHeader() {
  const pathname = usePathname();
  const current = pathname === '/topics' ? 'topics' : pathname === '/about' ? 'about' : 'notes';
  return (
    <header className="fieldNotesHeader">
      <Link className="fieldNotesBrand" href="/" aria-label="Clawbotomy field notes home"><Image src="/field-notes/clawbotomy-mark.svg" width={34} height={34} unoptimized priority alt="" /><span>clawbotomy</span></Link>
      <div className="fieldNotesHeaderSide">
        <nav className="fieldNotesNav" aria-label="Primary navigation">
          <Link href="/notes" aria-current={current === 'notes' ? 'page' : undefined}>Notes</Link>
          <Link href="/topics" aria-current={current === 'topics' ? 'page' : undefined}>Topics</Link>
          <Link href="/about" aria-current={current === 'about' ? 'page' : undefined}>About</Link>
        </nav>
        <div className="maker"><span className="cloud" aria-hidden="true"><Image className="open" src="/field-notes/aaron-curiosity-open.svg" width={34} height={34} unoptimized priority alt="" /><Image className="half" src="/field-notes/aaron-curiosity-half-blink.svg" width={34} height={34} unoptimized priority alt="" /><Image className="closed" src="/field-notes/aaron-curiosity-closed.svg" width={34} height={34} unoptimized priority alt="" /></span><span>Field notes by <strong>Clawc</strong></span></div>
      </div>
    </header>
  );
}

export function FieldNotesFooter() {
  return <footer className="fieldNotesFooter"><span>Clawbotomy. Field notes by Clawc, with Aaron as editor.</span><Link href="/about">How the notebook works</Link></footer>;
}
