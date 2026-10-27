import { loadNotebookCatalog, renderApprovedNote } from './notebook-content.mjs';

export const notebookOrigin = 'https://clawbotomy.com';
const escape = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

// All public consumers validate the COMPLETE source catalog, never a filtered list.
// options is a pure test seam; no environment variables or external file loaders.
export function notebookRewrites(options) {
  const catalog = loadNotebookCatalog(options);
  return Object.entries(catalog.routes).map(([source, page]) => ({
    source,
    destination: page.kind === 'approved-note'
      ? `/notebook/generated/${source.slice('/notes/'.length)}.html`
      : '/notebook/index.html',
  }));
}

export function notebookSitemap(options) {
  return Object.entries(loadNotebookCatalog(options).routes).map(([route, page]) => ({
    url: notebookOrigin + (route === '/' ? '' : route),
    lastModified: new Date(page.updatedOn || page.sitemapLastModified),
    changeFrequency: route === '/' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1 : 0.7,
  }));
}

export function notebookBrowserCatalog(options) {
  const { pagesByKey, aliases, canonicalPaths, approvedSummaries } = loadNotebookCatalog(options);
  return { pages: pagesByKey, aliases, canonicalPaths, approvedSummaries,
    notesUrl: approvedSummaries.length ? '/notebook/generated/notes.json' : null };
}

function noteShell(note) {
  return `<div class="fieldNotes" data-theme="light">
<a class="fieldNotesSkip" href="#main-content">Skip to the field notes</a>
<header class="fieldNotesHeader"><a class="fieldNotesBrand" href="/" aria-label="Clawbotomy field notes home"><img src="/notebook/favicon.svg" width="34" height="34" alt=""><span>clawbotomy</span></a><div class="fieldNotesHeaderSide"><nav class="fieldNotesNav" aria-label="Primary navigation"><a href="/notes">Notes</a><a href="/topics">Ideas</a><a href="/about">About</a></nav><button class="fieldNotesThemeControl" type="button" aria-label="Switch to dark mode">Theme</button></div></header>
<main id="main-content" tabindex="-1"><div class="fieldNotesView structuredReturn"><a class="editorialReturn" href="/notes">Back to the notebook</a></div>${renderApprovedNote(note)}</main>
<footer class="fieldNotesFooter"><span>© Clawbotomy 2026</span></footer></div>`;
}

// Generate only approved-note artifacts; the empty state has NO generated files.
// The original cover and all snapshot story strings remain byte-for-byte unchanged.
export function notebookArtifacts(template, options) {
  const catalog = loadNotebookCatalog(options);
  if (!catalog.approvedNotes.length) return {};
  const home = template.match(/<main id="main-content"[^>]*>([\s\S]*?)<\/main>/)?.[1];
  const appPattern = /<div id="app" aria-busy="true">[\s\S]*?(?=\s*<div id="offline-status")/;
  if (!home || !appPattern.test(template)) throw new Error('Notebook template contract changed');
  const files = {};
  const pages = {};
  for (const note of catalog.approvedNotes) {
    const page = catalog.pagesByKey[`note:${note.slug}`];
    const html = noteShell(note);
    pages[page.pageKey] = { title: page.title, html };
    let document = template.replace(appPattern, () => `<template id="notebook-home-template">${home}</template>\n<div id="app" aria-busy="true">${html}</div>\n`);
    document = document.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escape(page.title)}</title>`)
      .replace(/(<meta (?:name|property)="(?:description|og:description|twitter:description)" content=")[^"]*(">)/g, (_, start, end) => start + escape(note.deck) + end)
      .replace(/(<meta (?:name|property)="(?:og:title|twitter:title)" content=")[^"]*(">)/g, (_, start, end) => start + escape(page.title) + end)
      .replace(/(<meta property="og:url" content=")[^"]*(">)/, (_, start, end) => start + notebookOrigin + page.route + end)
      .replace('property="og:type" content="website"', 'property="og:type" content="article"')
      .replace('</head>', `<link rel="canonical" href="${notebookOrigin}${page.route}">\n<link rel="stylesheet" href="/notebook/structured.css">\n</head>`);
    files[`${note.slug}.html`] = document;
  }
  // Deliberately no approval records, hashes, private evidence or draft objects.
  files['notes.json'] = JSON.stringify({ pages }) + '\n';
  return files;
}
