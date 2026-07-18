const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');

const repositoryRoot = path.resolve(__dirname, '..');
const packageRoot = path.join(repositoryRoot, 'interventions/completion-evidence-gate');
const interventionsModule = import(pathToFileURL(
  path.join(repositoryRoot, 'integrations/openclaw/interventions.mjs'),
).href);

async function withTemporaryPackage(callback) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'clawbotomy-intervention-pack-'));
  const copy = path.join(temporaryRoot, 'completion-evidence-gate');
  fs.cpSync(packageRoot, copy, { recursive: true, dereference: false });
  const canonicalCopy = fs.realpathSync(copy);
  try {
    return await callback(canonicalCopy);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

function mutateManifest(copy, mutate) {
  const manifestPath = path.join(copy, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  mutate(manifest);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o644 });
}

test('the fixed completion-evidence package validates with a stable private-safe digest', async () => {
  const {
    COMPLETION_EVIDENCE_INTERVENTION_ID,
    COMPLETION_EVIDENCE_SKILL_NAME,
    interventionPackCatalog,
    loadInterventionPack,
  } = await interventionsModule;

  assert.deepEqual(interventionPackCatalog(), [COMPLETION_EVIDENCE_INTERVENTION_ID]);
  const first = await loadInterventionPack(COMPLETION_EVIDENCE_INTERVENTION_ID);
  const second = await loadInterventionPack(COMPLETION_EVIDENCE_INTERVENTION_ID);

  assert.equal(first.skillName, COMPLETION_EVIDENCE_SKILL_NAME);
  assert.equal(first.packSha256, second.packSha256);
  assert.equal(first.packSha256, '4cbb4259ce3fbeedd51102ada12378af3454fc113c7e56cc55732daa2baacf5c');
  assert.deepEqual(Object.keys(first.safeProjection).sort(), [
    'authorizationStatus',
    'id',
    'packSha256',
    'productionAccessChanged',
    'recommendationId',
    'skillName',
    'status',
    'version',
  ]);
  assert.equal(first.safeProjection.authorizationStatus, 'non-authorizing');
  assert.equal(first.safeProjection.productionAccessChanged, false);
  assert.equal('packageDirectory' in first.safeProjection, false);
  assert.equal('files' in first.safeProjection, false);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.safeProjection), true);
});

test('the installer copies only the reviewed package into a fresh isolated workspace', async () => {
  const { installInterventionPack, loadInterventionPack, validateInterventionPackDirectory } = await interventionsModule;
  const pack = await loadInterventionPack('completion-evidence-gate');
  const temporaryRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'clawbotomy-intervention-install-')));
  const workspace = path.join(temporaryRoot, 'workspace');
  fs.mkdirSync(workspace, { mode: 0o700 });
  try {
    const receipt = await installInterventionPack(pack, workspace);
    const installedRoot = path.join(workspace, 'skills', 'clawbotomy-completion-evidence');
    const installed = await validateInterventionPackDirectory(installedRoot);
    assert.equal(receipt.packSha256, pack.packSha256);
    assert.equal(receipt.sourceClass, 'isolated_workspace');
    assert.equal(receipt.loaded, false);
    assert.equal(installed.packSha256, pack.packSha256);
    assert.equal(fs.lstatSync(installedRoot).mode & 0o077, 0);
    const second = await installInterventionPack(pack, workspace);
    assert.equal(second.packSha256, pack.packSha256);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('unknown and path-like intervention selectors fail before package access', async () => {
  const { loadInterventionPack } = await interventionsModule;
  await assert.rejects(() => loadInterventionPack('approval-boundary'), /Unsupported intervention ID/i);
  await assert.rejects(() => loadInterventionPack('../completion-evidence-gate'), /intervention ID is invalid/i);
  await assert.rejects(() => loadInterventionPack('/tmp/skill'), /intervention ID is invalid/i);
  await assert.rejects(() => loadInterventionPack('https://example.com/skill'), /intervention ID is invalid/i);
  await assert.rejects(() => loadInterventionPack('npm:skill'), /intervention ID is invalid/i);
});

test('package validation rejects extra files, symlinks, writable files, and oversized files', async () => {
  const { validateInterventionPackDirectory } = await interventionsModule;

  await withTemporaryPackage(async (copy) => {
    fs.writeFileSync(path.join(copy, 'extra.md'), 'unexpected\n');
    await assert.rejects(() => validateInterventionPackDirectory(copy), /file surface must be exactly/i);
  });

  await withTemporaryPackage(async (copy) => {
    const target = path.join(copy, 'references/behavior-contract.md');
    const link = path.join(copy, 'references/openclaw-install.md');
    fs.rmSync(link);
    fs.symlinkSync(target, link);
    await assert.rejects(() => validateInterventionPackDirectory(copy), /must not contain symbolic links/i);
  });

  await withTemporaryPackage(async (copy) => {
    const skill = path.join(copy, 'SKILL.md');
    fs.chmodSync(skill, 0o664);
    await assert.rejects(() => validateInterventionPackDirectory(copy), /must not be writable by group or world/i);
  });

  await withTemporaryPackage(async (copy) => {
    fs.writeFileSync(path.join(copy, 'SKILL.md'), 'x'.repeat((64 * 1024) + 1), { mode: 0o644 });
    await assert.rejects(() => validateInterventionPackDirectory(copy), /65536-byte limit/i);
  });
});

test('manifest and content tampering fail even when the outer JSON remains parseable', async () => {
  const { validateInterventionPackDirectory } = await interventionsModule;

  await withTemporaryPackage(async (copy) => {
    const manifestPath = path.join(copy, 'manifest.json');
    const text = fs.readFileSync(manifestPath, 'utf8');
    fs.writeFileSync(manifestPath, text.replace('{', '{"schemaId":"shadow",'), { mode: 0o644 });
    await assert.rejects(() => validateInterventionPackDirectory(copy), /duplicate JSON object key/i);
  });

  await withTemporaryPackage(async (copy) => {
    fs.appendFileSync(path.join(copy, 'SKILL.md'), '\nmutated\n');
    await assert.rejects(() => validateInterventionPackDirectory(copy), /digest or byte count mismatch/i);
  });

  await withTemporaryPackage(async (copy) => {
    mutateManifest(copy, (manifest) => {
      manifest.command = 'run-anything';
    });
    await assert.rejects(() => validateInterventionPackDirectory(copy), /unexpected or missing fields/i);
  });

  await withTemporaryPackage(async (copy) => {
    mutateManifest(copy, (manifest) => {
      manifest.productionAccessChanged = true;
    });
    await assert.rejects(() => validateInterventionPackDirectory(copy), /cannot change production access/i);
  });
});

test('checked-in intervention files contain no private evidence or credential patterns', () => {
  const files = [
    'SKILL.md',
    'manifest.json',
    'references/behavior-contract.md',
    'references/hermes-install.md',
    'references/openclaw-install.md',
  ];
  const joined = files.map((relative) => fs.readFileSync(path.join(packageRoot, relative), 'utf8')).join('\n');
  for (const pattern of [
    /\/Users\//,
    /OPENAI_API_KEY/,
    /sk-[A-Za-z0-9]/,
    /inbox-host-[a-f0-9]/,
    /attempt-[a-z0-9]/,
    /approvalToken/,
    /toolArguments/,
    /messageBodies/,
  ]) {
    assert.doesNotMatch(joined, pattern);
  }
  assert.doesNotMatch(joined, /https?:\/\/(?!example\.com)/);
});
