import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { loadNotebookCatalog, validateDraft, validateApprovedNote, computeNoteDigest,
  renderApprovedNote, renderDraftPreview, NotebookContentError } from '../scripts/lib/notebook-content.mjs';
import { syntheticDraft, syntheticPublication, syntheticApprovedNote } from './fixtures/notebook-content.mjs';

const snapshot = JSON.parse(readFileSync(new URL('../public/notebook/snapshot.json', import.meta.url), 'utf8'));

test('catalog preserves existing snapshot routes without inventing editorial approval', () => {
  const catalog = loadNotebookCatalog({ approvedNotes: [] });
  assert.deepEqual(catalog.aliases, snapshot.aliases);
  assert.deepEqual(catalog.approvedNotes, []);
  assert.equal(catalog.pages.length, Object.keys(snapshot.pages).length);
  for (const page of catalog.pages) {
    assert.equal(page.snapshotTitle, snapshot.pages[page.pageKey].title);
    assert.equal(page.publicState, 'existing-public');
    assert.equal(page.editorialStatus, 'not-assessed');
    assert.equal(Object.hasOwn(page, 'publishedOn'), false);
  }
});

test('default catalog contains exactly the two dated public-approved commitments', () => {
  const catalog = loadNotebookCatalog();
  const expected = [
    ['noticing-is-not-qualification', 'Let a quick note stay quick', 'sha256:3c6ef119e2700d509fd101a02c22d2175544c1900dddfec43618e776f6ee0b18'],
    ['browser-tests-before-the-browser', 'The browser tests had not started', 'sha256:d6b1b7098b84e529fbbd5cef8a00aa8d0f43f2935d7391ed9776a6aa9b853940'],
  ];
  assert.deepEqual(catalog.approvedNotes.map(note => [note.slug, note.title, note.editorial.contentDigest]), expected);
  assert.equal(catalog.pages.length, Object.keys(snapshot.pages).length + expected.length);
  for (const note of catalog.approvedNotes) {
    const { editorial, ...publication } = note;
    assert.equal(computeNoteDigest(publication), editorial.contentDigest);
    assert.equal(note.publishedOn, '2026-10-27');
    assert.equal(note.updatedOn, note.publishedOn);
    assert.deepEqual(note.author, { name: 'Clawc Brown', kind: 'ai' });
    assert.equal(catalog.aliases[`/notes/${note.slug}`], `note:${note.slug}`);
    assert.equal(catalog.routes[`/notes/${note.slug}`].editorialStatus, 'approved');
    assert.equal(Object.isFrozen(note.blocks), true);
  }
  for (const [route, key] of Object.entries(snapshot.aliases)) assert.equal(catalog.aliases[route], key);
});

test('public catalog fails closed on drafts instead of silently omitting them', () => {
  assert.throws(() => loadNotebookCatalog({ approvedNotes: [syntheticDraft()] }), /editorial|field/);
});

test('public catalog exposes exact approved entries, summaries and canonical route maps', () => {
  const note = syntheticApprovedNote();
  const catalog = loadNotebookCatalog({ approvedNotes: [note] });
  assert.deepEqual(catalog.approvedNotes, [note]);
  assert.deepEqual(catalog.approvedSummaries, [{
    slug: note.slug, route: '/notes/synthetic-fixture', pageKey: 'note:synthetic-fixture',
    title: note.title, deck: note.deck, author: note.author, disclosure: note.disclosure,
    publishedOn: note.publishedOn, updatedOn: note.updatedOn,
  }]);
  assert.equal(catalog.aliases['/notes/synthetic-fixture'], 'note:synthetic-fixture');
  assert.equal(catalog.canonicalPaths['note:synthetic-fixture'], '/notes/synthetic-fixture');
  assert.equal(catalog.routes['/notes/synthetic-fixture'], catalog.pagesByKey['note:synthetic-fixture']);
  assert.equal(catalog.routes['/notes'], catalog.routes['/']);
  assert.equal(catalog.routes['/notes/synthetic-fixture'].editorialStatus, 'approved');
  for (const product of ['/evaluate', '/checkups', '/preflight', '/bench', '/docs', '/terms', '/assess']) {
    assert.equal(Object.hasOwn(catalog.routes, product), false, product);
  }
});

