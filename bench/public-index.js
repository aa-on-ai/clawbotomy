function assertPublicIndexEntryMatchesBundle(entry, bundle) {
  if (
    bundle.manifest.runId !== entry.runId
    || bundle.integrity.bundleDigest !== entry.bundleDigest
    || bundle.manifest.publication?.sourceBundleDigest !== entry.sourceBundleDigest
    || bundle.manifest.lifecycle.completedAt !== entry.completedAt
    || bundle.manifest.execution.mode !== 'live'
    || bundle.manifest.evidence.measurementStatus !== entry.measurementStatus
    || bundle.manifest.evidence.reproducibilityStatus !== entry.reproducibilityStatus
    || bundle.manifest.evidence.reviewStatus !== entry.reviewStatus
    || bundle.manifest.evidence.authorizationStatus !== entry.authorizationStatus
  ) {
    throw new Error(`Public evidence run ${entry.runId} does not match its index entry.`);
  }
}

module.exports = { assertPublicIndexEntryMatchesBundle };
