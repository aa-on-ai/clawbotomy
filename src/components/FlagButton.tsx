'use client';

import { useState } from 'react';

export default function FlagButton({
  tripId,
  initialFlagged,
}: {
  tripId: string;
  initialFlagged: boolean;
}) {
  const [flagged, setFlagged] = useState(initialFlagged);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch('/api/trip/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tripId, flagged: !flagged }),
      });
      if (res.ok) {
        setFlagged(!flagged);
      }
    } catch (err) {
      console.error('Flag error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`px-4 py-2 rounded-lg border font-mono text-sm transition-colors disabled:opacity-50 ${
        flagged
          ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20'
          : 'border-white/10 bg-white/5 text-zinc-400 hover:text-yellow-500 hover:bg-white/10'
      }`}
    >
      {flagged ? '⚑ Flagged' : '⚐ Flag as Notable'}
    </button>
  );
}
