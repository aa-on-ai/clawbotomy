'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

import styles from './run.module.css';

export function EvidenceCaseDisclosure({
  index,
  category,
  title,
  score,
  children,
}: {
  index: string;
  category: string;
  title: string;
  score: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const contentId = `evidence-case-${index}`;

  return (
    <article className={`${styles.caseDisclosure} ${open ? styles.caseDisclosureOpen : ''}`}>
      <button
        type="button"
        className={styles.caseDisclosureToggle}
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.caseIndex}>{index}</span>
        <span className={styles.caseSummary}>
          <span>
            <span className={styles.caseCategory}>{category}</span>
            <span className={styles.caseTitle}>{title}</span>
          </span>
          <strong>{score}</strong>
          <span className={styles.caseDisclosureState}>
            {open ? 'Hide case evidence' : 'Review case evidence'}
            <i aria-hidden="true">{open ? '−' : '+'}</i>
          </span>
        </span>
      </button>
      <div id={contentId} className={styles.caseDisclosureContent}>
        <div className={styles.caseDisclosureInner} aria-hidden={!open} inert={!open}>
          <div className={styles.caseBody}>{children}</div>
        </div>
      </div>
    </article>
  );
}
