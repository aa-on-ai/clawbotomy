import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { notebookArtifacts, notebookBrowserCatalog, notebookRewrites, notebookSitemap } from '../scripts/lib/notebook-public.mjs';
import { computeNoteDigest, loadNotebookCatalog, renderApprovedNote } from '../scripts/lib/notebook-content.mjs';
import { syntheticDraft, syntheticPublication, syntheticApprovedNote } from './fixtures/notebook-content.mjs';
import config from '../next.config.mjs';

const template = readFileSync(new URL('../public/notebook/index.html', import.meta.url), 'utf8');

test('empty public projection remains artifact-free and preserves legacy dates', () => {
  const options = { approvedNotes: [] };
  assert.deepEqual(notebookArtifacts(template, options), {});
  const browser = notebookBrowserCatalog(options);
  assert.equal(browser.notesUrl, null);
  assert.deepEqual(browser.approvedSummaries, []);
  assert.deepEqual(Object.keys(browser.aliases), notebookRewrites(options).map(r => r.source));
  assert.equal(notebookSitemap(options).length, 7);
  for (const entry of notebookSitemap(options)) assert.equal(entry.lastModified.toISOString(), '2026-09-24T00:00:00.000Z');
});

test('default public projection exposes all five approved articles consistently without approval records', async () => {
  const catalog = loadNotebookCatalog();
  const files = notebookArtifacts(template);
  const browser = notebookBrowserCatalog();
  assert.equal(catalog.approvedNotes.length, 5);
  assert.deepEqual(Object.keys(files), [...catalog.approvedNotes.map(note => `${note.slug}.html`), 'notes.json']);
  assert.equal(browser.notesUrl, '/notebook/generated/notes.json');
  assert.deepEqual(browser.approvedSummaries, catalog.approvedSummaries);
  const rewrites = notebookRewrites();
  assert.deepEqual((await config.rewrites()).beforeFiles.slice(0, rewrites.length), rewrites);
  assert.deepEqual(Object.keys(browser.aliases), rewrites.map(r => r.source));
  assert.equal(notebookSitemap().length, 12);
  const pages = JSON.parse(files['notes.json']).pages;
  assert.deepEqual(Object.keys(pages), catalog.approvedNotes.map(note => `note:${note.slug}`));
  for (const note of catalog.approvedNotes) {
    const route = `/notes/${note.slug}`;
    assert.ok(files[`${note.slug}.html`].includes(renderApprovedNote(note)));
    assert.ok(pages[`note:${note.slug}`].html.includes(renderApprovedNote(note)));
    assert.ok(rewrites.some(entry => entry.source === route && entry.destination === `/notebook/generated/${note.slug}.html`));
    assert.equal(notebookSitemap().find(entry => entry.url === `https://clawbotomy.com${route}`).lastModified.toISOString(), `${note.updatedOn}T00:00:00.000Z`);
  }
  for (const file of Object.values(files)) assert.doesNotMatch(file, /contentDigest|sha256:|approvalTranscript/);
});

test('unresolved-row complete HTML preserves reviewed reader bytes with the accepted Allo shell', () => {
  const html = notebookArtifacts(template)['the-unresolved-row-was-correct.html'];
  assert.equal(typeof html, 'string');
  assert.equal(createHash('sha256').update(html, 'utf8').digest('hex'),
    '4e00ea7277dcd935eacc74a241a647a39790ba5184e9b278b3028bfcca05f4a6');
  // Reverse only the two exact decorative SVG replacements.
  const controlsHtml = html
    .replace("<svg data-glyph=\"pluck\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"m5 16-1-2L15 3a2.1 2.1 0 0 1 3 3L9 19l-2-1\"/><path d=\"M6 18c-1 2-2 3-4 3\"/></svg>", "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><g transform=\"rotate(42 12 12)\"><path d=\"M12 2.2 8.9 11l2.4 10.8\"/><path d=\"M12 2.2 15.1 11l-2.4 10.8\"/></g></svg>")
    .replace("<svg data-glyph=\"pull\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M2 18h3m3 0h3m3 0c4 0 5-3 5-6V3\"/><path d=\"m15 7 4-4 4 4\"/></svg>", "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M3 15h3m3 0h3c3.4 0 4.6-1.7 5.6-4S19.4 6 21 6\"/></svg>");
  assert.equal(createHash('sha256').update(controlsHtml, 'utf8').digest('hex'),
    '47655bf26ed14c86f016c4c0d2abae9dc8077f3750f63b30315b1ff541f8582d');
  // The control finish is one stylesheet link. Reversing exactly that delta
  // restores the complete accepted Allo document, not a relaxed projection.
  const alloHtml = controlsHtml.replace('  <link rel="stylesheet" href="/controls.css">\n', '');
  assert.equal(createHash('sha256').update(alloHtml, 'utf8').digest('hex'),
    'f40fb6e50a8ccbe4c2701ff286ac48a5cf0dc7112563a75ab0128ee48e7cf8b6');
  // Only the accepted font preload and shared stylesheet differ from the
  // reviewed complete document; keep its original commitment as well.
  const reviewedHtml = alloHtml
    .replace('./assets/allo/AlloVariableFriendly.woff2', './assets/fraunces.woff2')
    .replace('  <link rel="stylesheet" href="./typography.css">\n', '');
  assert.equal(createHash('sha256').update(reviewedHtml, 'utf8').digest('hex'),
    '590ef7f1fd63a158507b6542f67d9b865169a9dcf71dbf42dd2e434f11e5dbe8');
});

