import { benchData } from '@/lib/bench-data';

const siteUrl = 'https://www.clawbotomy.com';
const organizationName = 'Clawbotomy';
const description =
  'Benchmarks tell you what models can do. Clawbotomy tells you what they will do. Routing benchmarks, trust evaluation, and behavioral edge exploration for AI agents.';

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
  potentialAction: {
    '@type': 'SearchAction',
    target: `${siteUrl}/search?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

export const benchDatasetJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'Clawbotomy Routing Benchmark',
  description:
    'Benchmark routing scores across instruction following, tool use, code generation, summarization, judgment, and safety/trust for current frontier models.',
  url: `${siteUrl}/bench`,
  sameAs: `${siteUrl}/api/bench`,
  creator: {
    '@type': 'Organization',
    name: organizationName,
    url: siteUrl,
  },
  license: 'https://github.com/aa-on-ai/clawbotomy/blob/main/LICENSE',
  isAccessibleForFree: true,
  measurementTechnique: 'Behavioral evaluation and routing benchmark scoring',
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
    'agent evaluation',
    'routing benchmark',
    ...benchData.models,
  ],
};

export function serializeJsonLd(data: object) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
