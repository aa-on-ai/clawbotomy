import { createHash } from 'node:crypto';
import repositoryCatalog from '../../content/notebook/catalog.mjs';

// Explicit isolated catalog states; never depend on the production list being empty.
export function syntheticCatalogSource({ approvedNotes = [], retiredSlugs = [] } = {}) {
  return `export default ${JSON.stringify({ ...repositoryCatalog, approvedNotes,
    retiredSlugs: [...repositoryCatalog.retiredSlugs, ...retiredSlugs] }, null, 2)};\n`;
}

// Synthetic parser fixtures, never production notes or evidence of real approval.
export function syntheticDraft() {
  return {
    slug: 'synthetic-fixture',
    title: 'Synthetic fixture — not an article',
    deck: 'Test data for the notebook content contract.',
    author: { name: 'Fixture AI', kind: 'ai' },
    disclosure: 'Synthetic AI-authored test data. Not for publication.',
    blocks: [
      { type: 'paragraph', text: 'A fixture paragraph.' },
      { type: 'heading', level: 2, text: 'A fixture heading' },
      { type: 'code', text: 'const fixture = "text";\n// Not executable by the renderer.' },
      { type: 'list', ordered: false, items: ['First fixture item', 'Second fixture item'] },
    ],
    sources: [{ label: 'Example documentation (synthetic citation)', url: 'https://example.com/docs?a=1&b=2#fixture' }],
  };
}

export function syntheticPublication() {
  return { ...syntheticDraft(), publishedOn: '2024-02-28', updatedOn: '2024-02-29' };
}

// Independent implementation of the documented version-1 commitment envelope.
// Input is deliberately constructed in canonical schema order above.
export function syntheticApprovedNote(publication = syntheticPublication()) {
  const contentDigest = 'sha256:' + createHash('sha256')
    .update(JSON.stringify({ schemaVersion: 1, ...publication }), 'utf8').digest('hex');
  return { ...publication, editorial: { status: 'approved', contentDigest } };
}
