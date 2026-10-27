import { lstatSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

// Supported POSIX development entry point. One source file, no hot publication:
// any catalog edit/read failure latches shutdown; the operator must restart.
const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = new URL('../content/notebook/catalog.mjs', import.meta.url);
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (['--hostname', '-H', '--port', '-p'].includes(args[i]) && args[i + 1] && !args[i + 1].startsWith('-')) { i++; continue; }
  if (/^--(?:hostname|port)=.+$/.test(args[i])) continue;
  throw new Error(`Unsupported notebook dev argument: ${args[i]}. Use --hostname/-H and --port/-p; no alternate project directory.`);
}
if (process.platform === 'win32') throw new Error('Notebook dev requires POSIX process-group shutdown');

function snapshot() {
  const stat = lstatSync(catalog);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Catalog must be a regular file');
  return { identity: [stat.dev, stat.ino, stat.size, stat.mtimeMs, stat.ctimeMs].join(':'), bytes: readFileSync(catalog) };
}
const initial = snapshot();
let child, monitor, stopping = false, exitCode = 0, shutdown;
function signalGroup(pid, signal) {
  try { process.kill(-pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; }
}
function groupExists(pid) {
  try { process.kill(-pid, 0); return true; } catch (error) {
    if (error.code === 'ESRCH') return false;
    // A denied probe is not proof of absence. Keep the bounded wait/escalation;
    // Darwin can briefly return EPERM while a terminating group disappears.
    if (error.code === 'EPERM') return true;
    throw error;
  }
}
function stop(code, message) {
  if (stopping) return shutdown;
  stopping = true; exitCode = code; clearInterval(monitor);
  if (message) console.error(message);
  const pid = child?.pid;
  shutdown = (async () => {
    if (!pid) return;
    // Next's CLI forks its server. Signal the owned group, not only the leader;
    // escalate even if the leader has exited but a descendant remains.
    signalGroup(pid, 'SIGTERM');
    for (let i = 0; i < 30 && groupExists(pid); i++) await delay(50);
    if (groupExists(pid)) signalGroup(pid, 'SIGKILL');
  })();
  return shutdown;
}
function checkCatalog() {
  try {
    const current = snapshot();
    if (initial.identity === current.identity && initial.bytes.equals(current.bytes)) return;
  } catch { /* Missing, unreadable, non-file and invalid edits also stop serving. */ }
  void stop(1, 'Notebook catalog changed; server stopping. Fix/validate content and restart npm run dev.');
}
function run(args) {
  return new Promise(resolve => {
    child = spawn(process.execPath, args, { cwd: root, stdio: 'inherit', detached: true, env: process.env });
    child.once('error', error => { console.error(error.message); resolve(1); });
    child.once('exit', (code, signal) => resolve(code ?? (signal === 'SIGINT' ? 130 : 1)));
  });
}
process.on('SIGINT', () => { void stop(130); });
process.on('SIGTERM', () => { void stop(143); });
monitor = setInterval(checkCatalog, 100);
try {
  // Monitoring begins BEFORE generation, not in a separate predev hook.
  const generated = await run([fileURLToPath(new URL('./build-notebook.mjs', import.meta.url))]);
  checkCatalog();
  if (!stopping && generated === 0) {
    const code = await run([fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url)), 'dev', ...args]);
    // A dev server is long-lived: even Next's exit-0 startup failure is a stop,
    // not successful readiness. Operator signals already carry their own codes.
    await stop(code || 1, 'Next development server exited; restart npm run dev.');
  } else if (!stopping) await stop(generated);
} finally {
  await (shutdown || stop(1));
  process.exitCode = exitCode;
}
