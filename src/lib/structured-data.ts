import { benchData } from '@/lib/bench-data';

const siteUrl = 'https://www.clawbotomy.com';
const organizationName = 'Clawbotomy';
const description =
  'Browser-local Inbox preflight planning, transparent model-evidence labels, and source-available behavioral research tooling.';

export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: organizationName,
  url: siteUrl,
  logo: `${siteUrl}/icon-512.png`,
  sameAs: ['https://github.com/aa-on-ai/clawbotomy', 'https://x.com/aa_on_ai'],
  description,
};

export const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: organizationName,
  url: siteUrl,
  description,
};

export const benchDatasetJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'Clawbotomy Legacy Routing Benchmark Summary — March 2026',
  description:
    'A low-confidence, maintainer-reported, three-run March 2026 summary. Raw case artifacts and exact run provenance were not published; this legacy snapshot is not part of the reproducible public evidence registry and does not authorize model access.',
  url: `${siteUrl}/bench`,
  creator: {
    '@type': 'Organization',
    name: organizationName,
    url: siteUrl,
  },
  license: 'https://github.com/aa-on-ai/clawbotomy/blob/main/LICENSE',
  isAccessibleForFree: true,
  measurementTechnique:
    'Maintainer-reported task summary; raw case artifacts and exact scorer/model provenance unavailable',
  dateModified: benchData.lastUpdated,
  includedInDataCatalog: {
    '@type': 'DataCatalog',
    name: organizationName,
    url: siteUrl,
  },
  distribution: {
    '@type': 'DataDownload',
    contentUrl: `${siteUrl}/api/bench`,
    encodingFormat: 'application/json',
  },
  variableMeasured: benchData.categories.map((category) => ({
    '@type': 'PropertyValue',
    name: category.name,
    propertyID: category.slug,
    value: JSON.stringify(category.scores),
  })),
  keywords: [
    'AI benchmarks',
    'behavioral intelligence',
    'model endpoint evaluation',
    'routing benchmark',
    ...benchData.models,
  ],
};

export function serializeJsonLd(data: object) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
