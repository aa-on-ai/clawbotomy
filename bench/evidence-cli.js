#!/usr/bin/env node

const { readBundle } = require('./bundle');
const { exportPublicBundle } = require('./public-export');
const claimRegistry = require('../claims/registry.json');

const USAGE = `Clawbotomy evidence tools (offline only)

Usage:
  node bench/evidence-cli.js validate <bundle-dir>
  node bench/evidence-cli.js summarize <bundle-dir>
  node bench/evidence-cli.js export <bundle-dir> --confirm-public <bundle-digest>

These commands make no provider requests. Export is explicit, creates a separate
redacted artifact under public/evidence, and never deploys or pushes it.`;

function parse(argv) {
  const [command, bundleDir, ...rest] = argv;
  if (command === '--help' || command === 'help') return { help: true };
  if (!['validate', 'summarize', 'export'].includes(command) || !bundleDir) throw new Error(USAGE);
  const args = { command, bundleDir, confirmPublic: null };
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (token !== '--confirm-public') throw new Error(`Unknown evidence option: ${token}`);
    const value = rest[index + 1];
    if (!value || value.startsWith('--')) throw new Error('--confirm-public requires a bundle digest.');
    args.confirmPublic = value;
    index += 1;
  }
  return args;
}

function main() {
  const args = parse(process.argv.slice(2));
  if (args.help) {
    // eslint-disable-next-line no-console
    console.log(USAGE);
    return;
  }

  if (args.command === 'validate') {
    const bundle = readBundle(args.bundleDir);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
      valid: true,
      evidenceLane: 'deterministic-bundle-verification',
      nonClaims: claimRegistry.lanes['deterministic-bundle-verification'].defaultNonClaims,
      runId: bundle.manifest.runId,
      lifecycleStatus: bundle.manifest.lifecycle.status,
      bundleDigest: bundle.integrity.bundleDigest,
      totals: bundle.summary.totals,
    }, null, 2));
    return;
  }

  if (args.command === 'summarize') {
    const bundle = readBundle(args.bundleDir);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(bundle.summary, null, 2));
    return;
  }

  if (!args.confirmPublic) throw new Error('Export requires --confirm-public with the private bundle digest.');
  const exported = exportPublicBundle({
    sourceDir: args.bundleDir,
    confirmBundleDigest: args.confirmPublic,
  });
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({
    exported: true,
    evidenceLane: 'model-benchmark',
    nonClaims: claimRegistry.lanes['model-benchmark'].defaultNonClaims,
    runId: exported.manifest.runId,
    outputDir: exported.outputDir,
    publicBundleDigest: exported.integrity.bundleDigest,
    reproducibilityStatus: exported.manifest.evidence.reproducibilityStatus,
  }, null, 2));
}

try {
  main();
} catch (error) {
  // eslint-disable-next-line no-console
  console.error(`Evidence command failed: ${error.message}`);
  process.exit(1);
}
