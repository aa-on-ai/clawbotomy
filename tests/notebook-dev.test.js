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
function processRows() {
  return execFileSync('ps', ['-axo', 'pid=,ppid=,pgid=,stat=,lstart=,command='], { encoding: 'utf8' }).trim().split('\n').map(line => {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(.{24})\s+(.*)$/);
    assert.ok(match, `Unparseable process row: ${line}`);
    const [, id, parent, group, state, started, command] = match;
    return { pid: Number(id), parent: Number(parent), group: Number(group), state, started, command };
  });
}
function descendants(pid) {
  const rows = processRows();
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
function linuxStat(pid) {
  if (process.platform !== 'linux') return null;
  try { return readFileSync(`/proc/${pid}/stat`, 'utf8').trim(); }
  catch (error) { if (['ENOENT', 'ESRCH'].includes(error.code)) return null; throw error; }
}
function rememberProcesses(server) {
  server.startProcesses = descendants(server.proc.pid).map(row => ({ ...row, linuxStat: linuxStat(row.pid) }));
  server.pids = server.startProcesses.map(row => row.pid);
  server.wrapper = server.startProcesses.find(row => /node scripts\/dev-notebook\.mjs/.test(row.command))?.pid;
}
async function shutdownObservation(server) {
  const rows = processRows();
  return {
    port: server.port, portClosed: await closed(server.port),
    exitCode: server.proc.exitCode, signalCode: server.proc.signalCode,
    // Keep all original identities, even after reparenting or disappearance.
    // Linux stat includes kernel start ticks; ps start time alone is coarse.
    startProcesses: server.startProcesses,
    processes: server.pids.map(pid => ({ pid, killZero: alive(pid), current: rows.find(row => row.pid === pid) || null, linuxStat: linuxStat(pid) })),
  };
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
  rememberProcesses(server);
  for (const path of paths) {
    const response = await fetch(`http://127.0.0.1:${server.port}${path}`, { signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200, path); assert.match(await response.text(), /A fixture paragraph\./);
  }
}
async function stopped(t, server, message = true) {
  await until(() => server.proc.exitCode !== null || server.proc.signalCode !== null, 'npm dev did not fail-stop after catalog change: ' + server.log());
  assert.notEqual(server.proc.exitCode, 0);
  if (message) assert.match(server.log(), /Notebook catalog changed.*restart npm run dev/i);
  try {
    await until(async () => await closed(server.port) && server.pids.every(pid => !alive(pid)), 'dev process/descendant/socket still open');
  } catch (error) {
    // Diagnostic only: never reinterpret Z/T states or weaken the failure.
    try { t.diagnostic('shutdown failure: ' + JSON.stringify(await shutdownObservation(server))); }
    catch (diagnosticError) { t.diagnostic(`shutdown observation failed: ${diagnosticError.message}`); }
    throw error;
  }
  for (const path of [...paths, '/notebook/catalog.json', '/sitemap.xml']) {
    await assert.rejects(fetch(`http://127.0.0.1:${server.port}${path}`, { signal: AbortSignal.timeout(2000) }), /fetch failed/);
  }
  t.diagnostic(JSON.stringify({ port: server.port, pids: server.pids, closed: true, pathsUnavailable: paths, exit: server.proc.exitCode }));
}

test('shutdown diagnostics distinguish live, stopped and reaped PIDs from the listening socket', { timeout: 15000 }, async t => {
  const listener = net.createServer(socket => socket.destroy());
  listener.listen(0, '127.0.0.1'); await once(listener, 'listening');
  const proc = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000); console.log("ready")'], { stdio: ['ignore', 'pipe', 'ignore'] });
  t.after(async () => {
    if (proc.exitCode === null && proc.signalCode === null) { proc.kill('SIGKILL'); await once(proc, 'exit'); }
    if (listener.listening) await new Promise(resolve => listener.close(resolve));
  });
  await once(proc.stdout, 'data');
  const server = { proc, port: listener.address().port };
  rememberProcesses(server);
  const running = await shutdownObservation(server);
  assert.equal(running.portClosed, false);
  assert.equal(running.processes.find(row => row.pid === proc.pid).killZero, true);
  assert.ok(running.startProcesses.find(row => row.pid === proc.pid).started);
  if (process.platform === 'linux') assert.ok(running.startProcesses.find(row => row.pid === proc.pid).linuxStat);
  proc.kill('SIGSTOP');
  await until(() => processRows().some(row => row.pid === proc.pid && row.state.startsWith('T')), 'probe child did not stop');
  const stopped = await shutdownObservation(server);
  assert.equal(stopped.processes.find(row => row.pid === proc.pid).current.state.startsWith('T'), true);
  assert.equal(stopped.processes.find(row => row.pid === proc.pid).killZero, true, 'stopped is still executable, not terminal');
  proc.kill('SIGKILL'); await once(proc, 'exit');
  const reaped = await shutdownObservation(server);
  assert.equal(reaped.portClosed, false, 'an unrelated live listener must still fail shutdown');
  assert.equal(reaped.processes.find(row => row.pid === proc.pid).killZero, false);
  assert.equal(reaped.processes.find(row => row.pid === proc.pid).current, null);
  assert.deepEqual(reaped.startProcesses, running.startProcesses);
  await new Promise(resolve => listener.close(resolve));
  assert.equal((await shutdownObservation(server)).portClosed, true);
});

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
  rememberProcesses(restarted);
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
