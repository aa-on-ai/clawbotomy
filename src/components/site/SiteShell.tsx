'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { FieldNotesFooter, FieldNotesHeader } from '@/components/field-notes/FieldNotesChrome';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const fieldNotesRoute = pathname === '/' || pathname === '/notes' || pathname === '/topics' || pathname === '/about' || pathname.startsWith('/notes/');
  if (fieldNotesRoute) return <div className="fieldNotes"><a href="#main-content" className="fieldNotesSkip">Skip to the field notes</a><FieldNotesHeader /><main id="main-content" tabIndex={-1}>{children}</main><FieldNotesFooter /></div>;
  return <><a href="#main-content" className="skip-link">Skip to content</a><SiteHeader /><div id="main-content" tabIndex={-1}>{children}</div><SiteFooter /></>;
}