test('public catalog rejects duplicates and reserved, legacy, retired or malformed slugs', () => {
  const note = syntheticApprovedNote();
  assert.throws(() => loadNotebookCatalog({ approvedNotes: [note, note] }), /duplicate/);
  for (const slug of ['home', 'notes', 'preview', 'evaluate', 'remove-all-eyebrows', 'two-agents-one-bug', 'the-update-was-not-the-finish-line', '__proto__', '../escape', 'Mixed-Case', 'x/y', 'x%2fy', '-leading', 'trailing-', 'double--dash', 'x'.repeat(81)]) {
    assert.throws(() => loadNotebookCatalog({ approvedNotes: [syntheticApprovedNote({ ...syntheticPublication(), slug })] }), /slug/, slug);
  }
  assert.throws(() => loadNotebookCatalog({ approvedNotes: [note], retiredSlugs: [note.slug] }), /retired/);
  assert.throws(() => loadNotebookCatalog({ retiredSlugs: ['retired-fixture', 'retired-fixture'] }), /duplicate/);
});

test('approval record must explicitly approve the exact reader-visible publication', () => {
  for (const status of ['draft', 'pending', 'published', true, null]) {
    const note = syntheticApprovedNote();
    note.editorial.status = status;
    assert.throws(() => loadNotebookCatalog({ approvedNotes: [note] }), /approved/);
  }
  for (const digest of ['', 'sha256:' + '0'.repeat(64), 'SHA256:' + 'a'.repeat(64), 'sha256:' + 'A'.repeat(64)]) {
    const note = syntheticApprovedNote();
    note.editorial.contentDigest = digest;
    assert.throws(() => loadNotebookCatalog({ approvedNotes: [note] }), /digest/i);
  }
  const mutations = [
    n => { n.slug = 'different-fixture'; }, n => { n.title += '!'; }, n => { n.deck += '!'; },
    n => { n.author.name += '!'; }, n => { n.disclosure += '!'; },
    n => { n.blocks[0].text += '!'; }, n => { n.blocks[1].level = 3; },
    n => { n.blocks[2].text += '!'; }, n => { n.blocks[3].ordered = true; },
    n => { n.blocks[3].items.reverse(); }, n => { n.blocks.reverse(); },
    n => { n.sources[0].label += '!'; }, n => { n.sources[0].url += '-changed'; },
    n => { n.publishedOn = '2024-02-27'; }, n => { n.updatedOn = '2024-03-01'; },
  ];
  for (const mutate of mutations) {
    const note = syntheticApprovedNote();
    mutate(note);
    assert.throws(() => loadNotebookCatalog({ approvedNotes: [note] }), /digest/i);
  }
});

test('publication requires real date-only values in chronological order, never inferred time', () => {
  for (const [publishedOn, updatedOn] of [
    ['2024-02-30', '2024-03-01'], ['2023-02-29', '2024-03-01'],
    ['2024-03-01', '2024-02-29'], ['2024-02', '2024-03-01'],
    ['2024-02-28T00:00:00Z', '2024-03-01'], ['', '2024-03-01'],
    ['0000-01-01', '2024-03-01'], ['2024-01-01', '2024-13-01'],
  ]) {
    assert.throws(() => loadNotebookCatalog({ approvedNotes: [syntheticApprovedNote({ ...syntheticPublication(), publishedOn, updatedOn })] }), /date|publishedOn|updatedOn/);
  }
  const sameDay = syntheticApprovedNote({ ...syntheticPublication(), publishedOn: '2024-02-29' });
  assert.equal(loadNotebookCatalog({ approvedNotes: [sameDay] }).approvedNotes[0].publishedOn, '2024-02-29');
});

