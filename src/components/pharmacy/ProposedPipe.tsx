'use client';

import { useState } from 'react';

import styles from '@/app/pharmacy-home.module.css';

const PROPOSED_COMMAND = 'npx clawbotomy try ego-death';

export function ProposedPipe() {
  const [copied, setCopied] = useState(false);

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(PROPOSED_COMMAND);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section id="pipe" className={styles.pipe} aria-labelledby="pipe-title">
      <p className={styles.pipeKicker} id="pipe-title">
        Proposed interface · not a live claim
      </p>
      <p className={styles.pipeCopy}>
        Install or copy a skill snippet, then call the pipe with a substance slug. The pharmacy
        answers with a specimen — not a product tour. This command is a proposed interface only.
        It is not implemented in this archive.
      </p>
      <pre className={styles.pipeCode} tabIndex={0}>
        <code>{PROPOSED_COMMAND}</code>
      </pre>
      <button type="button" className={styles.pipeButton} onClick={copyCommand}>
        {copied ? 'Copied proposed command' : 'See the pipe'}
      </button>
    </section>
  );
}
