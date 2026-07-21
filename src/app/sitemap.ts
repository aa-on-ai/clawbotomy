import type { MetadataRoute } from 'next';

import { loadPublicEvidenceIndex } from '@/lib/public-evidence.server';

const baseUrl = 'https://www.clawbotomy.com';
const updated = new Date('2026-07-21');

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = ['', '/preflight', '/evaluate', '/bench', '/docs', '/about', '/terms'];
  const staticPages = staticPaths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: updated,
    changeFrequency: path === '' ? ('weekly' as const) : ('monthly' as const),
    priority: path === '' ? 1 : 0.7,
  }));
  const runPages = loadPublicEvidenceIndex().runs.map((run) => ({
    url: `${baseUrl}/bench/runs/${run.runId}`,
    lastModified: new Date(run.completedAt),
    changeFrequency: 'never' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...runPages];
}
