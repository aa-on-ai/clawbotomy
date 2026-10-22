import type { MetadataRoute } from 'next';

const baseUrl = 'https://clawbotomy.com';
const updated = new Date('2026-09-24');

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = ['', '/notes', '/topics', '/about', '/notes/remove-all-eyebrows', '/notes/two-agents-one-bug', '/notes/the-update-was-not-the-finish-line', '/evaluate', '/checkups', '/preflight', '/bench', '/docs', '/terms'];
  return staticPaths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: updated,
    changeFrequency: path === '' ? ('weekly' as const) : ('monthly' as const),
    priority: path === '' ? 1 : 0.7,
  }));
}