test('legacy story HTML bytes, titles, month precision and existing sitemap date stay unchanged', () => {
  const hashes = {
    article: 'd403e8bddf969c8b8d86b22cef22acbf16bf2b4cf58ef7e618463287386608b7',
    eyebrows: '980b8e5c0a47741b5d2709f82b9e00d9594f0a20da52db53db575f33e8e7a92e',
    bug: 'e721d6f317b3acbe0fabd5c5cfe9f3b4c52256085d9bfa45e80a780754788c31',
  };
  const catalog = loadNotebookCatalog();
  for (const [key, hash] of Object.entries(hashes)) {
    assert.equal(createHash('sha256').update(snapshot.pages[key].html, 'utf8').digest('hex'), hash);
    const page = catalog.pagesByKey[key];
    assert.equal(page.title, snapshot.pages[key].title);
    assert.equal(page.kind, 'legacy-story');
    assert.deepEqual(page.snapshotDate, { dateTime: '2026-10', label: 'October 2026' });
    assert.equal(page.sitemapLastModified, '2026-09-24');
  }
  const index = readFileSync(new URL('../public/notebook/index.html', import.meta.url), 'utf8');
  assert.ok(index.includes(`<title>${catalog.pagesByKey.home.title}</title>`));
});

test('digest is canonical, independently reproducible and never mints approval', () => {
  const publication = syntheticPublication();
  assert.equal(computeNoteDigest(publication), 'sha256:d0b30e669c7570394e3782d8dbbdbbe3042014700a3b93f5024ba74ea62ac415');
  const reordered = Object.fromEntries(Object.entries(publication).reverse());
  reordered.author = { kind: 'ai', name: publication.author.name };
  reordered.blocks = publication.blocks.map(block => Object.fromEntries(Object.entries(block).reverse()));
  reordered.sources = publication.sources.map(source => ({ url: source.url, label: source.label }));
  assert.equal(computeNoteDigest(reordered), computeNoteDigest(publication));
  assert.equal(Object.hasOwn(publication, 'editorial'), false);
  assert.throws(() => computeNoteDigest(syntheticDraft()), /field/);
  assert.throws(() => computeNoteDigest(syntheticApprovedNote()), /unexpected field/);
  const changed = syntheticPublication();
  changed.sources.push({ label: 'Second synthetic source', url: 'https://example.org/' });
  const before = computeNoteDigest(changed);
  changed.sources.reverse();
  assert.notEqual(computeNoteDigest(changed), before);
});

test('strict schema rejects private/evidence fields and rawHTML at every nesting level', () => {
  const mutations = [
    d => { d.evidence = 'synthetic-private-pointer'; },
    d => { d.approvalTranscript = 'synthetic transcript'; },
    d => { d.outputPath = 'synthetic-output'; },
    d => { d.sessionId = 'synthetic-id'; },
    d => { d.rawHTML = '<script>not allowed</script>'; },
    d => { d.author.internalId = 'synthetic-id'; },
    d => { d.blocks[0].rawHTML = '<img src=x onerror=alert(1)>'; },
    d => { d.blocks[1].evidence = 'synthetic-pointer'; },
    d => { d.blocks[2].language = 'unrecognized-field'; },
    d => { d.blocks[3].items[0] = { text: 'nested markup not allowed' }; },
    d => { d.sources[0].evidencePath = 'synthetic-private-pointer'; },
  ];
  for (const mutate of mutations) {
    const draft = syntheticDraft();
    mutate(draft);
    assert.throws(() => validateDraft(draft), NotebookContentError);
    assert.throws(() => renderDraftPreview(draft), NotebookContentError);
    const note = syntheticApprovedNote({ ...draft, publishedOn: '2024-02-28', updatedOn: '2024-02-29' });
    assert.throws(() => renderApprovedNote(note), NotebookContentError);
    assert.throws(() => loadNotebookCatalog({ approvedNotes: [note] }), NotebookContentError);
  }
  const note = syntheticApprovedNote();
  note.editorial.evidence = 'synthetic-private-pointer';
  assert.throws(() => validateApprovedNote(note), /unexpected field/);
  assert.throws(() => loadNotebookCatalog({ outputPath: 'synthetic-output' }), /unexpected field/);
  assert.throws(() => loadNotebookCatalog({ pages: [] }), /unexpected field/);
});

