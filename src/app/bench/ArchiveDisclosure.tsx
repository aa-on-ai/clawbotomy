'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

import styles from './bench.module.css';

export function ArchiveDisclosure({
  meta,
  children,
}: {
  meta: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className={`${styles.archiveDisclosure} ${open ? styles.archiveDisclosureOpen : ''}`}>
      <button
        type="button"
        className={styles.archiveToggle}
        aria-expanded={open}
        aria-controls="model-benchmark-archive"
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.archiveToggleInner}>
          <span className={styles.archiveToggleCopy}>
            <span>Historical model benchmark archive</span>
            <strong>{meta}</strong>
            <span className={styles.archiveDescription}>
              Separate from the configured-agent checkup. Open preserved comparisons, artifact manifests, and the legacy snapshot only when you need them.
            </span>
          </span>
          <span className={styles.archiveState}>
            <span>{open ? 'Close archive' : 'Open archive'}</span>
            <i aria-hidden="true">{open ? '−' : '+'}</i>
          </span>
        </span>
      </button>
      <div id="model-benchmark-archive" className={styles.archiveContent}>
        <div className={styles.archiveContentInner} aria-hidden={!open} inert={!open}>
          {children}
        </div>
      </div>
    </section>
  );
}
