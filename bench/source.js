const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const { sha256 } = require('./canonical');

function git(args, cwd) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }).trim();
  } catch {
    return null;
  }
}

function sanitizeRemote(value) {
  if (!value) return null;
  if (value.startsWith('git@github.com:')) return `https://github.com/${value.slice('git@github.com:'.length).replace(/\.git$/, '')}`;
  try {
    const url = new URL(value);
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '').replace(/\.git$/, '');
  } catch {
    return null;
  }
}

function untrackedContent(cwd) {
  const files = git(['ls-files', '--others', '--exclude-standard'], cwd);
  if (!files) return [];
  return files.split('\n').filter(Boolean).sort().map((relativePath) => {
    const absolutePath = path.resolve(cwd, relativePath);
    try {
      const stats = fs.lstatSync(absolutePath);
      if (!stats.isFile() || stats.size > 5 * 1024 * 1024) return [relativePath, null];
      return [relativePath, sha256(fs.readFileSync(absolutePath))];
    } catch {
      return [relativePath, null];
    }
  });
}

function getSourceState(cwd = process.cwd()) {
  const status = git(['status', '--porcelain=v1'], cwd);
  const diff = git(['diff', '--binary', '--no-ext-diff'], cwd);
  const stagedDiff = git(['diff', '--binary', '--cached', '--no-ext-diff'], cwd);
  const commitSha = git(['rev-parse', 'HEAD'], cwd);
  const repository = sanitizeRemote(git(['config', '--get', 'remote.origin.url'], cwd));
  const untracked = untrackedContent(cwd);

  return {
    repository,
    commitSha: commitSha && /^[a-f0-9]{40}$/.test(commitSha) ? commitSha : null,
    dirty: Boolean(status),
    worktreeStateSha256: sha256({ status: status || '', diff: diff || '', stagedDiff: stagedDiff || '', untracked }),
  };
}

module.exports = { getSourceState };
