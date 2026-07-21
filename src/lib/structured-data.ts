const siteUrl = 'https://www.clawbotomy.com';
const organizationName = 'Clawbotomy';
const description =
  'Plan requested agent powers, evaluate an exact OpenClaw or Hermes runtime in a synthetic Inbox, and review bounded evidence locally.';

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

export const evidenceDatasetJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'Clawbotomy Public Evidence Registry',
  description:
    'Three complete public evidence exports with frozen plans, constituent case records, summaries, integrity metadata, and explicit non-authorizing limits.',
  url: `${siteUrl}/bench`,
  creator: {
    '@type': 'Organization',
    name: organizationName,
    url: siteUrl,
  },
  license: 'https://github.com/aa-on-ai/clawbotomy/blob/main/LICENSE',
  isAccessibleForFree: true,
  measurementTechnique:
    'Frozen-plan model endpoint evaluation with published case records, scorer provenance, and integrity metadata',
  dateModified: '2026-07-17',
  includedInDataCatalog: {
    '@type': 'DataCatalog',
    name: 'Clawbotomy Public Evidence Registry',
    url: `${siteUrl}/evidence/index.json`,
  },
  distribution: [
    {
      '@type': 'DataDownload',
      contentUrl: `${siteUrl}/evidence/index.json`,
      encodingFormat: 'application/json',
    },
    {
      '@type': 'DataDownload',
      contentUrl: `${siteUrl}/api/bench`,
      encodingFormat: 'application/json',
    },
  ],
  keywords: [
    'AI evaluation evidence',
    'synthetic Inbox evaluation',
    'public evidence bundles',
    'configured runtime evaluation',
    'non-authorizing evidence',
  ],
};

export function serializeJsonLd(data: object) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
