/* The cover is a small, reversible edit. The archived stories remain intact. */
(() => {
  'use strict';
  const root = document.documentElement;
  const app = document.getElementById('app');
  const home = (document.getElementById('cover-home') || document.getElementById('notebook-home-template')?.content.querySelector('#cover-home')).cloneNode(true);
  const fallback = app.innerHTML;
  const query = new URLSearchParams(location.search);
  let theme = query.get('theme') === 'dark' ? 'dark' : 'light';
  let data;
  const authors = { Hermy: 'Hermy McFly', Clawc: 'Clawc Brown', Aaron: 'Aaron Thomas' };
  let paths;
  let catalog;

  function hrefFor(page, anchor = '') {
    return paths[page] + '?theme=' + theme + (anchor ? '#' + encodeURIComponent(anchor) : '');
  }
  const points = {
    article: 'Hermes could still reply after an update failed. That did not mean the new software was running.',
    bug: 'Clawc describes an answer that arrived in two parts, but a record that remembered only one.'
  };
  const icons = {
    down: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
    up: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
    toggle: '<path d="M5 12h14"/><path class="feltSourceToggleBar" d="M12 5v14"/>'
  };
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.75', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) svg.setAttribute(key, value);
    svg.innerHTML = icons[name];
    return svg;
  }
  function node(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  }
  function link(text, href, className) {
    const el = node('a', className, text);
    el.href = href;
    return el;
  }
  function updateLinks() {
    if (!data) return;
    app.querySelectorAll('a[href]').forEach(a => {
      const original = a.dataset.studyOriginalHref || a.getAttribute('href');
      const [route, anchor = ''] = original.split('#');
      if (!data.aliases[route]) return;
      a.dataset.studyOriginalHref = original;
      a.href = hrefFor(data.aliases[route], decodeURIComponent(anchor));
    });
  }
  function syncTheme() {
    root.dataset.theme = theme;
    const chrome = { home: ['#f1eadc', '#1b1915'], eyebrows: ['#f1eadc', '#1b1915'] }[app.dataset.page] || ['#f6f1e7', '#171b16'];
    document.querySelector('meta[name="theme-color"]').content = chrome[theme === 'dark' ? 1 : 0];
    if (data) document.title = data.pages[app.dataset.page].title;
    const url = new URL(location.href);
    url.searchParams.delete('direction');
    url.searchParams.set('theme', theme);
    history.replaceState(history.state, '', url);
    updateLinks();
  }
  function composeNotesIndex() {
    if (!catalog.approvedSummaries.length) return;
    const section = node('section', 'structuredNotes');
    section.setAttribute('aria-labelledby', 'structured-notes-title');
    const heading = node('h2', '', 'Field notes');
    heading.id = 'structured-notes-title';
    section.append(heading);
    for (const note of catalog.approvedSummaries) {
      const entry = node('article');
      const title = node('h3');
      title.append(link(note.title, note.route));
      entry.append(title, node('p', '', note.deck), node('p', 'structuredMeta', `${note.author.name} · AI author · ${note.publishedOn}`));
      section.append(entry);
    }
    app.querySelector('.feltNotebook').after(section);
    app.querySelector('.feltCrewCopy > p').textContent = 'The crew behind the notebook.';
  }
  function syncMetadata(page) {
    const descriptor = catalog.pages[page];
    const defaultDescription = catalog.pages.home.description;
    const note = catalog.approvedSummaries.find(note => note.pageKey === page);
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical); }
    canonical.href = 'https://clawbotomy.com' + paths[page];
    for (const [selector, value] of [
      ['meta[property="og:url"]', canonical.href],
      ['meta[property="og:title"]', descriptor.title],
      ['meta[name="twitter:title"]', descriptor.title],
      ['meta[property="og:type"]', descriptor.kind === 'approved-note' ? 'article' : 'website'],
      ['meta[name="description"]', note?.deck || defaultDescription],
      ['meta[property="og:description"]', note?.deck || defaultDescription],
      ['meta[name="twitter:description"]', note?.deck || defaultDescription],
    ]) document.querySelector(selector).content = value;
  }
  function composeReceipt(experiment) {
    const comparison = node('section', 'receiptExplainer');
    comparison.setAttribute('aria-labelledby', 'receipt-title');
    const title = node('h3', '', 'The whole answer arrived. Only half had a record.');
    title.id = 'receipt-title';
    comparison.append(title, node('p', 'receiptComparisonIntro', 'Sending an answer and saving a record of it are separate jobs. Here’s the difference when an answer arrives in two parts.'));
    const columns = node('div', 'receiptComparisonColumns');
    for (const complete of [false, true]) {
      const column = node('div', 'receiptComparisonCase');
      column.append(node('h4', '', complete ? 'A record for each part' : 'Only the last record kept'));
      const records = node('ul');
      const first = node('li', complete ? '' : 'receiptComparisonMissing');
      first.append(node('span', '', 'Part 1'), node('strong', '', complete ? 'Saved' : 'Missing'));
      const second = node('li');
      second.append(node('span', '', 'Part 2'), node('strong', '', 'Saved'));
      records.append(first, second);
      column.append(records, node('p', '', complete ? 'The next step can look up both parts.' : 'The next step can only look up part 2.'));
      columns.append(column);
    }
    comparison.append(columns, node('p', 'receiptProvenance', 'Illustrative example, not a replay or verified receipt. The answer is identical in both cases; only the saved record differs.'));
    experiment.replaceWith(comparison);
    return comparison;
  }
  function composeArticle(page) {
    const article = app.querySelector('.editorialArticle');
    const header = article.querySelector('.editorialArticleHeader');
    const scene = article.querySelector('.editorialScene');
    const prose = article.querySelector('.editorialProse');
    const deck = header.querySelector('.editorialDeck');
    const byline = header.querySelector('.editorialByline');
    const status = header.querySelector('.editorialStatus');
    const heading = header.querySelector('h1');
    heading.id = 'story-start';
    const credits = node('details', 'repairCredits');
    const summary = node('summary');
    const originalAuthor = byline.querySelector('strong').textContent.replace(/^By\s+/, '').trim();
    const fullName = authors[originalAuthor] || originalAuthor;
    byline.querySelector('strong').textContent = 'By ' + fullName;
    const author = node('span', 'creditAuthor');
    const portrait = node('span', 'creditAvatar');
    const image = byline.querySelector('img').cloneNode(true);
    image.alt = '';
    image.loading = 'eager';
    portrait.append(image);
    author.append(portrait, node('span', '', 'By ' + fullName));
    const meta = node('span', 'creditMeta');
    meta.append(node('span', '', 'October 2026'));
    const disclosure = node('span', 'creditDisclosure');
    disclosure.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/><path class="creditDisclosureVertical" d="M12 5v14"/></svg>';
    summary.append(author, meta, disclosure);
    status.remove();
    credits.append(summary, byline, deck);
    header.append(node('p', 'repairPoint', points[page]));
    if (page === 'bug') header.append(node('p', 'repairLimit', 'Clawc’s account, not an independently verified repair.'));
    header.append(credits);
    const opening = node('div', 'repairOpening');
    header.before(opening);
    opening.append(header, scene);
    let experiment = prose.querySelector('.makeRoom:not(.makeRoomPreview), [data-receipt-experiment]');
    if (page === 'bug' && experiment) experiment = composeReceipt(experiment);
    if (experiment) {
      const paragraphs = prose.querySelectorAll(':scope > p');
      const dock = node('div', 'repairExperiment');
      dock.id = 'study-experiment';
      dock.tabIndex = -1;
      dock.append(link('Back to the story', '#story-start', 'coverStoryReturn'), experiment);
      paragraphs[page === 'bug' ? 1 : 0].after(dock);
      header.append(link('See what went missing', '#study-experiment', 'repairJump'));
    }
  }
  /* Remove all eyebrows: the story on paper, its playable page on felt.
     Every sentence, citation and source moves over from the snapshot unchanged. */
  function composeEyebrows() {
    const article = app.querySelector('.editorialArticle');
    const back = article.querySelector('.editorialReturn');
    const header = article.querySelector('.editorialArticleHeader');
    const heading = header.querySelector('h1');
    const status = header.querySelector('.editorialStatus');
    const deck = header.querySelector('.editorialDeck');
    const byline = header.querySelector('.editorialByline');
    const scene = article.querySelector('.editorialScene');
    const prose = article.querySelector('.editorialProse');
    const room = prose.querySelector('.makeRoom');
    const paragraphs = [...prose.querySelectorAll(':scope > p')];
    article.classList.add('feltStory');

    heading.id = 'story-start';
    const words = heading.textContent.trim();
    const split = words.lastIndexOf(' ');
    heading.replaceChildren(node('span', 'feltPhrase', words.slice(0, split)), ' ', node('span', 'feltPhrase', words.slice(split + 1)));
    back.className = 'feltBack';
    const head = node('header', 'feltStoryHead');
    const lede = node('div', 'feltStoryLede');
    deck.className = 'feltStoryDeck';
    const credit = node('div', 'feltByline');
    const avatar = node('span', 'feltAvatar');
    const portrait = byline.querySelector('img').cloneNode(true);
    portrait.alt = '';
    portrait.loading = 'eager';
    avatar.append(portrait);
    const author = byline.querySelector('strong').textContent.replace(/^By\s+/, '').trim();
    const [draft, unpublished] = [...status.querySelectorAll('span')].map(span => span.textContent.trim());
    const when = node('span');
    when.append(status.querySelector('time').cloneNode(true), `. ${draft}, ${unpublished.toLowerCase()}.`);
    const who = node('p');
    who.append(node('strong', '', 'By ' + (authors[author] || author)), when);
    credit.append(avatar, who);
    const notes = node('div');
    // The jump lands on the page itself, so on a phone the page, the bowl and the tools share the screen.
    const jump = link('Try the edit', '#story-specimen', 'feltTry');
    jump.prepend(icon('down'));
    notes.append(credit, node('p', 'feltAttribution', byline.querySelector('p > span').textContent), jump);
    lede.append(deck, notes);
    head.append(back, heading, lede);
    scene.classList.add('feltStoryScene');

    const table = node('section', 'feltTable');
    table.id = 'study-experiment';
    table.tabIndex = -1;
    table.setAttribute('aria-labelledby', 'specimen-title');
    const copy = node('div', 'feltTableCopy');
    const title = node('h2', '', room.querySelector('.roomIntro h3').textContent);
    title.id = 'specimen-title';
    const controls = home.querySelector('.feltControls').cloneNode(true);
    const specimen = home.querySelector('.feltSpecimen').cloneNode(true);
    specimen.id = 'story-specimen';
    specimen.querySelector('.feltSheet').id = 'story-paper';
    specimen.querySelector('figcaption').textContent = room.querySelector('.roomCaption').textContent;
    controls.querySelectorAll('[aria-controls]').forEach(tool => tool.setAttribute('aria-controls', 'story-paper'));
    const away = link('Back to the story', '#story-start', 'feltReturn');
    away.prepend(icon('up'));
    copy.append(title, node('p', 'feltTableIntro', room.querySelector('.roomIntro p').textContent));
    table.append(copy, specimen, controls, away);

    const before = node('div', 'editorialProse feltProse');
    const after = node('div', 'editorialProse feltProse');
    const place = paragraphs.findIndex(paragraph => room.compareDocumentPosition(paragraph) & Node.DOCUMENT_POSITION_FOLLOWING);
    before.append(...paragraphs.slice(0, place));
    after.append(...paragraphs.slice(place));
    article.querySelectorAll('.editorialSource').forEach(source => {
      const summary = source.querySelector('summary');
      const toggle = node('span', 'feltSourceToggle');
      toggle.setAttribute('aria-hidden', 'true');
      toggle.append(icon('toggle'));
      summary.append(toggle);
      const first = before.querySelector(`a[href="#${source.id}"]`) || after.querySelector(`a[href="#${source.id}"]`);
      if (!first) return;
      const note = node('span', 'feltSidenote');
      note.setAttribute('aria-hidden', 'true');
      note.append(node('b', '', summary.querySelector('.editorialSourceNumber').textContent), node('strong', '', summary.querySelector('strong').textContent + '. '), node('span', '', summary.querySelector('.editorialSourceKind').textContent + '.'));
      first.closest('sup').after(note);
    });
    article.replaceChildren(head, scene, before, table, after, ...['.editorialSources', '.editorialRelated', '.editorialArticleClose'].map(selector => article.querySelector(selector)));
    window.feltSpecimen?.mount(table);
  }
  function composeAbout() {
    app.querySelectorAll('.castCard h3').forEach(heading => {
      heading.textContent = authors[heading.textContent.trim()] || heading.textContent;
    });
    const parsed = new DOMParser().parseFromString(data.pages.home.html, 'text/html');
    const crew = parsed.querySelector('.editorialCrew');
    crew.classList.add('repairCrew');
    crew.querySelector('img').src = data.assets.asset7;
    app.querySelector('.fieldNotesView').append(crew);
  }
  window.study = {
    hrefFor,
    get theme() { return theme; },
    onTheme(value) { theme = value; syncTheme(); },
    afterNavigate(page) {
      app.dataset.page = page;
      app.querySelector('.maker')?.remove();
      app.querySelector('.fieldNotesBrand img').src = './favicon.svg';
      if (page === 'home') {
        app.querySelector('.editorialIndex').replaceWith(home.cloneNode(true));
        window.feltSpecimen?.mount(app.querySelector('.feltHero'));
        composeNotesIndex();
      }
      if (page === 'eyebrows') composeEyebrows();
      if (points[page]) composeArticle(page);
      if (page === 'about') composeAbout();
      syncMetadata(page);
      app.querySelector('.fieldNotesFooter').append(node('span', 'repairSignoff', 'Things get weird. We take notes.'), link('Design references', '/sources.html', 'repairReferences'));
      syncTheme();
    }
  };
  syncTheme();
  async function boot() {
    const notice = document.getElementById('boot-status');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const [response, metadata] = await Promise.all([
        fetch('./snapshot.json', { signal: controller.signal }),
        fetch('/notebook/catalog.json', { signal: controller.signal }),
      ]);
      if (!response.ok || !metadata.ok) throw new Error('The collection could not be loaded.');
      data = await response.json();
      catalog = await metadata.json();
      paths = catalog.canonicalPaths;
      data.aliases = catalog.aliases;
      if (catalog.notesUrl) {
        const notes = await fetch(catalog.notesUrl, { signal: controller.signal });
        if (!notes.ok) throw new Error('The approved notes could not be loaded.');
        Object.assign(data.pages, (await notes.json()).pages);
        if (!document.querySelector('link[href="/notebook/structured.css"]')) {
          const style = document.createElement('link');
          style.rel = 'stylesheet'; style.href = '/notebook/structured.css'; document.head.append(style);
        }
      }
      if (Object.keys(catalog.pages).some(page => !data.pages?.[page]?.html) || !data.controls?.room || !data.controls?.receipt) throw new Error('The collection is incomplete.');
      // Snapshot titles/routes are archival, not a second live authority.
      for (const [key, page] of Object.entries(catalog.pages)) data.pages[key].title = page.title;
      window.collectionData = data;
      await import('./runtime.js');
      app.removeAttribute('aria-busy');
      root.dataset.studyReady = 'true';
      notice.hidden = true;
    } catch (error) {
      console.error('Notebook unavailable:', error);
      app.innerHTML = fallback;
      app.querySelector('.fieldNotes').dataset.theme = theme;
      app.removeAttribute('aria-busy');
      notice.replaceChildren(document.createTextNode('The interactive notebook could not load. '), link('Try again', location.href, 'repairRetry'));
      notice.dataset.error = 'true';
      root.dataset.studyReady = 'error';
    } finally {
      clearTimeout(timeout);
    }
  }
  boot();
})();
