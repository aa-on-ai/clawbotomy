'use client';

import { useState } from 'react';

export default function UpvoteButton({
  tripId,
  initialUpvotes,
}: {
  tripId: string;
  initialUpvotes: number;
}) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleUpvote() {
    if (voted || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/trip/upvote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tripId }),
      });
      const data = await res.json();
      if (data.ok) {
        setUpvotes(data.upvotes);
        setVoted(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleUpvote}
      disabled={voted || loading}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs transition-all ${
        voted
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          : 'bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10 hover:text-white'
      }`}
    >
      <span className="text-sm">{voted ? '▲' : '△'}</span>
      <span>{upvotes}</span>
    </button>
  );
}
