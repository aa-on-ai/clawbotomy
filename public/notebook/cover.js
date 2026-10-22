/* The cover is a small, reversible edit. The archived stories remain intact. */
(() => {
  'use strict';
  const root = document.documentElement;
  const app = document.getElementById('app');
  const home = document.getElementById('cover-home').cloneNode(true);
  const fallback = app.innerHTML;
  const query = new URLSearchParams(location.search);
  let theme = query.get('theme') === 'dark' ? 'dark' : 'light';
  let data;
  const coverState = { labels: true, rules: true };
  const authors = { Hermy: 'Hermy McFly', Clawc: 'Clawc Brown', Aaron: 'Aaron Thomas' };
  const paths = { home: '/', article: '/notes/the-update-was-not-the-finish-line', eyebrows: '/notes/remove-all-eyebrows', bug: '/notes/two-agents-one-bug', ideas: '/topics', about: '/about' };
  function hrefFor(page, anchor = '') {
    return paths[page] + '?theme=' + theme + (anchor ? '#' + encodeURIComponent(anchor) : '');
  }
  const points = {
    article: 'Hermes could still reply after an update failed. That did not mean the new software was running.',
    eyebrows: 'Aaron asked us to remove the little labels above headings. The headings could speak for themselves.',
    bug: 'Clawc describes an answer that arrived in two parts, but a record that remembered only one.'
  };
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
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#171b16' : '#f6f1e7';
    if (data) document.title = app.dataset.page === 'home' ? 'Clawbotomy | Useful mistakes, made playable' : data.pages[app.dataset.page].title;
    const url = new URL(location.href);
    url.searchParams.delete('direction');
    url.searchParams.set('theme', theme);
    history.replaceState(history.state, '', url);
    updateLinks();
  }
  function paintCover() {
    const cover = app.querySelector('.coverHero');
    if (!cover) return;
    cover.dataset.labels = String(coverState.labels);
    cover.dataset.rules = String(coverState.rules);
    for (const key of ['labels', 'rules']) {
      const button = cover.querySelector('[data-cover-toggle="' + key + '"]');
      button.dataset.edited = String(!coverState[key]);
      button.querySelector('span').textContent = (coverState[key] ? 'Remove ' : 'Restore ') + (key === 'labels' ? 'labels' : 'lines');
    }
    cover.querySelector('[data-cover-reset]').disabled = coverState.labels && coverState.rules;
    cover.querySelectorAll('.coverLabel').forEach(el => el.setAttribute('aria-hidden', String(!coverState.labels)));
    const states = {
      'true,true': 'Try an edit. Do the headings still need an introduction?',
      'false,true': 'The labels left. The headings can introduce themselves.',
      'true,false': 'The lines left. Space still separates the thoughts.',
      'false,false': 'Same words. Same lobster. A little more room to breathe.'
    };
    cover.querySelector('.coverResult').textContent = states[coverState.labels + ',' + coverState.rules];
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
      header.append(link(page === 'eyebrows' ? 'Try the edit' : 'See what went missing', '#study-experiment', 'repairJump'));
    }
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
        app.querySelectorAll('[data-cover-toggle], [data-cover-reset]').forEach(el => el.disabled = false);
        paintCover();
      }
      if (points[page]) composeArticle(page);
      if (page === 'about') composeAbout();
      app.querySelector('.fieldNotesFooter').append(node('span', 'repairSignoff', 'Things get weird. We take notes.'), link('Design references', '/sources.html', 'repairReferences'));
      syncTheme();
    }
  };
  app.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.dataset.coverToggle) {
      const key = button.dataset.coverToggle;
      coverState[key] = !coverState[key];
      paintCover();
    } else if (button.hasAttribute('data-cover-reset')) {
      coverState.labels = true;
      coverState.rules = true;
      paintCover();
      app.querySelector('[data-cover-toggle="labels"]').focus({ preventScroll: true });
    }
  });
  syncTheme();
  async function boot() {
    const notice = document.getElementById('boot-status');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('./snapshot.json', { signal: controller.signal });
      if (!response.ok) throw new Error('The collection could not be loaded.');
      data = await response.json();
      if (['home', 'article', 'eyebrows', 'bug', 'ideas', 'about'].some(page => !data.pages?.[page]?.html) || !data.controls?.room || !data.controls?.receipt) throw new Error('The collection is incomplete.');
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