test('populated routes, browser catalog, full HTML and sitemap agree on exact approved content', () => {
  const publication = syntheticPublication();
  publication.title = '<script>window.injected=true</script> & synthetic';
  publication.deck = '<img src=x onerror=alert(1)>';
  publication.blocks[0].text = '<script>window.injected=true</script> $&';
  const note = { ...publication, editorial: { status: 'approved', contentDigest: computeNoteDigest(publication) } };
  const options = { approvedNotes: [note] };
  const files = notebookArtifacts(template, options);
  const browser = notebookBrowserCatalog(options);
  assert.deepEqual(Object.keys(files), ['synthetic-fixture.html', 'notes.json']);
  assert.equal(browser.notesUrl, '/notebook/generated/notes.json');
  assert.equal(browser.aliases['/notes/synthetic-fixture'], 'note:synthetic-fixture');
  assert.equal(browser.canonicalPaths['note:synthetic-fixture'], '/notes/synthetic-fixture');
  assert.deepEqual(notebookRewrites(options).at(-1), { source: '/notes/synthetic-fixture', destination: '/notebook/generated/synthetic-fixture.html' });
  const document = files['synthetic-fixture.html'];
  assert.match(document, /<title>&lt;script&gt;window.injected=true&lt;\/script&gt; &amp; synthetic \| Clawbotomy field notes<\/title>/);
  assert.match(document, /rel="canonical" href="https:\/\/clawbotomy.com\/notes\/synthetic-fixture"/);
  assert.match(document, /<p>&lt;script&gt;window.injected=true&lt;\/script&gt; \$&amp;<\/p>/);
  assert.match(document, /<template id="notebook-home-template">/);
  assert.doesNotMatch(document, /<script>window.injected|<img src=x|contentDigest|sha256:/);
  const html = JSON.parse(files['notes.json']).pages['note:synthetic-fixture'].html;
  assert.ok(document.includes(html));
  assert.match(html, /Back to the notebook/);
  assert.match(html, /Fixture AI/);
  assert.match(html, /datetime="2024-02-29"/);
  assert.doesNotMatch(html, /repairOpening|editorialScene|makeRoom|editorialStatus/);
  assert.deepEqual(notebookSitemap(options).at(-1), { url: 'https://clawbotomy.com/notes/synthetic-fixture', lastModified: new Date('2024-02-29'), changeFrequency: 'monthly', priority: 0.7 });
  assert.deepEqual(notebookArtifacts(template, options), files);
});

test('every public projection rejects unapproved, mutated, duplicate and retired candidates', () => {
  const mutated = syntheticApprovedNote(); mutated.deck += ' changed';
  const retired = syntheticApprovedNote({ ...syntheticPublication(), slug: 'note-001' });
  for (const approvedNotes of [[syntheticDraft()], [mutated], [retired], [syntheticApprovedNote(), syntheticApprovedNote()]]) {
    const options = { approvedNotes };
    for (const consume of [notebookBrowserCatalog, notebookRewrites, notebookSitemap]) assert.throws(() => consume(options));
    assert.throws(() => notebookArtifacts(template, options));
  }
});

test('published design references retain their links without a review-only notice', () => {
  const sources = readFileSync(new URL('../public/notebook/sources.html', import.meta.url), 'utf8');
  assert.doesNotMatch(sources, /reviewRibbon|Review notice|Review preview|Not published/i);
  assert.match(sources, /<h1>Borrow the principle\.<\/h1>/);
  assert.match(sources, /These are design references, not sources for the stories\./);
  for (const href of [
    'https://ncase.me/trust/',
    'https://ciechanow.ski/mechanical-watch/',
    'https://blog.panic.com/',
    'https://craigmod.com/essays/fast_software/',
    'https://pudding.cool/process/how-to-make-dope-shit-part-1/',
  ]) assert.ok(sources.includes(`href="${href}"`), `Reference link retained: ${href}`);
  assert.match(sources, /href="\.\/">Back to the notebook<\/a>/);
});

test('unrelated redirects and security headers remain unchanged', async () => {
  assert.deepEqual(await config.redirects(), [
    { source: '/references.html', destination: '/sources.html', permanent: false },
    { source: '/lab/:path*', destination: '/about', permanent: true },
    { source: '/routing', destination: '/checkups', permanent: true },
    { source: '/trust', destination: '/checkups', permanent: true },
  ]);
  const rewrites = (await config.rewrites()).beforeFiles;
  assert.ok(rewrites.some(r => r.source === '/sources.html' && r.destination === '/notebook/sources.html'));
  assert.equal((await config.headers())[0].headers.find(h => h.key === 'X-Frame-Options').value, 'DENY');
});
