/* Optional paper gesture; the complete comparison is always ordinary HTML. */
(() => {
  'use strict';
  const mounted = new WeakSet();
  const live = figure => figure.isConnected && figure.ownerDocument === document && !!document.defaultView;
  function mount(root) {
    const figures = root.matches?.('[data-document-map-gesture]') ? [root] : root.querySelectorAll('[data-document-map-gesture]');
    for (const figure of figures) {
      if (!live(figure) || mounted.has(figure)) continue;
      const button = figure.querySelector('.documentMapToggle');
      const hint = figure.querySelector('.documentMapHint');
      if (!button || !hint || figure.querySelectorAll('.documentMapReference').length !== 4) continue;
      button.setAttribute('aria-pressed', 'false');
      figure.dataset.spread = 'false';
      button.addEventListener('click', () => {
        // Detached/parsed old navigation nodes retain listeners, but not authority.
        if (!live(figure) || !figure.contains(button)) return;
        const spread = button.getAttribute('aria-pressed') !== 'true';
        button.setAttribute('aria-pressed', String(spread));
        figure.dataset.spread = String(spread);
      });
      mounted.add(figure);
      button.hidden = false;
      hint.hidden = false;
    }
  }
  window.documentMapGesture = Object.freeze({ mount });
  mount(document);
})();
