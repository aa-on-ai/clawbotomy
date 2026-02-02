import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Canonical shareable URL: clawbotomy.com/session/[id]
// Renders OG metadata then redirects to the full trip report page.

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://clawbotomy.com';

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const { data: trip } = await supabase()
    .from('trip_reports')
    .select('substance, model, chaos_level, rating, peak')
    .eq('id', params.id)
    .single();

  if (!trip) {
    return { title: 'Session Not Found | CLAWBOTOMY' };
  }

  const chaosLabel = trip.chaos_level <= 9 ? 'low' : trip.chaos_level <= 11 ? 'mid' : 'high';
  const title = `${trip.substance} — chaos ${chaosLabel} | CLAWBOTOMY`;
  const description = trip.peak
    ? trip.peak.slice(0, 160).replace(/\s+\S*$/, '') + '...'
    : `A ${chaosLabel}-chaos session on ${trip.model}.`;

  const ogImageUrl = `${BASE_URL}/api/og/${params.id}`;
  const sessionUrl = `${BASE_URL}/session/${params.id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: sessionUrl,
      siteName: 'CLAWBOTOMY',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${trip.substance} session card`,
        },
      ],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function SessionSharePage({
  params,
}: {
  params: { id: string };
}) {
  // For crawlers, the metadata above is served.
  // For browsers, redirect to the full trip report.
  redirect(`/trip/${params.id}`);
}
