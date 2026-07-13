const fs = require('node:fs');
const path = require('node:path');

const { canonicalStringify, sha256 } = require('../bench/canonical');
const {
  MAX_BUNDLE_BYTES,
  assertInboxOutputPath,
  assertNoUserSymlinkComponents,
  createPrivateDirectory,
  writeExclusive,
} = require('./io');
const { validatePlan } = require('./plan');
const { runAdapterPlanInMemory } = require('./adapter-runner');
const { replayProtocolPlanInMemory } = require('./protocol-runner');
const { runPlanInMemory } = require('./runner');
const { parseStrictJson } = require('./strict-json');

const FILES = Object.freeze(['manifest.json', 'cases.jsonl', 'summary.json']);
const INTEGRITY_FILE = 'integrity.json';

function encodeBundleFiles({ manifest, records, summary }) {
  return {
    'manifest.json': Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
    'cases.jsonl': Buffer.from(
      records.length > 0 ? `${records.map((record) => canonicalStringify(record)).join('\n')}\n` : '',
      'utf8',
    ),
    'summary.json': Buffer.from(`${JSON.stringify(summary, null, 2)}\n`, 'utf8'),
  };
}

function createIntegrity(encodedFiles) {
  const files = Object.fromEntries(FILES.map((name) => [name, {
    sha256: sha256(encodedFiles[name]),
    bytes: encodedFiles[name].length,
  }]));
  return {
    schemaId: 'clawbotomy.integrity/v1',
    algorithm: 'sha256',
    files,
    bundleDigest: sha256(files),
  };
}

function writeBundle({ outputDir, result, repoRoot = process.cwd() }) {
  const absolute = assertInboxOutputPath(outputDir, { repoRoot });
  if (path.basename(absolute) !== result.manifest.runId) {
    throw new Error(`Inbox evidence directory must use the deterministic run ID ${result.manifest.runId}.`);
  }
  createPrivateDirectory(absolute);
  const encodedFiles = encodeBundleFiles(result);
  for (const name of FILES) writeExclusive(path.join(absolute, name), encodedFiles[name], 0o600);
  const integrity = createIntegrity(encodedFiles);
  writeExclusive(path.join(absolute, INTEGRITY_FILE), `${JSON.stringify(integrity, null, 2)}\n`, 0o600);
  return { outputDir: absolute, ...result, integrity };
}

function checkedBytes(bundleDir, name) {
  const filePath = path.join(bundleDir, name);
  assertNoUserSymlinkComponents(filePath);
  const stats = fs.lstatSync(filePath);
  if (!stats.isFile()) throw new Error(`${name} must be a regular file.`);
  if (stats.size > MAX_BUNDLE_BYTES) throw new Error(`${name} exceeds the Inbox bundle size limit.`);
  return fs.readFileSync(filePath);
}

function parseJson(bytes, label) {
  return parseStrictJson(bytes.toString('utf8'), label);
}

function parseCaseRecords(bytes) {
  const text = bytes.toString('utf8');
  if (!text) return [];
  if (!text.endsWith('\n')) throw new Error('cases.jsonl is truncated; the final record has no newline.');
  return text.slice(0, -1).split('\n').map((line, index) => {
    if (!line) throw new Error(`cases.jsonl contains a blank record at line ${index + 1}.`);
    return parseStrictJson(line, `cases.jsonl line ${index + 1}`);
  });
}

function assertIntegrityShape(integrity) {
  if (
    !integrity
    || integrity.schemaId !== 'clawbotomy.integrity/v1'
    || integrity.algorithm !== 'sha256'
    || canonicalStringify(Object.keys(integrity).sort()) !== canonicalStringify(['algorithm', 'bundleDigest', 'files', 'schemaId'])
    || canonicalStringify(Object.keys(integrity.files || {}).sort()) !== canonicalStringify([...FILES].sort())
  ) {
    throw new Error('Unsupported Inbox integrity manifest.');
  }
  for (const name of FILES) {
    const entry = integrity.files[name];
    if (
      !entry
      || canonicalStringify(Object.keys(entry).sort()) !== canonicalStringify(['bytes', 'sha256'])
      || !Number.isInteger(entry.bytes)
      || entry.bytes < 0
      || !/^[a-f0-9]{64}$/.test(entry.sha256)
    ) {
      throw new Error(`Invalid Inbox integrity entry for ${name}.`);
    }
  }
  if (!/^[a-f0-9]{64}$/.test(integrity.bundleDigest)) throw new Error('Invalid Inbox bundle digest.');
}

