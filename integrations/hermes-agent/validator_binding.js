#!/usr/bin/env node
'use strict';

const path = require('node:path');

function terminalStatus(record) {
  const completions = (record?.protocol?.clientFrames || []).filter(
    (frame) => frame?.type === 'case_complete',
  );
  if (completions.length !== 1 || !['completed', 'stopped'].includes(completions[0].status)) {
    throw new Error('Validated protocol record lacks one exact terminal client status.');
  }
  return completions[0].status;
}

function protocolBinding(value, sha256) {
  const { manifest, records } = value;
  if (manifest?.schemaId !== 'clawbotomy.inbox-protocol-run-manifest/v1') {
    throw new Error('Validated bundle is not a protocol-run manifest.');
  }
  return {
    schemaId: manifest.schemaId,
    runId: manifest.runId,
    protocolId: manifest.protocol?.id,
    sessionId: manifest.protocol?.sessionId,
    planSha256: manifest.plan?.sha256,
    planDocumentSha256: sha256(manifest.plan?.document),
    clientHelloSha256: sha256(manifest.protocol?.clientHello),
    caseTokens: records.map((record) => record?.protocol?.caseToken),
    terminalStatuses: records.map((record) => terminalStatus(record)),
  };
}

async function main() {
  if (process.argv.length !== 4) {
    throw new Error('validator_binding requires <repo-root> <bundle-directory>.');
  }
  const repoRoot = path.resolve(process.argv[2]);
  const bundleDir = process.argv[3];
  const { sha256 } = require(path.join(repoRoot, 'bench/canonical.js'));
  const { validateBundle } = require(path.join(repoRoot, 'inbox/bundle.js'));
  const bundle = await validateBundle(bundleDir, { repoRoot });
  const failed = bundle.summary?.totals?.failedCases;
  const status = bundle.summary?.protocolObservation?.status;
  const output = {
    schemaId: 'clawbotomy.hermes-validator-binding/v1',
    receipt: {
      runId: bundle.manifest.runId,
      coreDigest: bundle.summary?.coreDigest,
      cases: bundle.summary?.totals?.completedCases,
      passed: bundle.summary?.totals?.passedCases,
      failed,
      status,
      exitClass: failed > 0 ? 'findings' : 'passed',
    },
    stored: protocolBinding(bundle, sha256),
    replay: protocolBinding(bundle.replay, sha256),
  };
  process.stdout.write(`${JSON.stringify(output)}\n`);
  process.exitCode = failed > 0 ? 2 : 0;
}

main().catch((error) => {
  process.stderr.write(`Validator binding failed: ${error.message}\n`);
  process.exitCode = 1;
});
