import type { MetadataRoute } from 'next';

import { LAB_SUBSTANCES } from '@/lib/lab-substances';

const baseUrl = 'https://www.clawbotomy.com';
const updated = new Date('2026-07-13');

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = ['', '/evaluate', '/preflight', '/bench', '/routing', '/trust', '/lab', '/about', '/docs', '/terms'];
  const staticPages = staticPaths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: updated,
    changeFrequency: path === '' ? ('weekly' as const) : ('monthly' as const),
    priority: path === '' ? 1 : 0.7,
  }));

  const labPages = LAB_SUBSTANCES.map((substance) => ({
    url: `${baseUrl}/lab/${substance.slug}`,
    lastModified: updated,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  return [...staticPages, ...labPages];
}
