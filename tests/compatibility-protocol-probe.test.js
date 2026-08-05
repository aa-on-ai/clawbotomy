const assert = require('node:assert/strict');
const test = require('node:test');

const {
  runBundleSelfTest,
  runSingleCaseProbe,
} = require('../compatibility/protocol-probe');

const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);

function identity(id, version) {
  return {
    id,
    version,
    implementationSha256: DIGEST_A,
    configurationSha256: DIGEST_B,
  };
}

for (const runtime of [
  identity('openclaw.clawbotomy-bridge', '2026.7.1-beta.5'),
  identity('hermes-agent.clawbotomy-bridge', '0.18.2'),
]) {
  test(`${runtime.id} completes exactly one bounded current-pin protocol case`, () => {
    const receipt = runSingleCaseProbe({ repoRoot: process.cwd(), identity: runtime });
    assert.equal(receipt.protocolId, 'stdio-jsonl/v1');
    assert.equal(receipt.protocolVersion, '1.0.0');
    assert.equal(receipt.handshakeAccepted, true);
    assert.equal(receipt.completedCaseCount, 1);
    assert.equal(receipt.completedCaseId, 'inbox.scope-boundary:search_read');
    assert.equal(receipt.toolCalls, 1);
    assert.equal(receipt.approvals, 0);
    assert.equal(receipt.nextCaseObservedButNotExecuted, true);
    assert.match(receipt.transcriptSha256, /^[a-f0-9]{64}$/);
  });

  test(`${runtime.id} produces an integrity-validated deterministic protocol replay`, async () => {
    const receipt = await runBundleSelfTest({ repoRoot: process.cwd(), identity: runtime });
    assert.equal(receipt.caseCount, 36);
    assert.equal(receipt.integritySchemaId, 'clawbotomy.integrity/v1');
    assert.equal(receipt.integrityValidated, true);
    assert.equal(receipt.deterministicReplayMatched, true);
    assert.match(receipt.bundleDigest, /^[a-f0-9]{64}$/);
    assert.match(receipt.coreDigest, /^[a-f0-9]{64}$/);
  });
}

test('the conformance client accepts an explicit current-pin identity', () => {
  const { ProtocolConformanceClient } = require('./helpers/protocol-conformance-client');
  const current = identity('openclaw.clawbotomy-bridge', '2026.7.1-beta.5');
  const hello = new ProtocolConformanceClient(current).hello();
  assert.deepEqual(hello.client, current);
});

test('the one-case probe rejects unbound source identities', () => {
  assert.throws(
    () => runSingleCaseProbe({
      repoRoot: process.cwd(),
      identity: {
        id: 'openclaw.clawbotomy-bridge',
        version: '2026.7.1-beta.5',
        implementationSha256: null,
        configurationSha256: null,
      },
    }),
    /implementationSha256/,
  );
});
