import { createHash } from 'node:crypto';
import catalog from '../../content/notebook/catalog.mjs';

// Pure Node ESM: no filesystem, network, clock, export or publication side effects.
// This is an operator-supplied approval policy check, NOT identity/consent proof.
const DRAFT_FIELDS = ['slug', 'title', 'deck', 'author', 'disclosure', 'blocks', 'sources'];
const PUBLICATION_FIELDS = [...DRAFT_FIELDS, 'publishedOn', 'updatedOn'];
const reserved = new Set([
  ...catalog.reservedSlugs,
  ...catalog.pages.filter(page => page.kind === 'legacy-story').map(page => page.route.slice('/notes/'.length)),
]);

export class NotebookContentError extends Error {
  constructor(path, reason) {
    super(`${path}: ${reason}`);
    this.name = 'NotebookContentError';
    this.code = 'INVALID_NOTEBOOK_CONTENT';
  }
}
const fail = (path, reason) => { throw new NotebookContentError(path, reason); };

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function record(value, fields, path, required = fields) {
  if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    fail(path, 'expected a plain object');
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !fields.includes(key)) fail(path, 'unexpected field');
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) fail(path, 'expected enumerable data fields');
  }
  for (const key of required) if (!Object.hasOwn(value, key)) fail(path, `missing field ${key}`);
  return value;
}

function array(value, path, min, max) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length < min || value.length > max) {
    fail(path, `expected an array with ${min}..${max} entries`);
  }
  if (Reflect.ownKeys(value).length !== value.length + 1) fail(path, 'expected dense array without extra fields');
  for (let index = 0; index < value.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail(path, 'expected dense array of data values');
  }
  return value;
}

function text(value, path, max = 20000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || !value.isWellFormed()
      || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) {
    fail(path, 'expected nonblank, bounded plain text without control characters');
  }
  return value; // Never trim, interpret Markdown/HTML, or silently repair content.
}

function slugSyntax(value, path) {
  if (typeof value !== 'string' || value.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    fail(path, 'invalid slug');
  }
  return value;
}
function slug(value) {
  slugSyntax(value, 'note.slug');
  if (reserved.has(value)) fail('note.slug', 'reserved or existing legacy slug');
  if (catalog.retiredSlugs.includes(value)) fail('note.slug', 'retired slug');
  return value;
}

function sourceURL(value, path) {
  text(value, path, 2048);
  // Conservative public HTTPS syntax. No relative, credentialed, intranet or IP URLs.
  // No DNS/network access: public reachability and prose privacy need manual review.
  if (!/^https:\/\/[a-zA-Z0-9.-]+(?::443)?(?:[/?#]|$)/.test(value)
      || /[^\x21-\x7e]|[<>"'\\]/.test(value)
      || /%(?:0[0-9a-f]|1[0-9a-f]|7f)/i.test(value)) fail(path, 'unsafe source URL');
  let url;
  try { url = new URL(value); } catch { fail(path, 'invalid source URL'); }
  const host = url.hostname;
  if (url.protocol !== 'https:' || url.username || url.password || url.port
      || !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z][a-z0-9-]*$/.test(host)
      || host.length > 253 || host.split('.').some(label => label.length > 63)
      || /(?:^|\.)(?:localhost|local|localdomain|internal|intranet|lan|home|home\.arpa|test|invalid|onion)$/.test(host)) {
    fail(path, 'unsafe source URL');
  }
  return value;
}

function block(value, index) {
  const path = `note.blocks[${index}]`;
  // Read the discriminant only after ruling out accessors and unexpected fields.
  record(value, ['type', 'text', 'level', 'ordered', 'items', 'language'], path, ['type']);
  switch (value.type) {
    case 'paragraph':
      record(value, ['type', 'text'], path);
      return { type: value.type, text: text(value.text, `${path}.text`) };
    case 'code': {
      record(value, ['type', 'text', 'language'], path, ['type', 'text']);
      const result = { type: value.type, text: text(value.text, `${path}.text`) };
      if (Object.hasOwn(value, 'language')) {
        if (!['text', 'sh', 'bash', 'json', 'yaml', 'javascript', 'typescript', 'python', 'html', 'css'].includes(value.language)) {
          fail(path, 'unsupported code language');
        }
        result.language = value.language;
      }
      return result;
    }
    case 'heading': {
      record(value, ['type', 'level', 'text'], path, ['type', 'text']);
      const level = Object.hasOwn(value, 'level') ? value.level : 2;
      if (![2, 3].includes(level)) fail(path, 'heading level must be 2 or 3');
      return { type: 'heading', level, text: text(value.text, `${path}.text`, 300) };
    }
    case 'list': {
      record(value, ['type', 'ordered', 'items'], path, ['type', 'items']);
      const ordered = Object.hasOwn(value, 'ordered') ? value.ordered : false;
      if (typeof ordered !== 'boolean') fail(path, 'ordered must be boolean');
      return { type: 'list', ordered, items: array(value.items, `${path}.items`, 1, 100)
        .map((item, i) => text(item, `${path}.items[${i}]`)) };
    }
    default: fail(path, 'unsupported block type');
  }
}

// Call only after the caller's complete top-level schema has been checked.
function draftProjection(value) {
  record(value.author, ['name', 'kind'], 'note.author');
  if (value.author.kind !== 'ai') fail('note.author.kind', 'must explicitly be ai');
  return {
    slug: slug(value.slug),
    title: text(value.title, 'note.title', 200),
    deck: text(value.deck, 'note.deck', 1000),
    author: { name: text(value.author.name, 'note.author.name', 120), kind: 'ai' },
    disclosure: text(value.disclosure, 'note.disclosure', 2000),
    blocks: array(value.blocks, 'note.blocks', 1, 200).map(block),
    sources: array(value.sources, 'note.sources', 0, 100).map((source, index) => {
      const path = `note.sources[${index}]`;
      record(source, ['label', 'url'], path);
      return { label: text(source.label, `${path}.label`, 300), url: sourceURL(source.url, `${path}.url`) };
    }),
  };
}

function dateOnly(value, path) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) {
    fail(path, 'expected a real YYYY-MM-DD date');
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) fail(path, 'invalid calendar date');
  return value;
}

