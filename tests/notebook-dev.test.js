import assert from 'node:assert/strict';
import test from 'node:test';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../', import.meta.url));
import { syntheticApprovedNote, syntheticCatalogSource } from './fixtures/notebook-content.mjs';
const approved = syntheticCatalogSource({ approvedNotes: [syntheticApprovedNote()] });
const paths = ['/notes/synthetic-fixture', '/notebook/generated/synthetic-fixture.html', '/notebook/generated/notes.json'];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, label, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await check()) return; await pause(100); }
  assert.fail(label);
}
function alive(pid) { try { process.kill(pid, 0); return true; } catch (error) { if (error.code === 'ESRCH') return false; throw error; } }
function descendants(pid) {
  const rows = execFileSync('ps', ['-axo', 'pid=,ppid=,command='], { encoding: 'utf8' }).trim().split('\n').map(line => {
    const [, id, parent, command] = line.match(/^\s*(\d+)\s+(\d+)\s+(.*)$/);
    return { pid: Number(id), parent: Number(parent), command };
  });
  const found = new Set([pid]);
  for (let old = 0; old !== found.size;) { old = found.size; for (const row of rows) if (found.has(row.parent)) found.add(row.pid); }
  return rows.filter(row => found.has(row.pid));
}
async function port() {
  const s = net.createServer(); s.listen(0, '127.0.0.1'); await once(s, 'listening');
  const value = s.address().port; await new Promise(resolve => s.close(resolve)); return value;
}
async function closed(port) {
  return new Promise(resolve => {
    const socket = net.connect(port, '127.0.0.1');
    socket.once('connect', () => { socket.destroy(); resolve(false); });
    socket.once('error', () => { socket.destroy(); resolve(true); });
  });
}
const cleanups = new Map();
function fixture(t) {
  const root = mkdtempSync(join(realpathSync(tmpdir()), 'notebook-dev-test-'));
  const names = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: source, encoding: 'utf8' }).split('\0').filter(Boolean);
  for (const name of names) { mkdirSync(dirname(join(root, name)), { recursive: true }); copyFileSync(join(source, name), join(root, name)); }
  symlinkSync(join(source, 'node_modules'), join(root, 'node_modules'), 'dir');
  writeFileSync(join(root, 'content/notebook/catalog.mjs'), approved);
  cleanups.set(root, []);
  t.after(async () => {
    for (const cleanup of cleanups.get(root)) await cleanup();
    rmSync(root, { recursive: true, force: true }); cleanups.delete(root);
  });
  return root;
}
async function launch(t, root, args) {
  const p = await port();
  const proc = spawn('npm', ['run', 'dev', '--', ...(args || ['--hostname', '127.0.0.1', '--port', String(p)])], {
    cwd: root, detached: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
  });
  let log = ''; proc.stdout.on('data', chunk => { log += chunk; }); proc.stderr.on('data', chunk => { log += chunk; });
  const result = { proc, port: p, pids: [], log: () => log };
  cleanups.get(root).push(async () => {
    // Failure cleanup only; assertions below require the wrapper itself to close.
    for (const pid of [...result.pids, proc.pid].reverse()) { try { process.kill(pid, 'SIGTERM'); } catch {} }
    try { process.kill(-proc.pid, 'SIGTERM'); } catch {}
    await pause(300);
    for (const pid of [...result.pids, proc.pid].reverse()) { try { process.kill(pid, 'SIGKILL'); } catch {} }
    if (proc.exitCode === null && proc.signalCode === null) await once(proc, 'exit');
  });
  return result;
}
async function ready(server) {
  await until(() => {
    assert.equal(server.proc.exitCode, null, server.log());
    return server.log().includes('Ready in');
  }, 'npm dev not ready: ' + server.log(), 45000);
  server.pids = descendants(server.proc.pid).map(row => row.pid);
  server.wrapper = descendants(server.proc.pid).find(row => /node scripts\/dev-notebook\.mjs/.test(row.command))?.pid;
  for (const path of paths) {
    const response = await fetch(`http://127.0.0.1:${server.port}${path}`, { signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200, path); assert.match(await response.text(), /A fixture paragraph\./);
  }
}
async function stopped(t, server, message = true) {
  await until(() => server.proc.exitCode !== null || server.proc.signalCode !== null, 'npm dev did not fail-stop after catalog change: ' + server.log());
  assert.notEqual(server.proc.exitCode, 0);
  if (message) assert.match(server.log(), /Notebook catalog changed.*restart npm run dev/i);
  await until(async () => await closed(server.port) && server.pids.every(pid => !alive(pid)), 'dev process/descendant/socket still open');
  for (const path of [...paths, '/notebook/catalog.json', '/sitemap.xml']) {
    await assert.rejects(fetch(`http://127.0.0.1:${server.port}${path}`, { signal: AbortSignal.timeout(2000) }), /fetch failed/);
  }
  t.diagnostic(JSON.stringify({ port: server.port, pids: server.pids, closed: true, pathsUnavailable: paths, exit: server.proc.exitCode }));
}

test('supported npm dev fail-stops approved → retired; restart removes canonical AND raw artifacts', { timeout: 120000 }, async t => {
  const root = fixture(t);
  const server = await launch(t, root); await ready(server);
  const target = join(root, 'content/notebook/catalog.mjs');
  // Atomic-save editor behavior, not only an in-place write.
  writeFileSync(target + '.new', syntheticCatalogSource({ retiredSlugs: ['synthetic-fixture'] }));
  renameSync(target + '.new', target);
  await stopped(t, server);
  const restarted = await launch(t, root);
  await until(() => restarted.log().includes('Ready in'), 'retired restart not ready', 45000);
  restarted.pids = descendants(restarted.proc.pid).map(row => row.pid);
  restarted.wrapper = descendants(restarted.proc.pid).find(row => /node scripts\/dev-notebook\.mjs/.test(row.command))?.pid;
  for (const path of paths) assert.equal((await fetch(`http://127.0.0.1:${restarted.port}${path}`)).status, 404, path);
  const catalog = await (await fetch(`http://127.0.0.1:${restarted.port}/notebook/catalog.json`)).json();
  assert.deepEqual(catalog.approvedSummaries, []); assert.equal(catalog.notesUrl, null);
  assert.doesNotMatch(await (await fetch(`http://127.0.0.1:${restarted.port}/sitemap.xml`)).text(), /synthetic-fixture/);
  assert.equal(existsSync(join(root, 'public/notebook/generated')), false);
  assert.ok(restarted.wrapper, 'owned wrapper must exist'); process.kill(restarted.wrapper, 'SIGTERM');
  await stopped(t, restarted, false);
});

for (const invalid of ['schema', 'syntax', 'missing']) {
  test(`live ${invalid} catalog edit stops npm dev; invalid restart never listens`, { timeout: 90000 }, async t => {
    const root = fixture(t); const server = await launch(t, root); await ready(server);
    const target = join(root, 'content/notebook/catalog.mjs');
    if (invalid === 'missing') rmSync(target);
    else writeFileSync(target, invalid === 'syntax' ? 'export default { broken' : syntheticCatalogSource({ approvedNotes: [{}] }));
    await stopped(t, server);
    const restarted = await launch(t, root);
    await until(() => restarted.proc.exitCode !== null, 'invalid startup must exit');
    assert.notEqual(restarted.proc.exitCode, 0); assert.equal(await closed(restarted.port), true);
    assert.doesNotMatch(restarted.log(), /Ready in/);
  });
}

test('supported short CLI flags are forwarded and SIGINT closes wrapper, Next and worker', { timeout: 90000 }, async t => {
  const root = fixture(t); const p = await port();
  const server = await launch(t, root, ['-H', '127.0.0.1', '-p', String(p)]); server.port = p;
  await ready(server); assert.ok(server.wrapper); process.kill(-server.proc.pid, 'SIGINT');
  await stopped(t, server, false);
});

test('long equals CLI flags reach Next; child startup failure exits the wrapper', { timeout: 30000 }, async t => {
  const root = fixture(t);
  const occupied = net.createServer(); occupied.listen(0, '127.0.0.1'); await once(occupied, 'listening');
  t.after(() => new Promise(resolve => occupied.close(resolve)));
  const p = occupied.address().port;
  const server = await launch(t, root, ['--hostname=127.0.0.1', `--port=${p}`]);
  await until(() => server.proc.exitCode !== null, 'Next startup failure must exit wrapper');
  assert.notEqual(server.proc.exitCode, 0);
  assert.match(server.log(), /EADDRINUSE/);
  assert.doesNotMatch(server.log(), /Ready in/);
});

test('alternate project directory is refused before generation', { timeout: 30000 }, async t => {
  const root = fixture(t); const server = await launch(t, root, ['..']);
  await until(() => server.proc.exitCode !== null, 'unsupported CLI must exit');
  assert.notEqual(server.proc.exitCode, 0); assert.match(server.log(), /Unsupported notebook dev argument/);
  assert.equal(existsSync(join(root, 'public/notebook/generated')), false);
});
