import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { validateDraft, renderDraftPreview, renderApprovedNote, computeNoteDigest, loadNotebookCatalog } from '../scripts/lib/notebook-content.mjs';
import { notebookArtifacts, notebookRewrites } from '../scripts/lib/notebook-public.mjs';
import { syntheticDraft } from './fixtures/notebook-content.mjs';

// Synthetic labels only: no candidate editorial content belongs in the repository.
const map = () => ({ type: 'document-map', heading: 'A synthetic comparison',
  before: { heading: 'Earlier', label: 'Fixture entry', measurement: '800 characters' },
  after: { heading: 'Later', label: 'Fixture entry', measurement: '80 characters' },
  comparison: 'Synthetic character comparison',
  references: { heading: 'Four fixture references', labels: ['One', 'Two', 'Three', 'Four'], note: 'Schematic, not measured areas.' },
  scope: 'Synthetic reachability only; not a reading sequence or complete inventory.',
  storage: { heading: 'Fixture storage', measurement: '900 → 950 bytes', delta: '+50 bytes' },
  preservation: { heading: 'Fixture preservation', duplicates: 'Fixture duplicates', verification: 'Fixture load check' },
  provenance: 'Synthetic reconstruction.', caption: 'Synthetic caption.' });
const draft = () => ({ ...syntheticDraft(), blocks: [map()] });
const publication = () => ({ ...draft(), publishedOn: '2024-02-28', updatedOn: '2024-02-28' });
const figure = html => html.match(/<figure class="documentMap"[\s\S]*?<\/figure>/)?.[0];

test('closed document-map validates and renders through the real draft API', () => {
  const d = draft(), before = structuredClone(d);
  const checked = validateDraft(d);
  assert.deepEqual(checked, d);
  assert.ok(Object.isFrozen(checked.blocks[0].references.labels));
  const html = renderDraftPreview(d).html;
  assert.match(html, /<figure class="documentMap"/);
  assert.equal((html.match(/class="documentMapReference"/g) || []).length, 4);
  assert.match(html, /800 characters/); assert.match(html, /900 → 950 bytes/);
  assert.match(html, /Synthetic caption/); assert.doesNotMatch(html, /<script|<canvas|<button|<svg/);
  assert.deepEqual(d, before);
});

test('all reader labels are committed, with no copy hidden behind a marker', () => {
  const p = publication();
  const expected = 'sha256:' + createHash('sha256').update(JSON.stringify({schemaVersion: 2, ...validateDraft(draft()), publishedOn:p.publishedOn, updatedOn:p.updatedOn})).digest('hex');
  assert.equal(computeNoteDigest(p), expected);
  const n = {...p, editorial:{status:'approved', contentDigest:expected}};
  assert.equal(figure(renderApprovedNote(n)), figure(renderDraftPreview(draft()).html));
  const paths = b => Object.entries(b).flatMap(([key,v]) => typeof v === 'string' ? key === 'type' ? [] : [[key]] : Array.isArray(v) ? v.map((_,i)=>[key,i]) : paths(v).map(path=>[key,...path]));
  for (const path of paths(p.blocks[0])) {
    const changed = structuredClone(n); let obj = changed.blocks[0];
    for (const key of path.slice(0,-1)) obj = obj[key];
    obj[path.at(-1)] += '!';
    assert.throws(()=>renderApprovedNote(changed), /digest/);
  }
  const old = 'sha256:' + createHash('sha256').update(JSON.stringify({schemaVersion:1,...p})).digest('hex');
  assert.throws(()=>renderApprovedNote({...n,editorial:{status:'approved', contentDigest:old}}), /digest/);
  assert.equal(loadNotebookCatalog().approvedNotes.length, 4);
});

