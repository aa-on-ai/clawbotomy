'use client';

import { useState } from 'react';

// TODO: wire into trip/[id] page — add <ShareCard tripId={report.id} substance={report.substance} />

interface ShareCardProps {
  tripId: string;
  substance: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://clawbotomy.com';

export default function ShareCard({ tripId, substance }: ShareCardProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${BASE_URL}/session/${tripId}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-HTTPS
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const tweetText = encodeURIComponent(
    `I just ran ${substance} through CLAWBOTOMY. Here's what the AI said:`
  );
  const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="flex items-center gap-2 font-mono text-xs">
      <button
        onClick={copyLink}
        className="px-3 py-1.5 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 rounded transition-colors"
      >
        {copied ? 'copied!' : 'copy link'}
      </button>
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="px-3 py-1.5 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 rounded transition-colors"
      >
        share on X
      </a>
    </div>
  );
}