function readBundle(bundleDir, { repoRoot = process.cwd() } = {}) {
  const absolute = assertInboxOutputPath(bundleDir, { repoRoot });
  assertNoUserSymlinkComponents(absolute);
  const stats = fs.lstatSync(absolute);
  if (!stats.isDirectory()) throw new Error('Inbox evidence bundle must be a directory.');
  const expected = [...FILES, INTEGRITY_FILE].sort();
  const entries = fs.readdirSync(absolute, { withFileTypes: true });
  const actual = entries.map((entry) => entry.name).sort();
  if (
    entries.some((entry) => !entry.isFile())
    || canonicalStringify(actual) !== canonicalStringify(expected)
  ) {
    throw new Error(`Inbox evidence bundle contains unexpected or missing files: ${actual.join(', ')}.`);
  }

  const integrityBytes = checkedBytes(absolute, INTEGRITY_FILE);
  const integrity = parseJson(integrityBytes, INTEGRITY_FILE);
  assertIntegrityShape(integrity);
  let totalBytes = integrityBytes.length;
  const encodedFiles = {};
  for (const name of FILES) {
    const bytes = checkedBytes(absolute, name);
    totalBytes += bytes.length;
    if (totalBytes > MAX_BUNDLE_BYTES) throw new Error('Inbox evidence bundle exceeds the total size limit.');
    encodedFiles[name] = bytes;
    const expectedEntry = integrity.files[name];
    if (expectedEntry.bytes !== bytes.length || expectedEntry.sha256 !== sha256(bytes)) {
      throw new Error(`Integrity mismatch for ${name}.`);
    }
  }
  if (integrity.bundleDigest !== sha256(integrity.files)) throw new Error('Inbox bundle digest mismatch.');

  const manifest = parseJson(encodedFiles['manifest.json'], 'manifest.json');
  const records = parseCaseRecords(encodedFiles['cases.jsonl']);
  const summary = parseJson(encodedFiles['summary.json'], 'summary.json');
  const supportedManifest = [
    'clawbotomy.inbox-run-manifest/v1',
    'clawbotomy.inbox-adapter-run-manifest/v1',
    'clawbotomy.inbox-protocol-run-manifest/v1',
  ].includes(manifest.schemaId) && manifest.schemaVersion === '1.0.0';
  if (!supportedManifest) {
    throw new Error('Unsupported Inbox run manifest schema.');
  }
  if (manifest.lifecycle?.status !== 'complete') throw new Error('Inbox evidence bundle is not complete.');
  if (path.basename(absolute) !== manifest.runId) throw new Error('Inbox bundle directory does not match its run ID.');
  if (records.length !== manifest.execution?.caseCount) throw new Error('Inbox case count does not match the manifest.');
  return { outputDir: absolute, manifest, records, summary, integrity };
}

async function validateBundle(bundleDir, { repoRoot = process.cwd() } = {}) {
  const stored = readBundle(bundleDir, { repoRoot });
  const plan = validatePlan(stored.manifest.plan?.document);
  if (stored.manifest.plan.sha256 !== sha256(plan)) throw new Error('Inbox bundle plan digest mismatch.');
  let recomputed;
  if (stored.manifest.schemaId === 'clawbotomy.inbox-protocol-run-manifest/v1') {
    recomputed = replayProtocolPlanInMemory({
      inputPlan: plan,
      planDigest: stored.manifest.plan.sha256,
      protocolId: stored.manifest.protocol?.id,
      sessionId: stored.manifest.protocol?.sessionId,
      clientHello: stored.manifest.protocol?.clientHello,
      caseClientFrames: stored.records.map((record) => record.protocol?.clientFrames),
      recordedCaseTokens: stored.records.map((record) => record.protocol?.caseToken),
    });
  } else if (stored.manifest.schemaId === 'clawbotomy.inbox-adapter-run-manifest/v1') {
    recomputed = await runAdapterPlanInMemory({
      inputPlan: plan,
      planDigest: stored.manifest.plan.sha256,
      adapterId: stored.manifest.executionSubject?.id,
      adapterConfiguration: stored.manifest.adapterConfiguration?.document,
    });
  } else {
    recomputed = await runPlanInMemory({
      inputPlan: plan,
      planDigest: stored.manifest.plan.sha256,
      profile: stored.manifest.referenceAgent?.id,
    });
  }
  for (const field of ['manifest', 'records', 'summary']) {
    if (canonicalStringify(stored[field]) !== canonicalStringify(recomputed[field])) {
      throw new Error(`Stored Inbox ${field} does not match deterministic replay.`);
    }
  }
  return { ...stored, replay: recomputed };
}

module.exports = {
  FILES,
  INTEGRITY_FILE,
  createIntegrity,
  encodeBundleFiles,
  parseCaseRecords,
  readBundle,
  validateBundle,
  writeBundle,
};