test('optional paper gesture commits its control copy and invalidates static-map approval', () => {
  const d = draft();
  d.blocks[0].gesture = { label: 'Spread fixture cards', hint: 'Press again to reset.' };
  assert.deepEqual(validateDraft(d), d);
  const html = renderDraftPreview(d).html;
  assert.match(html, /<button type="button" class="documentMapToggle" aria-pressed="false" hidden>Spread fixture cards<\/button>/);
  assert.match(html, /Press again to reset\./);
  assert.doesNotMatch(html, /aria-expanded|<canvas|<script/);
  assert.equal((html.match(/class="documentMapReference"/g) || []).length, 4);
  const p = {...d, publishedOn:'2024-02-28', updatedOn:'2024-02-28'};
  const expected = 'sha256:' + createHash('sha256').update(JSON.stringify({schemaVersion:3, ...p})).digest('hex');
  assert.equal(computeNoteDigest(p), expected);
  const approved = {...p, editorial:{status:'approved', contentDigest:expected}};
  assert.equal(figure(renderApprovedNote(approved)), figure(html));
  for (const key of ['label','hint']) {
    const altered = structuredClone(approved); altered.blocks[0].gesture[key] += '!';
    assert.throws(() => renderApprovedNote(altered), /digest/);
  }
  assert.throws(() => renderApprovedNote({...approved,editorial:{status:'approved',contentDigest:computeNoteDigest(publication())}}), /digest/);
  for (const gesture of [{}, {label:'x',hint:'y',html:'z'}, {label:'',hint:'y'}, {label:'x',hint:'y',expanded:true}]) {
    assert.throws(() => validateDraft({...d,blocks:[{...d.blocks[0],gesture}]}), /field|text/);
  }
});

test('gesture connectors have static slots outside all transformed papers', () => {
  const d = draft();
  d.blocks[0].gesture = { label: 'Spread fixture cards', hint: 'Press again to reset.' };
  const html = renderDraftPreview(d).html;
  const slots = [...html.matchAll(/<div class="documentMapReferenceSlot"><div class="documentMapReference">([^<]+)<\/div><\/div>/g)];
  assert.deepEqual(slots.map(match => match[1]), d.blocks[0].references.labels);
  assert.doesNotMatch(figure(html), /<a\b|data-destination/);
  assert.doesNotMatch(renderDraftPreview(draft()).html, /documentMapReferenceSlot/);
});

test('unknown, unsafe, partial and accessor marker fields fail closed', () => {
  for (const mutate of [
    b=>b.rawHTML='<img src=x>', b=>b.url='javascript:alert(1)', b=>b.descriptor={},
    b=>b.before.style='position:fixed', b=>b.after.measurement='',
    b=>b.references.labels.pop(), b=>b.references.labels.push('Five'),
    b=>b.references.labels[0]={text:'nested'}, b=>b.references.labels.extra='x',
    b=>delete b.scope, b=>b.storage.delta='\u0000', b=>b.preservation.secret='x',
    b=>Object.defineProperty(b,'heading',{get(){throw Error('getter ran');},enumerable:true}),
    b=>b[Symbol('private')]='x', b=>b.type='unknown-map',
  ]) { const d=draft(); mutate(d.blocks[0]); assert.throws(()=>validateDraft(d), /field|text|array|block/); }
});

for (const interactive of [false, true]) test(`public static rewrite and browser payload carry the identical ${interactive ? 'interactive' : 'static'} synthetic figure`, () => {
  const p = publication();
  if (interactive) p.blocks[0].gesture = {label:'Spread fixture cards',hint:'Press again to reset.'};
  const n = {...p, editorial:{status:'approved', contentDigest:computeNoteDigest(p)}};
  const options = {approvedNotes:[n]};
  const files = notebookArtifacts(readFileSync(new URL('../public/notebook/index.html', import.meta.url), 'utf8'), options);
  const {publishedOn,updatedOn,...d} = p;
  const expected = figure(renderDraftPreview(d).html);
  assert.equal(figure(files[`${n.slug}.html`]), expected);
  assert.equal(figure(JSON.parse(files['notes.json']).pages[`note:${n.slug}`].html), expected);
  assert.match(files[`${n.slug}.html`], /href="\/notebook\/structured.css"/);
  assert.deepEqual(notebookRewrites(options).find(r=>r.source===`/notes/${n.slug}`), {source:`/notes/${n.slug}`,destination:`/notebook/generated/${n.slug}.html`});
});

test('every diagram text field is escaped, not interpreted as markup', () => {
  const hostile='<img src=x onerror="alert(1)"> & \'quote\'';
  const d=draft();
  d.blocks[0].gesture={label:'Fixture control',hint:'Fixture hint'};
  function replace(obj){for(const [k,v] of Object.entries(obj)) {if(k==='type')continue;if(typeof v==='string')obj[k]=hostile;else replace(v);}}
  replace(d.blocks[0]);
  const html=renderDraftPreview(d).html;
  assert.doesNotMatch(html, /<img|<script| onerror="/);
  assert.match(html,/&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt; &amp; &#39;quote&#39;/);
});
