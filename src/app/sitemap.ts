import type { MetadataRoute } from 'next';

import { getSpecimenSlugs } from '@/lib/pharmacy/specimens';

const baseUrl = 'https://www.clawbotomy.com';
const updated = new Date('2026-09-02');

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = [
    '',
    '/cabinet',
    '/evaluate',
    '/checkups',
    '/preflight',
    '/bench',
    '/about',
    '/docs',
    '/terms',
    ...getSpecimenSlugs().map((slug) => `/specimen/${slug}`),
  ];
  return staticPaths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: updated,
    changeFrequency: path === '' ? ('weekly' as const) : ('monthly' as const),
    priority: path === '' ? 1 : 0.7,
  }));
}