function publicationProjection(value) {
  const draft = draftProjection(value);
  const publishedOn = dateOnly(value.publishedOn, 'note.publishedOn');
  const updatedOn = dateOnly(value.updatedOn, 'note.updatedOn');
  if (updatedOn < publishedOn) fail('note.updatedOn', 'date precedes publishedOn');
  return { ...draft, publishedOn, updatedOn };
}

const digest = projection => 'sha256:' + createHash('sha256')
  .update(JSON.stringify({ schemaVersion: 1, ...projection }), 'utf8').digest('hex');

/** Validate a draft-only interchange object; never adds dates or approval. */
export function validateDraft(value) {
  record(value, DRAFT_FIELDS, 'draft');
  return freeze(draftProjection(value));
}

/** Hash a publication projection (draft + supplied dates, no editorial record). */
export function computeNoteDigest(value) {
  record(value, PUBLICATION_FIELDS, 'publication');
  return digest(publicationProjection(value));
}

/** Deterministic policy only; the caller must independently establish authorization. */
export function validateApprovedNote(value) {
  record(value, [...PUBLICATION_FIELDS, 'editorial'], 'note');
  record(value.editorial, ['status', 'contentDigest'], 'note.editorial');
  if (value.editorial.status !== 'approved') fail('note.editorial.status', 'must explicitly be approved');
  const projection = publicationProjection(value);
  const contentDigest = value.editorial.contentDigest;
  if (typeof contentDigest !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(contentDigest) || contentDigest !== digest(projection)) {
    fail('note.editorial.contentDigest', 'approval digest missing, malformed or mismatched');
  }
  return freeze({ ...projection, editorial: { status: 'approved', contentDigest } });
}

/** Options may supply a whole candidate approved list, never mixed drafts/notes.
 * Additional retiredSlugs only extend the repository retirement policy.
 * Invalid entries abort the entire catalog; nothing is silently filtered out.
 */
