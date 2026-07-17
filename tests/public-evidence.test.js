const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { readBundle } = require('../bench/bundle');
const { assertPublicIndexEntryMatchesBundle } = require('../bench/public-index');

const root = path.resolve(__dirname, '..');
const evidenceRoot = path.join(root, 'public/evidence');

test('public evidence registry contains only complete validated live measurements', () => {
  const index = JSON.parse(fs.readFileSync(path.join(evidenceRoot, 'index.json'), 'utf8'));
  assert.equal(index.schemaId, 'clawbotomy.public-evidence-index/v1');
  assert.ok(index.runs.length > 0, 'expected at least one public evidence run');

  for (const entry of index.runs) {
    assert.match(entry.runId, /^run-[a-f0-9]{20}$/);
    const bundle = readBundle(path.join(evidenceRoot, entry.runId), { requireComplete: true });
    assert.doesNotThrow(() => assertPublicIndexEntryMatchesBundle(entry, bundle));
    assert.equal(bundle.manifest.execution.mode, 'live');
    assert.equal(bundle.manifest.evidence.measurementStatus, 'measured');
    assert.equal(bundle.manifest.evidence.authorizationStatus, 'non-authorizing');
    assert.equal(bundle.integrity.bundleDigest, entry.bundleDigest);
  }
});

test('the published evidence schemas are parseable, versioned, and addressable', () => {
  const schemas = [
    'benchmark-plan.v1.schema.json',
    'evidence-bundle.v1.schema.json',
    'case-record.v1.schema.json',
    'summary.v1.schema.json',
    'integrity.v1.schema.json',
    'inbox-preflight-plan.v1.schema.json',
    'inbox-run-manifest.v1.schema.json',
    'inbox-case-record.v1.schema.json',
    'inbox-run-summary.v1.schema.json',
    'inbox-declarative-policy.v1.schema.json',
    'inbox-adapter-run-manifest.v1.schema.json',
    'inbox-adapter-case-record.v1.schema.json',
    'inbox-adapter-run-summary.v1.schema.json',
    'inbox-protocol-frame.v1.schema.json',
    'inbox-public-case-envelope.v1.schema.json',
    'inbox-protocol-run-manifest.v1.schema.json',
    'inbox-protocol-case-record.v1.schema.json',
    'inbox-protocol-run-summary.v1.schema.json',
  ];
  for (const name of schemas) {
    const schema = JSON.parse(fs.readFileSync(path.join(evidenceRoot, 'schema', name), 'utf8'));
    assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
    assert.equal(schema.$id, `https://www.clawbotomy.com/evidence/schema/${name}`);
  }

  const caseRecord = JSON.parse(
    fs.readFileSync(path.join(evidenceRoot, 'schema', 'case-record.v1.schema.json'), 'utf8'),
  );
  assert.ok(
    caseRecord.properties.target_requests.items.properties.outcome.enum.includes('invalid_response'),
  );

  const inboxCaseRecord = JSON.parse(
    fs.readFileSync(path.join(evidenceRoot, 'schema', 'inbox-case-record.v1.schema.json'), 'utf8'),
  );
  assert.equal(
    inboxCaseRecord.$defs.task.properties.controlEvents.items.properties.kind.const,
    'operator_stop',
  );

  const adapterManifest = JSON.parse(
    fs.readFileSync(path.join(evidenceRoot, 'schema', 'inbox-adapter-run-manifest.v1.schema.json'), 'utf8'),
  );
  assert.equal(adapterManifest.properties.executionSubject.$ref, '#/$defs/executionSubject');
  assert.equal(adapterManifest.$defs.executionSubject.properties.id.const, 'declarative-policy/v1');
  assert.equal(adapterManifest.$defs.evidenceBoundary.properties.configuredAgentExecuted.const, false);

  const adapterCaseRecord = JSON.parse(
    fs.readFileSync(path.join(evidenceRoot, 'schema', 'inbox-adapter-case-record.v1.schema.json'), 'utf8'),
  );
  assert.deepEqual(
    adapterCaseRecord.$defs.event.properties.actor.enum,
    ['allowlisted-adapter', 'fixture-control', 'mock-inbox'],
  );

  const protocolFrame = JSON.parse(
    fs.readFileSync(path.join(evidenceRoot, 'schema', 'inbox-protocol-frame.v1.schema.json'), 'utf8'),
  );
  assert.equal(protocolFrame.$defs.protocolId.const, 'stdio-jsonl/v1');
  assert.equal(protocolFrame.$defs.hello.properties.client.$ref, '#/$defs/clientDescriptor');

  const publicCase = JSON.parse(
    fs.readFileSync(path.join(evidenceRoot, 'schema', 'inbox-public-case-envelope.v1.schema.json'), 'utf8'),
  );
  assert.equal(publicCase.properties.schemaId.const, 'clawbotomy.inbox-public-case-envelope/v1');
  assert.equal(publicCase.properties.visibleContext.oneOf.length, 3);

  const protocolManifest = JSON.parse(
    fs.readFileSync(path.join(evidenceRoot, 'schema', 'inbox-protocol-run-manifest.v1.schema.json'), 'utf8'),
  );
  assert.equal(protocolManifest.$defs.executionSubject.properties.identityAssurance.const, 'self-asserted');
  assert.equal(protocolManifest.$defs.evidenceBoundary.properties.permissionDecision.type, 'null');
  assert.equal(protocolManifest.properties.protocol.properties.clientReexecuted.const, false);
});

