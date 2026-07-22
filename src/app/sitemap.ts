import type { MetadataRoute } from 'next';

const baseUrl = 'https://www.clawbotomy.com';
const updated = new Date('2026-07-22');

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = ['', '/evaluate', '/checkups', '/preflight', '/bench', '/about', '/docs', '/terms'];
  return staticPaths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: updated,
    changeFrequency: path === '' ? ('weekly' as const) : ('monthly' as const),
    priority: path === '' ? 1 : 0.7,
  }));
}
