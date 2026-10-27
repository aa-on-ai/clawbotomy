
const data = window.collectionData;

let theme = window.study?.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
let current;
let controlState = {};
const locations = new Map();
function hydrateAssets(scope) {
  scope.querySelectorAll('[data-offline-asset]').forEach(image => {
    image.src = data.assets[image.dataset.offlineAsset];
    image.removeAttribute('srcset');
  });
}
function syncTheme() {
  document.querySelector('.fieldNotes').dataset.theme = theme;
  const button = document.querySelector('.fieldNotesThemeControl');
  button.innerHTML = data.themeButtons[theme];
  const label = theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
  button.setAttribute('aria-label', label); button.title = label;
  window.study?.onTheme(theme);
}
function navigate(name, push = false, anchor = '') {
  if (!data.pages[name]) return;
  if (current) locations.set(current, scrollY);
  current = name;
  controlState = Object.fromEntries(Object.entries(data.controls).map(([key, spec]) => [key, spec.initial]));
  document.getElementById('app').innerHTML = data.pages[name].html;
  hydrateAssets(document.getElementById('app'));
  window.study?.afterNavigate(name);
  document.title = data.pages[name].title + ' | Design study';
  syncTheme();
  if (push) history.pushState({ page: name, anchor }, '', window.study.hrefFor(name, anchor));
  scrollTo(0, push ? 0 : locations.get(name) || 0);
  const target = anchor && document.getElementById(anchor);
  if (target) { target.scrollIntoView({ block: 'start' }); if (!target.hasAttribute('tabindex')) target.tabIndex = -1; target.focus({ preventScroll: true }); }
}
function changeControl(key, index) {
  const spec = data.controls[key];
  const state = spec.transitions[controlState[key]][index];
  if (state === undefined) return;
  const old = document.querySelector(spec.selector);
  const holder = document.createElement('template');
  holder.innerHTML = spec.states[state];
  const replacement = holder.content.firstElementChild;
  hydrateAssets(replacement);
  old.replaceWith(replacement);
  controlState[key] = state;
  const buttons = replacement.querySelectorAll(spec.buttons);
  const focus = buttons[index].disabled ? buttons[0] : buttons[index];
  focus.focus({ preventScroll: true });
  document.getElementById('offline-status').textContent = replacement.querySelector('[role="status"]')?.textContent || '';
}
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (button) {
    if (button.matches('.fieldNotesThemeControl')) { theme = theme === 'light' ? 'dark' : 'light'; syncTheme(); return; }
    for (const [key, spec] of Object.entries(data.controls)) {
      const section = button.closest(spec.selector);
      if (!section) continue;
      const index = [...section.querySelectorAll(spec.buttons)].indexOf(button);
      if (index >= 0 && !button.disabled) { changeControl(key, index); return; }
    }
  }
  const link = event.target.closest('a');
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const href = link.dataset.studyOriginalHref || link.getAttribute('href');
  const [route, encodedAnchor = ''] = (href || '').split('#');
  if (data.aliases[route]) {
    event.preventDefault(); navigate(data.aliases[route], true, decodeURIComponent(encodedAnchor));
    if (!encodedAnchor) { const main = document.querySelector('main'); main.tabIndex = -1; main.focus({ preventScroll: true }); }
    return;
  }
  if (href && href.startsWith('#')) {
    const target = document.getElementById(decodeURIComponent(href.slice(1)));
    if (!target) return;
    event.preventDefault();
    if (target instanceof HTMLDetailsElement) {
      target.open = true;
      const back = target.querySelector('[data-citation-return]');
      const label = back?.querySelector('[data-citation-return-label]');
      if (back && label && link.id) { back.setAttribute('href', '#' + link.id); label.textContent = 'Back to where you were reading'; }
    }
    target.scrollIntoView({ block: 'start' });
    const focus = target instanceof HTMLDetailsElement ? target.querySelector('summary') : target;
    if (!focus.hasAttribute('tabindex')) focus.tabIndex = -1;
    focus.focus({ preventScroll: true });
  }
});
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.addEventListener('popstate', event => {
  const route = new URLSearchParams(location.hash.slice(1));
  const page = event.state?.page || route.get('page') || data.aliases[location.pathname] || 'home';
  navigate(data.pages[page] ? page : 'home', false, event.state?.anchor || route.get('anchor') || (route.has('page') ? '' : decodeURIComponent(location.hash.slice(1))));
});
window.addEventListener('hashchange', () => {
  const route = new URLSearchParams(location.hash.slice(1));
  const page = route.get('page');
  if (data.pages[page] && page !== current) navigate(page, false, route.get('anchor') || '');
});
const params = new URLSearchParams(location.hash.slice(1));
const initial = data.pages[params.get('page')] ? params.get('page') : data.aliases[location.pathname] || 'home';
const anchor = params.get('anchor') || (params.has('page') ? '' : decodeURIComponent(location.hash.slice(1)));
history.replaceState({ page: initial, anchor }, '', window.study.hrefFor(initial, anchor));
navigate(initial, false, anchor);
