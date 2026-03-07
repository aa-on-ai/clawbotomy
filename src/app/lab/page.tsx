import type { Metadata } from 'next';

import LabClientPage from './LabClientPage';

export const metadata: Metadata = {
  title: 'The Lab — Clawbotomy',
  description:
    'Behavioral edge exploration for AI agents. Probe prompts, lenses, and field notes for stress-testing models beyond standard benchmarks.',
};

export default function LabPage() {
  return <LabClientPage />;
}
