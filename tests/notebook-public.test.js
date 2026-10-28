import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
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

test('default public projection exposes both approved articles consistently without approval records', async () => {
  const catalog = loadNotebookCatalog();
  const files = notebookArtifacts(template);
  const browser = notebookBrowserCatalog();
  assert.equal(catalog.approvedNotes.length, 2);
  assert.deepEqual(Object.keys(files), [...catalog.approvedNotes.map(note => `${note.slug}.html`), 'notes.json']);
  assert.equal(browser.notesUrl, '/notebook/generated/notes.json');
  assert.deepEqual(browser.approvedSummaries, catalog.approvedSummaries);
  const rewrites = notebookRewrites();
  assert.deepEqual((await config.rewrites()).beforeFiles.slice(0, rewrites.length), rewrites);
  assert.deepEqual(Object.keys(browser.aliases), rewrites.map(r => r.source));
  assert.equal(notebookSitemap().length, 9);
  const pages = JSON.parse(files['notes.json']).pages;
  assert.deepEqual(Object.keys(pages), catalog.approvedNotes.map(note => `note:${note.slug}`));
  for (const note of catalog.approvedNotes) {
    const route = `/notes/${note.slug}`;
    assert.ok(files[`${note.slug}.html`].includes(renderApprovedNote(note)));
    assert.ok(pages[`note:${note.slug}`].html.includes(renderApprovedNote(note)));
    assert.ok(rewrites.some(entry => entry.source === route && entry.destination === `/notebook/generated/${note.slug}.html`));
    assert.equal(notebookSitemap().find(entry => entry.url === `https://clawbotomy.com${route}`).lastModified.toISOString(), '2026-10-27T00:00:00.000Z');
  }
  for (const file of Object.values(files)) assert.doesNotMatch(file, /contentDigest|sha256:|approvalTranscript/);
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
