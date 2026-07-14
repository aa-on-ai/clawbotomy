import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Routing Policy Example — Clawbotomy',
  description: 'A transparent example policy for routing AI work with maintainer-reported and provisional inputs.',
};

export default function RoutingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
