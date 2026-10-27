import type { MetadataRoute } from 'next';
import { notebookSitemap } from '../../scripts/lib/notebook-public.mjs';

const baseUrl = 'https://clawbotomy.com';
const updated = new Date('2026-09-24');

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = ['/evaluate', '/checkups', '/preflight', '/bench', '/docs', '/terms'];
  return [...notebookSitemap(), ...staticPaths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: updated,
    changeFrequency: path === '' ? ('weekly' as const) : ('monthly' as const),
    priority: path === '' ? 1 : 0.7,
  }))] as MetadataRoute.Sitemap;
}