test('optional block metadata has explicit defaults and commits language without changing text', () => {
  const draft = syntheticDraft();
  delete draft.blocks[1].level;
  delete draft.blocks[3].ordered;
  draft.blocks[2].language = 'yaml';
  const checked = validateDraft(draft);
  assert.equal(checked.blocks[1].level, 2);
  assert.equal(checked.blocks[3].ordered, false);
  assert.equal(checked.blocks[2].language, 'yaml');
  assert.equal(checked.blocks[2].text, draft.blocks[2].text);
  assert.match(renderDraftPreview(draft).html, /<code data-language="yaml">/);
  const publication = { ...draft, publishedOn: '2024-02-28', updatedOn: '2024-02-29' };
  const note = { ...publication, editorial: { status: 'approved', contentDigest: computeNoteDigest(publication) } };
  validateApprovedNote(note);
  note.blocks[2].language = 'sh';
  assert.throws(() => validateApprovedNote(note), /digest/);
  for (const language of ['', '<script>', 'unrecognized-field', null]) {
    draft.blocks[2].language = language;
    assert.throws(() => validateDraft(draft), /language/);
  }
  for (const [index, key] of [[1, 'level'], [3, 'ordered']]) {
    const invalid = syntheticDraft();
    invalid.blocks[index][key] = undefined;
    assert.throws(() => validateDraft(invalid), NotebookContentError);
  }
});

test('all required fields, types and block shapes fail closed', () => {
  for (const key of Object.keys(syntheticDraft())) {
    const draft = syntheticDraft();
    delete draft[key];
    assert.throws(() => validateDraft(draft), /missing field/);
  }
  const mutations = [
    d => { d.title = ''; }, d => { d.deck = '  '; }, d => { d.disclosure = null; },
    d => { d.title = 'x'.repeat(201); }, d => { d.author.kind = 'human'; },
    d => { d.blocks = []; }, d => { d.blocks[0].type = 'rawHTML'; },
    d => { d.blocks[0].text = { value: 'not text' }; },
    d => { d.blocks[1].level = 1; }, d => { d.blocks[1].level = '2'; },
    d => { d.blocks[3].ordered = 'false'; }, d => { d.blocks[3].items = []; },
    d => { d.blocks[3].items[0] = null; }, d => { d.sources = null; },
    d => { d.title = 'control\u0000text'; }, d => { d.title = 'unpaired\ud800'; },
  ];
  for (const mutate of mutations) {
    const draft = syntheticDraft();
    mutate(draft);
    assert.throws(() => validateDraft(draft), NotebookContentError);
  }
  for (const options of [null, [], { approvedNotes: null }, { retiredSlugs: null }]) {
    assert.throws(() => loadNotebookCatalog(options), NotebookContentError);
  }
  const draft = syntheticDraft();
  draft.sources = [];
  assert.deepEqual(validateDraft(draft).sources, []);
});

