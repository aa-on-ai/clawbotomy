/* The grooming table. Pluck the eyebrows, pull the stitched lines, put
   anything back. Each removal marks what does that job now: the heading
   under an eyebrow, the space where a line was. The page's words, their
   order and the lobster never change. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // The explanations come from the original Make Room playground, trimmed to fit beside the dish.
  const copy = {
    start: 'Try an edit. Do the headings still need an introduction?',
    reset: 'Back to the start. Do the headings still need an introduction?',
    labels: 'The headings already introduce themselves. The labels were saying it twice.',
    lines: 'Spacing still tells you where one thought ends and another begins.',
    both: 'No lobster harmed. The headings and space carry the structure now.',
    partial: 'Still know where to look? If not, put something back.',
    lobster: 'The lobster is not among the available deletions.'
  };
  const verbs = {
    labels: ['Pluck the eyebrows', 'Pluck the other one', 'Put the eyebrows back'],
    lines: ['Pull the lines', 'Pull the other line', 'Put the lines back']
  };
  // How long a mark stays after a removal: long enough to read the status, then look back.
  const hold = 4200;

  function mount(root) {
    if (!root || root.dataset.specimenReady === 'true') return;
    const sheet = root.querySelector('.feltSheet');
    const status = root.querySelector('.feltStatus');
    const tools = Object.fromEntries(['labels', 'lines', 'reset'].map(name => [name, root.querySelector(`[data-tool="${name}"]`)]));
    if (!sheet || !status || Object.values(tools).some(tool => !tool)) return;
    root.dataset.specimenReady = 'true';

    const piece = name => root.querySelector(`[data-piece="${name}"]`);
    const items = [
      ...[...sheet.querySelectorAll('[data-slip]')].map(el => ({ kind: 'labels', el, piece: piece('slip-' + el.dataset.slip), job: el.closest('.feltSlot').nextElementSibling.querySelector('.feltMark'), present: true })),
      ...[...sheet.querySelectorAll('[data-stitch]')].map(el => ({ kind: 'lines', el, piece: piece('stitch-' + el.dataset.stitch), job: el, present: true }))
    ];
    const flight = document.createElement('div');
    flight.className = 'feltFlight';
    flight.setAttribute('aria-hidden', 'true');
    root.append(flight);
    const running = new Set();
    const marks = new Map();

    const group = kind => items.filter(item => item.kind === kind);
    const present = kind => group(kind).filter(item => item.present).length;

    function message() {
      const labels = present('labels'), lines = present('lines');
      const allLabels = labels === group('labels').length, allLines = lines === group('lines').length;
      if (allLabels && allLines) return copy.start;
      if (!labels && allLines) return copy.labels;
      if (allLabels && !lines) return copy.lines;
      if (!labels && !lines) return copy.both;
      return copy.partial;
    }
    function paint(text) {
      for (const kind of ['labels', 'lines']) {
        const left = present(kind), total = group(kind).length;
        tools[kind].querySelector('span').textContent = verbs[kind][left === total ? 0 : left ? 1 : 2];
      }
      const untouched = items.every(item => item.present);
      if (untouched && document.activeElement === tools.reset) tools.labels.focus({ preventScroll: true });
      tools.reset.disabled = untouched;
      status.textContent = text || message();
    }

    // Marks point at whatever took over a removed piece's job, then lift.
    function unmark(elements = [...marks.keys()]) {
      for (const el of elements) {
        clearTimeout(marks.get(el));
        marks.delete(el);
        el.dataset.marked = 'false';
      }
    }
    function mark(elements) {
      for (const el of elements) {
        clearTimeout(marks.get(el));
        el.dataset.marked = 'true';
        marks.set(el, setTimeout(() => unmark([el]), hold));
      }
    }
    function teach(changed) {
      unmark(changed.filter(({ here }) => here).map(({ item }) => item.job));
      const gone = changed.filter(({ here }) => !here).map(({ item }) => item.job);
      if (!gone.length) return;
      // With everything removed, show the whole structure that is left: headings and space together.
      mark(items.every(item => !item.present) ? items.map(item => item.job) : gone);
    }

    // The settled look of one item, applied without motion.
    function show(item, here) {
      item.el.dataset.gone = String(!here);
      item.el.removeAttribute('data-pulling');
      item.piece.dataset.here = String(!here);
    }
    function restitch(item) {
      item.el.dataset.restitch = 'true';
      setTimeout(() => item.el.removeAttribute('data-restitch'), 340);
    }
    function settle() {
      for (const run of running) { run.animation.cancel(); run.flyer.remove(); run.done(); }
      running.clear();
    }
    function local(rect) {
      const box = root.getBoundingClientRect();
      return { x: rect.left + rect.width / 2 - box.left, y: rect.top + rect.height / 2 - box.top };
    }
    function pose(el) {
      const style = getComputedStyle(el);
      return { r: parseFloat(style.getPropertyValue('--r')) || 0, s: parseFloat(style.getPropertyValue('--s')) || 1 };
    }
    function tail(el) {
      const rect = el.getBoundingClientRect();
      return { ...local({ left: rect.right - 44, top: rect.top, width: 44, height: rect.height }), r: 0, s: .5 };
    }
    function fly(item, from, to, delay, done) {
      const source = item.kind === 'labels' ? item.el : item.piece;
      const el = source.cloneNode(true);
      for (const attribute of ['data-slip', 'data-piece', 'data-gone', 'data-here', 'aria-label', 'tabindex', 'disabled', 'type']) el.removeAttribute(attribute);
      el.classList.add('feltFlyer');
      const width = item.kind === 'labels' ? item.el.offsetWidth : 64;
      const height = item.kind === 'labels' ? item.el.offsetHeight : 26;
      Object.assign(el.style, { left: from.x - width / 2 + 'px', top: from.y - height / 2 + 'px', width: width + 'px', height: height + 'px' });
      flight.append(el);
      const dx = to.x - from.x, dy = to.y - from.y;
      const lift = Math.min(110, 36 + Math.abs(dx) * .18);
      const spin = dx < 0 ? -1 : 1;
      const animation = el.animate([
        { transform: `translate(0px, 0px) rotate(${from.r}deg) scale(${from.s})`, easing: 'cubic-bezier(.2, .7, .3, 1)' },
        { offset: .2, transform: `translate(${dx * .04}px, ${-12 - lift * .1}px) rotate(${from.r + 7 * spin}deg) scale(${from.s * 1.06})`, easing: 'cubic-bezier(.45, 0, .55, 1)' },
        { offset: .62, transform: `translate(${dx * .62}px, ${dy * .62 - lift}px) rotate(${(from.r + to.r) / 2 + 16 * spin}deg) scale(${(from.s + to.s) / 2})`, easing: 'cubic-bezier(.4, 0, .6, 1)' },
        { transform: `translate(${dx}px, ${dy}px) rotate(${to.r}deg) scale(${to.s})` }
      ], { duration: 660, delay, fill: 'both' });
      const run = { animation, flyer: el, done };
      running.add(run);
      animation.onfinish = () => { if (!running.has(run)) return; running.delete(run); el.remove(); done(); };
    }

    // Apply changes. Nothing on the page moves, so both ends of every flight are known up front.
    function change(list) {
      settle();
      list = list.filter(({ item, here }) => item.present !== here);
      if (!list.length) return list;
      const still = reduced.matches || !root.querySelector('.feltDish')?.offsetWidth;
      const ends = list.map(({ item, here }) => {
        const onPage = item.kind === 'lines' ? tail(item.el) : { ...local(item.el.getBoundingClientRect()), ...pose(item.el) };
        const inDish = { ...local(item.piece.getBoundingClientRect()), ...pose(item.piece) };
        return here ? [inDish, onPage] : [onPage, inDish];
      });
      for (const { item, here } of list) item.present = here;
      if (still) { for (const { item, here } of list) show(item, here); return list; }

      list.forEach(({ item, here }, index) => {
        const [from, to] = ends[index];
        const delay = index * 110;
        if (here) {
          item.piece.dataset.here = 'false';
          fly(item, from, to, delay, () => { show(item, true); if (item.kind === 'lines') restitch(item); });
        } else if (item.kind === 'labels') {
          item.el.dataset.gone = 'true';
          fly(item, from, to, delay, () => show(item, false));
        } else {
          item.el.dataset.pulling = 'true';
          fly(item, from, to, delay + 160, () => show(item, false));
        }
      });
      return list;
    }

    function act(kind) {
      const list = group(kind);
      const restoring = list.every(item => !item.present);
      teach(change(list.map(item => ({ item, here: restoring }))));
      paint();
    }

    root.addEventListener('click', event => {
      const target = event.target.closest('button, .feltLobster');
      if (!target || !root.contains(target) || target.disabled) return;
      const tool = target.dataset.tool;
      if (tool === 'labels' || tool === 'lines') return act(tool);
      if (tool === 'reset') {
        unmark();
        change(items.map(item => ({ item, here: true })));
        return paint(copy.reset);
      }
      const item = items.find(entry => entry.el === target);
      if (item) {
        teach(change([{ item, here: !item.present }]));
        return paint();
      }
      if (target.classList.contains('feltLobster')) {
        target.dataset.refused = 'false';
        void target.offsetWidth;
        target.dataset.refused = 'true';
        clearTimeout(target.refuseTimer);
        target.refuseTimer = setTimeout(() => { target.dataset.refused = 'false'; }, 460);
        paint(copy.lobster);
      }
    });

    for (const element of [tools.labels, tools.lines, ...items.map(item => item.el)]) element.disabled = false;
    sheet.dataset.ready = 'true';
    paint(copy.start);
  }

  window.feltSpecimen = { mount };
})();