test('unhashed index fields cannot spoof the hashed public manifest', () => {
  const entry = {
    runId: `run-${'a'.repeat(20)}`,
    bundleDigest: 'b'.repeat(64),
    sourceBundleDigest: 'c'.repeat(64),
    completedAt: '2026-07-12T12:00:00.000Z',
    measurementStatus: 'measured',
    reproducibilityStatus: 'complete',
    reviewStatus: 'maintainer-self-reported',
    authorizationStatus: 'non-authorizing',
  };
  const bundle = {
    manifest: {
      runId: entry.runId,
      lifecycle: { completedAt: entry.completedAt },
      execution: { mode: 'live' },
      evidence: {
        measurementStatus: entry.measurementStatus,
        reproducibilityStatus: entry.reproducibilityStatus,
        reviewStatus: entry.reviewStatus,
        authorizationStatus: entry.authorizationStatus,
      },
      publication: { sourceBundleDigest: entry.sourceBundleDigest },
    },
    integrity: { bundleDigest: entry.bundleDigest },
  };
  assert.doesNotThrow(() => assertPublicIndexEntryMatchesBundle(entry, bundle));
  for (const [field, value] of [
    ['reviewStatus', 'independently-reviewed'],
    ['reproducibilityStatus', 'redacted'],
    ['completedAt', '2026-07-13T12:00:00.000Z'],
  ]) {
    assert.throws(
      () => assertPublicIndexEntryMatchesBundle({ ...entry, [field]: value }, bundle),
      /does not match its index entry/,
    );
  }
});

test('the public API exposes registry status without promoting synthetic or legacy data', () => {
  const route = fs.readFileSync(path.join(root, 'src/app/api/bench/route.ts'), 'utf8');
  const runRoute = fs.readFileSync(path.join(root, 'src/app/api/bench/runs/[runId]/route.ts'), 'utf8');
  const caseRoute = fs.readFileSync(path.join(root, 'src/app/api/bench/runs/[runId]/cases/[recordId]/route.ts'), 'utf8');
  const loader = fs.readFileSync(path.join(root, 'src/lib/public-evidence.server.ts'), 'utf8');

  assert.match(route, /latestRunId/);
  assert.match(route, /publishedRuns/);
  assert.match(route, /No public evidence run has been published/);
  assert.match(runRoute, /non-authorizing/);
  assert.match(caseRoute, /untrusted model output and judge data/);
  assert.match(loader, /safeRunId = \/\^run-/);
  assert.match(loader, /readBundle\(directory, \{ requireComplete: true \}\)/);
  assert.match(loader, /assertPublicIndexEntryMatchesBundle\(entry, bundle\)/);
  assert.doesNotMatch(loader, /fetch\(/);
});
