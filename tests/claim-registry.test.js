const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');

const { residualSecretClasses } = require('../bench/redaction');

const root = path.resolve(__dirname, '..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'claims/registry.json'), 'utf8'));
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

function discoverPublicClaimSurfaces(directory = path.join(root, 'src', 'app')) {
  const discovered = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      discovered.push(...discoverPublicClaimSurfaces(absolute));
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.tsx')) continue;
    const relative = path.relative(root, absolute).split(path.sep).join('/');
    const source = fs.readFileSync(absolute, 'utf8');
    const renderedPage = entry.name === 'page.tsx' && !/\bredirect\s*\(/.test(source);
    const sharedMetadata = relative === 'src/app/layout.tsx';
    const generatedImage = /\bImageResponse\b/.test(source);
    if (renderedPage || sharedMetadata || generatedImage) discovered.push(relative);
  }
  return discovered.sort();
}

test('claim registry is complete, lane-scoped, and anchored to live sources', () => {
  assert.equal(registry.schemaId, 'clawbotomy.claim-registry/v1');
  assert.ok(registry.claims.length > 0);
  assert.equal(new Set(registry.claims.map((claim) => claim.id)).size, registry.claims.length);

  const coveredSurfaces = new Set();
  for (const claim of registry.claims) {
    assert.ok(registry.lanes[claim.lane], claim.id);
    assert.ok(claim.statement && claim.applicability && claim.identityAssurance && claim.freshness, claim.id);
    assert.ok(Array.isArray(claim.nonClaims) && claim.nonClaims.length > 0, claim.id);
    assert.ok(Array.isArray(claim.evidenceSourceIds) && claim.evidenceSourceIds.length > 0, claim.id);
    assert.ok(Array.isArray(claim.anchors) && claim.anchors.length > 0, claim.id);

    for (const sourceId of claim.evidenceSourceIds) {
      const source = registry.evidenceSources[sourceId];
      assert.ok(source, `${claim.id} references missing evidence source ${sourceId}`);
      assert.equal(source.lane, claim.lane, `${claim.id} crosses evidence lanes through ${sourceId}`);
      for (const sourcePath of source.paths) assert.ok(fs.existsSync(path.join(root, sourcePath)), sourcePath);
    }

    for (const anchor of claim.anchors) {
      assert.ok(fs.existsSync(path.join(root, anchor.file)), anchor.file);
      assert.ok(read(anchor.file).includes(anchor.text), `${claim.id} missing anchor in ${anchor.file}: ${anchor.text}`);
      coveredSurfaces.add(anchor.file);
    }
  }

  for (const surface of registry.requiredSurfaceFiles) {
    assert.ok(fs.existsSync(path.join(root, surface)), surface);
    assert.ok(coveredSurfaces.has(surface), `required claim surface is not anchored: ${surface}`);
  }
});

test('registered public surfaces reject unsupported positive claim language', () => {
  const source = registry.requiredSurfaceFiles.map((file) => read(file)).join('\n');
  for (const rule of registry.forbiddenPositivePatterns) {
    assert.doesNotMatch(source, new RegExp(rule.pattern, 'i'), rule.id);
  }
});

test('every rendered route, shared metadata surface, and generated social image is registered', () => {
  const registered = new Set(registry.requiredSurfaceFiles);
  for (const surface of discoverPublicClaimSurfaces()) {
    assert.ok(registered.has(surface), `public claim surface bypasses the registry: ${surface}`);
  }
  assert.match(read('src/app/opengraph-image.tsx'), /Not connected by Clawbotomy/);
  assert.doesNotMatch(read('src/app/opengraph-image.tsx'), /Real mailbox', 'Never connected/);
});

test('evidence lane labels remain visibly distinct on the public surfaces', () => {
  const labels = Object.values(registry.lanes).map((lane) => lane.publicLabel);
  assert.equal(new Set(labels).size, labels.length);

  assert.match(read('src/app/docs/page.tsx'), /synthetic-reference-control/);
  assert.match(read('src/app/page.tsx'), /Configured-agent session evidence/);
  assert.match(read('src/app/evaluate/AgentEvaluationWorkbench.tsx'), /Evidence lane \/ deterministic bundle verification/);
  assert.match(read('src/app/docs/page.tsx'), /Exact-pin runtime compatibility/);
  assert.match(read('src/app/bench/runs/[runId]/page.tsx'), /Evidence lane \/ model benchmark observations/);
  assert.match(read('src/app/bench/page.tsx'), /Evidence lane \/ legacy model benchmark snapshot/);
});

test('status language has one registry source across session and compatibility outputs', async () => {
  assert.match(read('src/lib/agent-evaluation.ts'), /claimRegistry\.statusLanguage\.configuredAgentSession/);
  assert.match(read('inbox/repeated-session-evidence.js'), /claimRegistry\.statusLanguage\.configuredAgentSession/);
  assert.match(read('compatibility/watchdog.mjs'), /claimRegistry\.statusLanguage\.compatibility/);

  for (const message of Object.values(registry.statusLanguage.compatibility)) {
    assert.ok(read('docs/compatibility-policy.md').includes(`\`${message}\``), message);
  }

  const { compatibilityStatusMessage } = await import(
    pathToFileURL(path.join(root, 'compatibility/watchdog.mjs')).href
  );
  const supported = compatibilityStatusMessage('supported', '2026-08-04T12:00:00.000Z');
  assert.equal(supported, registry.statusLanguage.compatibility.supported.replace('<date>', '2026-08-04'));
  assert.doesNotMatch(supported, /<date>/);
});

test('claim registry is safe for public distribution', () => {
  assert.deepEqual(residualSecretClasses(registry), []);
  const serialized = JSON.stringify(registry);
  assert.doesNotMatch(serialized, /\/Users\//);
  assert.doesNotMatch(serialized, /Bearer\s+[A-Za-z0-9._~+/-]+/i);
});
