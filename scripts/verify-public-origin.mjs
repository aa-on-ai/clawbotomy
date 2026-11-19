// Read-only verification of the exact Allo release on a resolved public origin.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const root = process.env.RELEASE_WORKTREE;
const origin = process.env.CLAWBOTOMY_BASE_URL;
const output = process.env.VERIFY_OUTPUT_DIR;
const freezePath = process.env.SOURCE_FREEZE_PATH;
assert(root && resolve(root) === root && freezePath, 'Explicit worktree and source freeze required');
assert(origin && new URL(origin).origin === origin && new URL(origin).protocol === 'https:', 'Exact HTTPS origin required');
assert(output && resolve(output) === output && !existsSync(output), 'New absolute receipt directory required');
if (process.env.CLAWBOTOMY_PREVIEW_ORIGIN) {
  assert.equal(process.env.CLAWBOTOMY_PREVIEW_ORIGIN, origin);
  assert(new URL(origin).hostname.endsWith('-aaron-personal.vercel.app'));
} else {
  assert.equal(origin, 'https://www.clawbotomy.com', 'Canonical origin required outside explicit preview gate');
}
mkdirSync(output, { recursive: true });
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const freeze = JSON.parse(readFileSync(freezePath, 'utf8'));
for (const file of freeze.sourceFiles) {
  const bytes = readFileSync(root + '/' + file.path);
  assert.equal(bytes.length, file.bytes, file.path);
  assert.equal(sha256(bytes), file.sha256, file.path);
}
const require = createRequire(root + '/package.json');
const { request } = require('playwright');
const { loadNotebookCatalog } = await import(root + '/scripts/lib/notebook-content.mjs');
const notes = loadNotebookCatalog().approvedNotes;
const paths = [
  ...notes.map(note => ({ route: '/notes/' + note.slug, file: 'public/notebook/generated/' + note.slug + '.html' })),
  ...['generated/notes.json', 'cover.js', 'document-map.js', 'structured.css', 'snapshot.json', 'index.html', 'felt.css', 'typography.css', 'sources.html', 'assets/allo/AlloVariableFriendly.woff2', 'assets/allo/Allo-Oblique.woff2', 'assets/allo/OFL.txt'].map(name => ({ route: '/notebook/' + name, file: 'public/notebook/' + name })),
  { route: '/play/fetch', file: 'public/play/fetch.html' },
];
assert.equal(new Set(paths.map(item => item.route)).size, paths.length);
const http = await request.newContext();
const httpReceipts = [];
try {
  for (const item of paths) {
    const intendedURL = origin + item.route;
    const response = await http.get(intendedURL);
    assert.equal(response.status(), 200, intendedURL);
    assert.equal(response.url(), intendedURL, 'Unexpected redirect');
    const bytes = await response.body();
    assert.equal(sha256(bytes), sha256(readFileSync(root + '/' + item.file)), 'Byte mismatch: ' + item.route);
    httpReceipts.push({ ...item, status: response.status(), intendedURL, finalURL: response.url(), bytes: bytes.length, sha256: sha256(bytes) });
  }
} finally {
  await http.dispose();
  writeFileSync(output + '/http.json', JSON.stringify(httpReceipts, null, 2));
}
const projects = ['desktop-chromium', 'mobile-chromium', 'mobile-webkit'];
const result = spawnSync(process.execPath, [require.resolve('@playwright/test/cli'), 'test', ...projects.map(project => '--project=' + project), '--retries=0', '--reporter=json', '--output=' + output + '/browser'], {
  cwd: root,
  env: { ...process.env, CLAWBOTOMY_BASE_URL: origin },
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
  timeout: 900000,
});
writeFileSync(output + '/browser.json', result.stdout || '');
writeFileSync(output + '/browser.stderr.log', result.stderr || '');
let stats = null;
try { stats = JSON.parse(result.stdout).stats; } catch { /* Failed collection remains a failed gate. */ }
const receipt = { origin, sourceHead: freeze.head, sourceTree: freeze.tree, approvedArticleSlugs: notes.map(note => note.slug), httpChecks: httpReceipts.length, browserExit: result.status, signal: result.signal, error: result.error?.message || null, stats, projects, note: 'Content/source evidence only; independently bind GitHub, provider project, merge and deployment identity.' };
writeFileSync(output + '/RESULT.json', JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt));
assert.equal(result.status, 0, 'Full public browser suite failed');
assert(stats && stats.expected > 0 && stats.unexpected === 0 && stats.flaky === 0, 'Missing, failing or retried browser assertions');
for (const file of freeze.sourceFiles) assert.equal(sha256(readFileSync(root + '/' + file.path)), file.sha256, 'Source drift after verification: ' + file.path);
