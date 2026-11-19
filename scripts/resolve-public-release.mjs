import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';

const root = process.cwd();
const sha = process.env.RELEASE_SHA;
const phase = process.env.RELEASE_PHASE;
const repo = process.env.GITHUB_REPOSITORY;
assert(/^[a-f0-9]{40}$/.test(sha || ''));
assert(['preview', 'production'].includes(phase));
assert.equal(repo, 'aa-on-ai/clawbotomy');
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), sha);
const output = resolve(process.env.RUNNER_TEMP, 'public-release-qa');
mkdirSync(output, { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceFiles = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean).map(path => {
  const bytes = readFileSync(path);
  return { path, bytes: bytes.length, sha256: hash(bytes) };
});
writeFileSync(output + '/source-freeze.json', JSON.stringify({ head: sha,
  tree: execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { encoding: 'utf8' }).trim(), sourceFiles }, null, 2));
async function api(path) {
  const response = await fetch('https://api.github.com/repos/' + repo + path, {
    headers: { authorization: 'Bearer ' + process.env.GITHUB_TOKEN, accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(30000),
  });
  assert(response.ok, 'GitHub deployment lookup failed: ' + response.status);
  return response.json();
}
let selected;
const prefix = phase === 'preview' ? 'Preview' : 'Production';
for (let attempt = 0; attempt < 36 && !selected; attempt++) {
  const deployments = await api('/deployments?sha=' + sha + '&per_page=100');
  const candidates = [];
  for (const deployment of deployments.filter(item => item.sha === sha && item.environment.startsWith(prefix))) {
    const statuses = await api('/deployments/' + deployment.id + '/statuses?per_page=100');
    const seen = new Set();
    for (const status of statuses) {
      const url = status.environment_url;
      if (!url || seen.has(url)) continue;
      seen.add(url);
      if (status.state === 'success' && /^https:\/\/clawbotomy-[a-z0-9]+-aaron-personal\.vercel\.app$/.test(url)) {
        candidates.push({ sha, deploymentId: deployment.id, environment: deployment.environment,
          url, statusId: status.id, createdAt: status.created_at });
      }
    }
  }
  selected = candidates.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!selected) await setTimeout(10000);
}
assert(selected, 'No successful exact-SHA deployment in the canonical project');
writeFileSync(output + '/deployment.json', JSON.stringify(selected, null, 2));
const origin = phase === 'preview' ? selected.url : 'https://www.clawbotomy.com';
const environment = { RELEASE_WORKTREE: root, SOURCE_FREEZE_PATH: output + '/source-freeze.json',
  VERIFY_OUTPUT_DIR: output + '/public', CLAWBOTOMY_BASE_URL: origin,
  CLAWBOTOMY_PREVIEW_ORIGIN: phase === 'preview' ? origin : '' };
for (const [key, value] of Object.entries(environment)) {
  assert(!value.includes('\n') && !value.includes('\r'));
  appendFileSync(process.env.GITHUB_ENV, key + '=' + value + '\n');
}
console.log(JSON.stringify({ sha, phase, origin, deploymentId: selected.deploymentId }));
