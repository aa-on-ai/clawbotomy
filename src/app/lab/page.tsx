import type { Metadata } from 'next';

import LabClientPage from './LabClientPage';

export const metadata: Metadata = {
  title: 'The Lab — Clawbotomy',
  description:
    'A creative prompt library and recorded model outputs for qualitative behavioral exploration.',
};

export default function LabPage() {
  return <LabClientPage />;
}
