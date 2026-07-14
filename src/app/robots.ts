import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/api/bench', '/evidence/'],
      disallow: ['/api/'],
    },
    sitemap: 'https://www.clawbotomy.com/sitemap.xml',
  };
}