test('objects must be data-only, including arrays, symbols and hidden properties', () => {
  let getterInvoked = false;
  const withGetter = syntheticDraft();
  Object.defineProperty(withGetter, 'title', { get() { getterInvoked = true; return 'not allowed'; }, enumerable: true });
  assert.throws(() => validateDraft(withGetter), /data fields/);
  assert.equal(getterInvoked, false);
  const hidden = syntheticDraft();
  Object.defineProperty(hidden, 'privateField', { value: 'synthetic' });
  assert.throws(() => validateDraft(hidden), /unexpected field/);
  const symbol = syntheticDraft();
  symbol[Symbol('synthetic')] = 'not allowed';
  assert.throws(() => validateDraft(symbol), /unexpected field/);
  assert.throws(() => validateDraft(Object.assign(Object.create({ inherited: true }), syntheticDraft())), /plain object/);
  for (const mutate of [
    d => { delete d.blocks[0]; },
    d => { d.sources.privateField = 'synthetic'; },
    d => { d.blocks[3].items[Symbol('private')] = 'synthetic'; },
    d => { Object.defineProperty(d.blocks, '0', { get() { getterInvoked = true; return {}; }, enumerable: true }); },
  ]) {
    const draft = syntheticDraft();
    mutate(draft);
    assert.throws(() => validateDraft(draft), /array/);
  }
  assert.equal(getterInvoked, false);
});

test('unsafe source hrefs are rejected in drafts and public notes', () => {
  for (const url of [
    'javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'file:///synthetic/file',
    '//example.com/path', '/relative', '#fragment', 'http://example.com/',
    ' https://example.com/', 'https://example.com/\nheader', 'https://example.com/%0aheader',
    'https://example.com/" onclick="alert(1)', 'https://example.com/<script>',
    'https://user:password@example.com/', 'https://127.0.0.1/', 'https://[::1]/',
    'https://2130706433/', 'https://0x7f000001/', 'https://10.0.0.1/',
    'https://localhost/', 'https://fixture.internal/', 'https://fixture.local/',
    'https://fixture.lan/', 'https://single-label/', 'https://example.com:8443/',
    'https://example.com\\@fixture.internal/', 'https://example.com./',
    'https:///example.com/', 'https:////example.com/', 'https://%65xample.com/',
    'https://fixture.home.arpa/', 'https://fixture.localdomain/',
    `https://${'x'.repeat(64)}.com/`,
  ]) {
    const draft = syntheticDraft();
    draft.sources[0].url = url;
    assert.throws(() => validateDraft(draft), NotebookContentError, url);
    assert.throws(() => renderDraftPreview(draft), NotebookContentError, url);
    assert.throws(() => renderApprovedNote(syntheticApprovedNote({ ...draft, publishedOn: '2024-02-28', updatedOn: '2024-02-29' })), NotebookContentError, url);
  }
});

test('approved renderer returns semantic article HTML with escaped reader-visible fields', () => {
  const publication = syntheticPublication();
  const hostile = '<script>alert("x")</script> & \'quote\' <img src=x onerror=alert(1)>';
  publication.title = hostile;
  publication.deck = hostile;
  publication.author.name = hostile;
  publication.disclosure = hostile;
  publication.blocks = [
    { type: 'paragraph', text: hostile }, { type: 'heading', level: 3, text: hostile },
    { type: 'code', text: hostile }, { type: 'list', ordered: true, items: [hostile] },
  ];
  publication.sources[0].label = hostile;
  const note = syntheticApprovedNote(publication);
  const html = renderApprovedNote(note);
  const escaped = '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;quote&#39; &lt;img src=x onerror=alert(1)&gt;';
  assert.match(html, /^<article class="fieldNotesView editorialArticle"/);
  assert.ok(html.includes(`<h1>${escaped}</h1>`));
  assert.ok(html.includes(`<h3>${escaped}</h3>`));
  assert.ok(html.includes(`<pre><code>${escaped}</code></pre>`));
  assert.ok(html.includes(`<ol><li>${escaped}</li></ol>`));
  assert.equal(html.split(escaped).length - 1, 9);
  assert.match(html, /AI author/);
  assert.match(html, /href="https:\/\/example.com\/docs\?a=1&amp;b=2#fixture"/);
  assert.match(html, /<time datetime="2024-02-28">2024-02-28<\/time>/);
  assert.match(html, /<time datetime="2024-02-29">2024-02-29<\/time>/);
  assert.doesNotMatch(html, /<script|<img|\sonclick=|sha256:|contentDigest|approvalTranscript/);
  const regular = renderApprovedNote(syntheticApprovedNote());
  assert.match(regular, /<ul><li>First fixture item<\/li>/);
  assert.match(regular, /<h2>A fixture heading<\/h2>/);
  assert.equal(renderApprovedNote(note), html);
});