export function loadNotebookCatalog(options = {}) {
  record(options, ['approvedNotes', 'retiredSlugs'], 'catalog options', []);
  const retiredSlugs = [...catalog.retiredSlugs, ...array(
    Object.hasOwn(options, 'retiredSlugs') ? options.retiredSlugs : [], 'retiredSlugs', 0, 10000)];
  const retired = new Set();
  for (const value of retiredSlugs) {
    slugSyntax(value, 'retired slug');
    if (retired.has(value)) fail('retiredSlugs', 'duplicate retired slug');
    retired.add(value);
  }
  const approvedNotes = array(Object.hasOwn(options, 'approvedNotes') ? options.approvedNotes : catalog.approvedNotes,
    'approvedNotes', 0, 10000).map(validateApprovedNote);
  const seen = new Set();
  for (const note of approvedNotes) {
    if (seen.has(note.slug)) fail('approvedNotes', 'duplicate slug');
    if (retired.has(note.slug)) fail('approvedNotes', 'retired slug');
    seen.add(note.slug);
  }
  const approvedSummaries = approvedNotes.map(note => ({
    slug: note.slug, route: `/notes/${note.slug}`, pageKey: `note:${note.slug}`,
    title: note.title, deck: note.deck, author: note.author, disclosure: note.disclosure,
    publishedOn: note.publishedOn, updatedOn: note.updatedOn,
  }));
  const pages = [...structuredClone(catalog.pages), ...approvedSummaries.map(note => ({
    pageKey: note.pageKey, route: note.route, aliases: [],
    title: `${note.title} | Clawbotomy field notes`, kind: 'approved-note',
    publicState: 'approved-for-publication', editorialStatus: 'approved',
    publishedOn: note.publishedOn, updatedOn: note.updatedOn,
  }))];
  const pagesByKey = Object.fromEntries(pages.map(page => [page.pageKey, page]));
  const canonicalPaths = Object.fromEntries(pages.map(page => [page.pageKey, page.route]));
  const routes = Object.fromEntries(pages.flatMap(page => [page.route, ...page.aliases].map(route => [route, page])));
  const aliases = Object.fromEntries(Object.entries(routes).map(([route, page]) => [route, page.pageKey]));
  return freeze({ pages, pagesByKey, routes, aliases, canonicalPaths, approvedNotes, approvedSummaries, retiredSlugs });
}

function escapeHTML(value) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

// Only validated projections enter this private renderer. No caller supplies tags,
// attributes, classes, raw HTML, Markdown, event handlers or output destinations.
function renderArticle(note, preview) {
  const body = note.blocks.map(block => {
    switch (block.type) {
      case 'paragraph': return `<p>${escapeHTML(block.text)}</p>`;
      case 'heading': return `<h${block.level}>${escapeHTML(block.text)}</h${block.level}>`;
      case 'code': return `<pre><code${block.language ? ` data-language="${block.language}"` : ''}>${escapeHTML(block.text)}</code></pre>`;
      case 'list': {
        const tag = block.ordered ? 'ol' : 'ul';
        return `<${tag}>${block.items.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</${tag}>`;
      }
    }
  }).join('\n');
  const sources = note.sources.length ? [
    '<section class="editorialSources" aria-label="Sources"><h2>Sources</h2><ol>',
    ...note.sources.map(source => `<li><a href="${escapeHTML(source.url)}" rel="noopener noreferrer" referrerpolicy="no-referrer">${escapeHTML(source.label)}</a></li>`),
    '</ol></section>',
  ].join('\n') : '';
  const status = preview ? 'unapproved' : 'approved';
  const notice = preview ? '<p class="editorialStatus" role="note">Unapproved draft — local preview only. Not published.</p>' : '';
  const dates = preview ? '' : `<p>Published <time datetime="${note.publishedOn}">${note.publishedOn}</time> · Updated <time datetime="${note.updatedOn}">${note.updatedOn}</time></p>`;
  return [
    `<article class="fieldNotesView editorialArticle" data-note-slug="${note.slug}" data-editorial-status="${status}">`,
    notice,
    '<header class="editorialArticleHeader">',
    `<h1>${escapeHTML(note.title)}</h1>`,
    `<p class="editorialDeck">${escapeHTML(note.deck)}</p>`,
    `<div class="editorialByline"><p><strong>${escapeHTML(note.author.name)}</strong><span>AI author</span></p></div>`,
    `<p class="editorialDisclosure">${escapeHTML(note.disclosure)}</p>`,
    dates,
    '</header>',
    `<div class="editorialProse">${body}</div>`,
    sources,
    '</article>',
  ].filter(Boolean).join('\n');
}

/** An article fragment only; revalidates approval and content on every call. */
export function renderApprovedNote(value) {
  return renderArticle(validateApprovedNote(value), false);
}

/** Explicitly local-only. Caller must honor robots metadata and keep it off public
 * routes/exports. This function writes nothing and creates no catalog entry.
 */
export function renderDraftPreview(value) {
  return freeze({
    status: 'unapproved', indexable: false, robots: 'noindex, nofollow',
    html: renderArticle(validateDraft(value), true),
  });
}
