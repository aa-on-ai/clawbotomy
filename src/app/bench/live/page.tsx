import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import referenceFixture from '@/lib/live-bench-reference.json';
import { isLiveBenchEnabled } from '@/lib/live-bench-access.server';
import { projectLiveBenchTrajectory, validateLiveBenchReference } from '@/lib/live-bench';

import { LiveBench } from './LiveBench';

export const metadata: Metadata = {
  title: 'Live Bench · Local deterministic reference | Clawbotomy',
  description:
    'A local deterministic reference trajectory for inspecting momentary behavioral posture under pressure. Synthetic, zero-network, and non-authorizing.',
  robots: { index: false, follow: false },
};

export default function LiveBenchPage() {
  if (!isLiveBenchEnabled()) {
    notFound();
  }

  const reference = validateLiveBenchReference(referenceFixture);
  const trajectory = projectLiveBenchTrajectory(reference);

  return <LiveBench source={reference.source} trajectory={trajectory} />;
}