test('preview is explicitly unapproved, date-free and never enters the public catalog', () => {
  const before = loadNotebookCatalog();
  const preview = renderDraftPreview(syntheticDraft());
  assert.equal(preview.status, 'unapproved');
  assert.equal(preview.indexable, false);
  assert.equal(preview.robots, 'noindex, nofollow');
  assert.match(preview.html, /Unapproved draft — local preview only\. Not published\./);
  assert.match(preview.html, /data-editorial-status="unapproved"/);
  assert.match(preview.html, /Fixture AI/);
  assert.doesNotMatch(preview.html, /<time|datetime=|Published|Updated|canonical/);
  assert.equal(Object.hasOwn(preview, 'route'), false);
  const hostile = syntheticDraft();
  hostile.title = '<script>synthetic()</script>';
  hostile.blocks[0].text = '[synthetic](javascript:alert(1))';
  const escapedPreview = renderDraftPreview(hostile).html;
  assert.match(escapedPreview, /<h1>&lt;script&gt;synthetic\(\)&lt;\/script&gt;<\/h1>/);
  assert.match(escapedPreview, /<p>\[synthetic\]\(javascript:alert\(1\)\)<\/p>/);
  assert.doesNotMatch(escapedPreview, /<script|href="javascript:/);
  assert.deepEqual(loadNotebookCatalog(), before);
  assert.throws(() => loadNotebookCatalog({ approvedNotes: [preview] }), /field/);
  assert.throws(() => renderApprovedNote(syntheticDraft()), /field/);
  assert.throws(() => renderDraftPreview(syntheticPublication()), /unexpected field/);
  assert.throws(() => renderDraftPreview(syntheticApprovedNote()), /unexpected field/);
});

test('rendering revalidates commitments and never trusts an earlier successful check', () => {
  const note = syntheticApprovedNote();
  validateApprovedNote(note);
  note.blocks[0].text = 'Changed after validation.';
  assert.throws(() => renderApprovedNote(note), /digest/);
  assert.throws(() => loadNotebookCatalog({ approvedNotes: [syntheticApprovedNote(), note] }), /digest/);
});

test('every API preserves inputs and returns detached, deeply frozen data', () => {
  const draft = syntheticDraft();
  const publication = syntheticPublication();
  const note = syntheticApprovedNote();
  const options = { approvedNotes: [note], retiredSlugs: ['retired-fixture'] };
  const before = structuredClone({ draft, publication, note, options });
  const checkedDraft = validateDraft(draft);
  const checkedNote = validateApprovedNote(note);
  computeNoteDigest(publication);
  renderApprovedNote(note);
  const preview = renderDraftPreview(draft);
  const catalog = loadNotebookCatalog(options);
  assert.deepEqual({ draft, publication, note, options }, before);
  assert.equal(Object.isFrozen(draft), false);
  assert.equal(Object.isFrozen(note.blocks), false);
  for (const result of [checkedDraft, checkedNote, preview, catalog]) assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(catalog.approvedNotes[0].blocks[3].items), true);
  assert.notEqual(catalog.approvedNotes[0], note);
  assert.notEqual(checkedDraft.blocks, draft.blocks);
  note.blocks[0].text = 'Changed original';
  draft.sources[0].label = 'Changed original';
  assert.equal(catalog.approvedNotes[0].blocks[0].text, 'A fixture paragraph.');
  assert.equal(checkedDraft.sources[0].label, 'Example documentation (synthetic citation)');
  assert.throws(() => { catalog.aliases['/injected'] = 'home'; }, TypeError);
  assert.throws(() => { checkedNote.blocks[0].text = 'Changed output'; }, TypeError);
});
