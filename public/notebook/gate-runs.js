/* Optional replay of recorded gate runs. Without it, every run is plain HTML.
   It only hides and reveals the figure's own nodes; it never runs the gate. */
(() => {
  'use strict';
  const mounted = new WeakSet();
  const live = figure => figure.isConnected && figure.ownerDocument === document && !!document.defaultView;

  function mount(root) {
    const figures = root.matches?.('[data-gate-runs]') ? [root] : root.querySelectorAll('[data-gate-runs]');
    for (const figure of figures) {
      if (!live(figure) || mounted.has(figure)) continue;
      const q = selector => figure.querySelector(selector);
      const results = {
        test: q('[data-step="test"] .gateRunsResult'),
        control: q('[data-step="control"] .gateRunsResult'),
        cells: [0, 1, 2, 3].map(i => q(`[data-cell="${i}"] .gateRunsResult`)),
      };
      const buttons = Object.fromEntries([...figure.querySelectorAll('.gateRunsActions .gateRunsButton')].map(b => [b.dataset.action, b]));
      const options = [...figure.querySelectorAll('.gateRunsOptions .gateRunsButton')];
      const reveal = q('.gateRunsReveal'), choose = q('.gateRunsChoose'), grain = q('[data-step="grain"]'), status = q('.gateRunsStatus');
      const all = [results.test, results.control, ...results.cells];
      if (all.some(r => !r) || options.length !== 3 || !reveal || !choose || !grain || !status
          || ['test', 'page', 'base', 'data', 'other', 'control', 'reset'].some(a => !buttons[a])) continue;

      // One placeholder per run, from the figure's committed label.
      const pending = new Map(all.map(result => {
        const p = document.createElement('p');
        p.className = 'gateRunsPending';
        p.textContent = figure.dataset.notRun;
        result.before(p);
        return [result, p];
      }));
      const guessLine = document.createElement('strong');
      guessLine.className = 'gateRunsGuess';
      reveal.prepend(guessLine, ' ');
      let guess = null, first = null;

      const show = (...actions) => {
        for (const [name, button] of Object.entries(buttons)) button.hidden = !actions.includes(name);
        choose.hidden = !actions.includes('base');
        buttons[actions[0]]?.focus({ preventScroll: true });
      };
      const run = result => {
        result.hidden = false;
        pending.get(result).hidden = true;
        status.textContent = `${result.querySelector('strong').textContent}: ${result.querySelector('code').textContent}`;
      };
      function reset() {
        for (const result of all) { result.hidden = true; pending.get(result).hidden = false; }
        for (const option of options) { option.hidden = false; option.disabled = false; option.setAttribute('aria-pressed', 'false'); }
        reveal.hidden = true; grain.hidden = true; guess = null; first = null; guessLine.textContent = '';
        status.textContent = '';
        show();
      }

      for (const option of options) option.addEventListener('click', () => {
        if (!live(figure) || guess !== null) return;
        guess = option.textContent;
        for (const o of options) { o.disabled = true; o.setAttribute('aria-pressed', String(o === option)); }
        show('test');
      });
      const act = {
        test() { run(results.test); show('page'); },
        page() { run(results.cells[0]); show('base', 'data'); },
        base() { first = 'base'; run(results.cells[2]); grain.hidden = false; show('other'); },
        data() { first = 'data'; run(results.cells[1]); show('other'); },
        other() {
          // Reveal the remaining cell too, so the whole grid is visible at the end.
          run(results.cells[first === 'base' ? 1 : 2]);
          run(results.cells[3]);
          grain.hidden = false;
          guessLine.textContent = `${figure.dataset.guess} ${guess}.`;
          reveal.hidden = false;
          show('control');
        },
        control() { run(results.control); show('reset'); },
        reset() { reset(); options[0].focus({ preventScroll: true }); },
      };
      for (const [name, button] of Object.entries(buttons)) button.addEventListener('click', () => {
        // Detached/parsed old navigation nodes retain listeners, but not authority.
        if (!live(figure) || !figure.contains(button) || button.hidden) return;
        act[name]();
      });

      mounted.add(figure);
      figure.dataset.enhanced = 'true';
      reset();
    }
  }
  window.gateRunsReplay = Object.freeze({ mount });
  mount(document);
})();
