import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { validateDraft, renderDraftPreview, renderApprovedNote, computeNoteDigest, loadNotebookCatalog } from '../scripts/lib/notebook-content.mjs';
import { syntheticDraft } from './fixtures/notebook-content.mjs';

// Synthetic labels only; the real note's recorded runs live in the catalog.
const run = (outcome, n) => ({ outcome, summary: `Summary ${n}`, message: `message ${n}` });
const gate = () => ({ type: 'gate-runs', heading: 'Fixture gate', intro: 'Fixture intro.',
  predict: { question: 'Fixture question?', options: ['A', 'B', 'C'], reveal: 'Fixture reveal.' },
  test: { heading: 'Fixture test page', code: '<p>fixture</p>', run: run('passed', 'test') },
  grid: { heading: 'Fixture grid', rows: ['Row one', 'Row two'], columns: ['Column one', 'Column two'],
    cells: [run('refused', 0), run('refused', 1), run('refused', 2), run('passed', 3)] },
  control: { heading: 'Fixture control', run: run('refused', 'control') },
  grain: { heading: 'Fixture grain.', note: 'Fixture grain note.' },
  controls: { runTest: 'Run test', runPage: 'Run page', choose: 'Choose.', fixBase: 'Fix base', fixData: 'Fix data',
    other: 'Other', runControl: 'Run control', reset: 'Reset', notRun: 'Not run', guess: 'Guess:' },
  provenance: 'Fixture provenance.' });
const draft = () => ({ ...syntheticDraft(), blocks: [gate()] });
const figure = html => html.match(/<figure class="gateRuns"[\s\S]*?<\/figure>/)?.[0];

test('gate runs render as complete static HTML; every control starts hidden', () => {
  const d = draft(), before = structuredClone(d);
  assert.deepEqual(validateDraft(d), d);
  const html = figure(renderDraftPreview(d).html);
  for (const text of ['message test', 'message 0', 'message 1', 'message 2', 'message 3', 'message control', 'Fixture reveal.', 'Fixture grain note.', 'Row two', 'Column two']) {
    assert.ok(html.includes(text), text);
  }
  assert.doesNotMatch(html, /<p class="gateRunsResult"[^>]*hidden/);
  const buttons = html.match(/<button[^>]*>/g);
  assert.equal(buttons.length, 10);
  assert.ok(buttons.every(button => / hidden>$/.test(button)));
  assert.match(html, /<td role="cell" data-cell="3" data-column="Column two"><p class="gateRunsResult" data-outcome="passed">/);
  assert.match(html, /data-not-run="Not run" data-guess="Guess:"/);
  assert.doesNotMatch(html, /<script|<canvas|<a\b/);
  assert.deepEqual(d, before);
});

test('gate runs commit every label to a schema-4 digest', () => {
  const p = { ...draft(), publishedOn: '2024-02-28', updatedOn: '2024-02-28' };
  const expected = 'sha256:' + createHash('sha256').update(JSON.stringify({ schemaVersion: 4, ...p })).digest('hex');
  assert.equal(computeNoteDigest(p), expected);
  const n = { ...p, editorial: { status: 'approved', contentDigest: expected } };
  assert.equal(figure(renderApprovedNote(n)), figure(renderDraftPreview(draft()).html));
  const paths = v => Object.entries(v).flatMap(([key, x]) => typeof x === 'string' ? (key === 'type' || key === 'outcome' ? [] : [[key]]) : Array.isArray(x) ? x.flatMap((y, i) => typeof y === 'string' ? [[key, i]] : paths(y).map(path => [key, i, ...path])) : paths(x).map(path => [key, ...path]));
  for (const path of paths(p.blocks[0])) {
    const changed = structuredClone(n); let obj = changed.blocks[0];
    for (const key of path.slice(0, -1)) obj = obj[key];
    obj[path.at(-1)] += '!';
    assert.throws(() => renderApprovedNote(changed), /digest/, path.join('.'));
  }
});

test('unknown fields, bad outcomes and wrong counts fail closed', () => {
  for (const mutate of [
    b => b.rawHTML = '<img src=x>', b => b.test.run.outcome = 'maybe', b => b.grid.cells.pop(),
    b => b.grid.cells.push(run('passed', 4)), b => b.predict.options.push('D'), b => b.grid.rows.pop(),
    b => delete b.controls.reset, b => b.controls.extra = 'x', b => b.control.run.message = '',
    b => b.grain.note = '\u0000', b => b.grid.cells[0] = 'refused',
  ]) { const d = draft(); mutate(d.blocks[0]); assert.throws(() => validateDraft(d), /field|text|array|outcome|object/); }
});

test('every gate text field is escaped, not interpreted as markup', () => {
  const hostile = '<img src=x onerror="alert(1)"> & \'quote\'';
  const d = draft();
  (function replace(obj) { for (const [k, v] of Object.entries(obj)) { if (k === 'type' || k === 'outcome') continue; if (typeof v === 'string') obj[k] = hostile; else replace(v); } })(d.blocks[0]);
  const html = renderDraftPreview(d).html;
  assert.doesNotMatch(html, /<img|onerror="/);
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt; &amp; &#39;quote&#39;/);
});

test('the published note replays masking: one fix alone still stops at the base tag', () => {
  const note = loadNotebookCatalog().approvedNotes.find(n => n.slug === 'the-gate-had-never-seen-a-real-page');
  const g = note.blocks.find(b => b.type === 'gate-runs');
  assert.deepEqual(g.grid.cells.map(c => c.outcome), ['refused', 'refused', 'refused', 'passed']);
  assert.equal(g.grid.cells[0].message, g.grid.cells[1].message);
  assert.notEqual(g.grid.cells[0].message, g.grid.cells[2].message);
  assert.equal(g.test.run.outcome, 'passed');
  assert.equal(g.control.run.outcome, 'refused');
  for (const value of JSON.stringify(note).match(/"[^"]*"/g)) assert.doesNotMatch(value, /—/);
});
