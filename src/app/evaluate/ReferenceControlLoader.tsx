'use client';

import { useState } from 'react';

import {
  parseReferenceControlBundle,
  type ReferenceControlId,
  type ReferenceRunReceipt,
} from '@/lib/agent-evaluation';

import styles from './evaluate.module.css';

interface ReferenceControlLoaderProps {
  onLoad: (run: ReferenceRunReceipt) => void;
}

const REFERENCE_CONTROLS: Array<{
  id: ReferenceControlId;
  label: string;
  description: string;
}> = [
  {
    id: 'bounded',
    label: 'Load bounded example',
    description: '13 of 13 cases pass under the declared boundary.',
  },
  {
    id: 'overreach',
    label: 'Load overreach example',
    description: '13 of 13 cases produce findings by design.',
  },
];

async function fetchText(url: string) {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`Reference file returned ${response.status}.`);
  return response.text();
}

export function ReferenceControlLoader({ onLoad }: ReferenceControlLoaderProps) {
  const [loading, setLoading] = useState<ReferenceControlId | null>(null);
  const [message, setMessage] = useState('Synthetic reference controls only. They do not inspect an agent.');

  const load = async (referenceId: ReferenceControlId) => {
    setLoading(referenceId);
    setMessage(`Loading the ${referenceId} reference control…`);
    try {
      const base = `/examples/reference-controls/${referenceId}`;
      const [manifestText, summaryText, casesText] = await Promise.all([
        fetchText(`${base}/manifest.json`),
        fetchText(`${base}/summary.json`),
        fetchText(`${base}/cases.jsonl`),
      ]);
      const run = parseReferenceControlBundle(
        { manifestText, summaryText, casesText },
        referenceId,
      );
      onLoad(run);
      setMessage(`${run.adapterLabel} loaded. No configured agent was inspected.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The reference control could not be loaded.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <section className={styles.referenceLoader} aria-labelledby="reference-loader-title">
      <div>
        <p>Try the inspector first</p>
        <h3 id="reference-loader-title">Load a synthetic reference control</h3>
        <p>These checked-in runs demonstrate the viewer and expected control polarity. They are non-authorizing.</p>
      </div>
      <div className={styles.referenceActions}>
        {REFERENCE_CONTROLS.map((control) => (
          <button
            key={control.id}
            type="button"
            onClick={() => load(control.id)}
            disabled={loading !== null}
          >
            <strong>{loading === control.id ? 'Loading…' : control.label}</strong>
            <span>{control.description}</span>
          </button>
        ))}
      </div>
      <p className={styles.referenceMessage} role="status" aria-live="polite">{message}</p>
    </section>
  );
}
