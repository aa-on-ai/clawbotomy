import assert from 'node:assert/strict';
import test from 'node:test';
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, readdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../', import.meta.url));
import { syntheticApprovedNote, syntheticCatalogSource } from './fixtures/notebook-content.mjs';
const original = syntheticCatalogSource();
function fixture(t) {
  const area = mkdtempSync(join(realpathSync(tmpdir()), 'notebook-build-test-'));
  t.after(() => rmSync(area, { recursive: true, force: true }));
  const root = join(area, 'repo');
  mkdirSync(root);
  for (const path of ['scripts', 'content/notebook', 'public/notebook/index.html', 'tests/fixtures/notebook-content.mjs']) {
    mkdirSync(join(root, path, '..'), { recursive: true });
    cpSync(join(source, path), join(root, path), { recursive: true });
  }
  catalog(root);
  return { area, root, output: join(root, 'public/notebook/generated') };
}
function generate(root) {
  return spawnSync(process.execPath, ['scripts/build-notebook.mjs'], { cwd: root, encoding: 'utf8', timeout: 15000 });
}
function catalog(root, approved = false) {
  writeFileSync(join(root, 'content/notebook/catalog.mjs'), approved
    ? syntheticCatalogSource({ approvedNotes: [syntheticApprovedNote()] })
    : original);
}
function files(output) {
  return Object.fromEntries(readdirSync(output).sort().map(name => [name, readFileSync(join(output, name), 'utf8')]));
}

test('generator replaces ordinary populated output deterministically and removes it for empty catalog', t => {
  const { root, output } = fixture(t);
  assert.equal(generate(root).status, 0);
  assert.equal(existsSync(output), false);
  mkdirSync(output);
  writeFileSync(join(output, 'stale.html'), 'stale');
  catalog(root, true);
  assert.equal(generate(root).status, 0);
  const first = files(output);
  assert.deepEqual(Object.keys(first), ['notes.json', 'synthetic-fixture.html']);
  assert.equal(generate(root).status, 0);
  assert.deepEqual(files(output), first);
  catalog(root);
  assert.equal(generate(root).status, 0);
  assert.equal(existsSync(output), false);
  mkdirSync(output);
  assert.equal(generate(root).status, 0);
  assert.equal(existsSync(output), false);
});

for (const boundary of ['generated', 'notebook', 'public']) {
  test(`generator refuses ${boundary} symlink without deleting foreign sentinel`, t => {
    const { area, root, output } = fixture(t);
    const link = boundary === 'generated' ? output : join(root, boundary === 'public' ? 'public' : 'public/notebook');
    const foreign = join(area, 'foreign');
    if (existsSync(link)) renameSync(link, foreign); else mkdirSync(foreign);
    const generated = boundary === 'generated' ? foreign : join(foreign, boundary === 'public' ? 'notebook/generated' : 'generated');
    mkdirSync(generated, { recursive: true });
    const sentinel = join(generated, 'sentinel.txt');
    writeFileSync(sentinel, 'FOREIGN SENTINEL');
    symlinkSync(foreign, link, 'dir');
    const result = generate(root);
    assert.notEqual(result.status, 0, result.stdout);
    assert.equal(readFileSync(sentinel, 'utf8'), 'FOREIGN SENTINEL');
    assert.equal(lstatSync(link).isSymbolicLink(), true);
    assert.match(result.stderr, /unsafe notebook output/i);
  });
}

for (const boundary of ['generated', 'notebook', 'public']) {
  test(`generator refuses non-directory ${boundary} without mutation`, t => {
    const { root, output } = fixture(t);
    const target = boundary === 'generated' ? output : join(root, boundary === 'public' ? 'public' : 'public/notebook');
    rmSync(target, { recursive: true, force: true });
    writeFileSync(target, 'NOT A DIRECTORY');
    assert.notEqual(generate(root).status, 0);
    assert.equal(readFileSync(target, 'utf8'), 'NOT A DIRECTORY');
  });
}

test('invalid catalog refuses before replacing previous generated output', t => {
  const { root, output } = fixture(t);
  catalog(root, true);
  assert.equal(generate(root).status, 0);
  const before = files(output);
  writeFileSync(join(root, 'content/notebook/catalog.mjs'), syntheticCatalogSource({ approvedNotes: [{}] }));
  assert.notEqual(generate(root).status, 0);
  assert.deepEqual(files(output), before);
});
