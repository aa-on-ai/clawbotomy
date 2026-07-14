const fs = require('node:fs');
const path = require('node:path');
const { TextDecoder } = require('node:util');

const { isWithin } = require('../bench/private-path');
const { parseStrictJson } = require('./strict-json');

const SAFE_RUN_ID = /^[a-z0-9][a-z0-9._-]{2,80}$/;
const MAX_PLAN_BYTES = 1024 * 1024;
const MAX_BUNDLE_BYTES = 100 * 1024 * 1024;

function assertNoUserSymlinkComponents(targetPath) {
  const absolute = path.resolve(targetPath);
  const parsed = path.parse(absolute);
  let current = parsed.root;
  for (const segment of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) continue;
    const stats = fs.lstatSync(current);
    if (!stats.isSymbolicLink()) continue;
    const currentUid = typeof process.getuid === 'function' ? process.getuid() : null;
    if (currentUid === null || stats.uid === currentUid) {
      throw new Error(`Symlink paths are not allowed: ${current}`);
    }
  }
}

function assertNoSymlinkComponentsWithin(basePath, targetPath) {
  const base = path.resolve(basePath);
  const target = path.resolve(targetPath);
  if (!isWithin(base, target)) throw new Error(`Path must remain within ${base}.`);
  if (!fs.existsSync(base)) {
    throw new Error(`Trusted Inbox repository root must be an existing directory: ${base}`);
  }
  const baseStats = fs.lstatSync(base);
  if (baseStats.isSymbolicLink()) throw new Error(`Symlink paths are not allowed: ${base}`);
  if (!baseStats.isDirectory()) {
    throw new Error(`Trusted Inbox repository root must be an existing directory: ${base}`);
  }

  let current = base;
  for (const segment of path.relative(base, target).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) continue;
    if (fs.lstatSync(current).isSymbolicLink()) {
      throw new Error(`Symlink paths are not allowed: ${current}`);
    }
  }

  const realBase = fs.realpathSync(base);
  let existing = target;
  while (!fs.existsSync(existing)) existing = path.dirname(existing);
  if (!isWithin(realBase, fs.realpathSync(existing))) {
    throw new Error(`Inbox evidence path resolves outside the trusted repository root: ${target}`);
  }
}

function assertRegularFile(filePath, { label, maxBytes }) {
  const absolute = path.resolve(filePath);
  assertNoUserSymlinkComponents(absolute);
  const stats = fs.lstatSync(absolute);
  if (!stats.isFile()) throw new Error(`${label} must be a regular file.`);
  if (stats.size > maxBytes) throw new Error(`${label} exceeds the ${maxBytes}-byte limit.`);
  return { absolute, stats };
}

function readJsonFile(filePath, { label = 'JSON file', maxBytes = MAX_PLAN_BYTES } = {}) {
  const { absolute } = assertRegularFile(filePath, { label, maxBytes });
  const bytes = fs.readFileSync(absolute);
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${label} contains invalid UTF-8.`);
  }
  const value = parseStrictJson(text, label, { maxValues: 10_000, maxDepth: 24 });
  return { absolute, value };
}

function inboxRunsRoot(repoRoot = process.cwd()) {
  return path.join(path.resolve(repoRoot), '.clawbotomy', 'inbox-runs');
}

function assertInboxOutputPath(candidate, { repoRoot = process.cwd() } = {}) {
  const absolute = path.resolve(candidate);
  const root = inboxRunsRoot(repoRoot);
  if (!isWithin(root, absolute) || absolute === root) {
    throw new Error(`Inbox evidence output must be a new directory under ${root}.`);
  }
  const runId = path.basename(absolute);
  if (!SAFE_RUN_ID.test(runId)) {
    throw new Error('Inbox evidence directory name must use lowercase letters, numbers, dots, dashes, or underscores.');
  }
  assertNoSymlinkComponentsWithin(repoRoot, path.dirname(absolute));
  return absolute;
}

function ensurePrivateParent(targetPath) {
  const parent = path.dirname(path.resolve(targetPath));
  const missing = [];
  let cursor = parent;
  while (!fs.existsSync(cursor)) {
    missing.push(cursor);
    const next = path.dirname(cursor);
    if (next === cursor) break;
    cursor = next;
  }
  assertNoUserSymlinkComponents(cursor);
  for (const directory of missing.reverse()) fs.mkdirSync(directory, { mode: 0o700 });
  assertNoUserSymlinkComponents(parent);
}

function createPrivateDirectory(directoryPath) {
  const absolute = path.resolve(directoryPath);
  ensurePrivateParent(absolute);
  assertNoUserSymlinkComponents(path.dirname(absolute));
  if (fs.existsSync(absolute)) throw new Error(`Inbox evidence output already exists: ${absolute}`);
  fs.mkdirSync(absolute, { mode: 0o700 });
  return absolute;
}

function writeExclusive(filePath, bytes, mode = 0o600) {
  const absolute = path.resolve(filePath);
  ensurePrivateParent(absolute);
  assertNoUserSymlinkComponents(path.dirname(absolute));
  const fd = fs.openSync(absolute, 'wx', mode);
  try {
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function appendLine(filePath, line) {
  const absolute = path.resolve(filePath);
  assertNoUserSymlinkComponents(absolute);
  const fd = fs.openSync(absolute, 'a', 0o600);
  try {
    fs.writeSync(fd, `${line}\n`);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function atomicReplace(filePath, bytes, mode = 0o600) {
  const absolute = path.resolve(filePath);
  const directory = path.dirname(absolute);
  assertNoUserSymlinkComponents(directory);
  const temp = path.join(directory, `.${path.basename(absolute)}.${process.pid}.${Date.now()}.tmp`);
  writeExclusive(temp, bytes, mode);
  fs.renameSync(temp, absolute);
}

module.exports = {
  MAX_BUNDLE_BYTES,
  MAX_PLAN_BYTES,
  SAFE_RUN_ID,
  appendLine,
  assertInboxOutputPath,
  assertNoUserSymlinkComponents,
  assertNoSymlinkComponentsWithin,
  assertRegularFile,
  atomicReplace,
  createPrivateDirectory,
  inboxRunsRoot,
  readJsonFile,
  writeExclusive,
};
