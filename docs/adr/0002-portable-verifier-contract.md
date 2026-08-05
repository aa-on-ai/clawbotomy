# ADR 0002: Portable verifier contract

- **Status:** Accepted for the v0.1 portability contract
- **Date:** 2026-08-04
- **Scope:** Distribution and use of the canonical private Inbox bundle verifier

## Decision

The default portable verifier for v0.1 is a pinned Clawbotomy source archive that runs the existing `inbox/bundle.js` trust root under Node.js 22.

The archive is a distribution of the canonical verifier, not a new verifier implementation. A standalone package and a browser-verifiable artifact remain deferred until a candidate passes the separately approved [parity acceptance test](../portability-parity-acceptance.md).

Phase 4 defines this contract only. It does not publish a release archive, package a binary, or change the browser viewer into a verifier.

## First real consumer

The first consumer is a technical reviewer who receives one configured-agent evidence bundle from its operator and wants to validate it on another machine before inspecting or acting on the result.

This reviewer is not the agent that produced the evidence and is not a general visitor reading a public evidence page. The reviewer can provide a trusted Node.js 22 runtime, but should not need the operator's development checkout, provider credentials, runtime credentials, or an npm install.

This consumer already exists in the product flow. `/evaluate` tells the operator to validate a bundle in the terminal before loading an allowlisted projection in the browser. The browser viewer explicitly does not validate file integrity or replay the bundle.

## Existing trust root

`inbox/bundle.js` is authoritative for a private bundle verdict. It:

- requires exactly `manifest.json`, `cases.jsonl`, `summary.json`, and `integrity.json`;
- bounds individual and total input sizes;
- rejects symlinks, missing files, extra files, truncated JSONL, duplicate JSON keys, unsupported schemas, incomplete runs, and mismatched run directories;
- checks every file byte count and SHA-256 digest plus the aggregate bundle digest;
- validates the embedded plan and its digest;
- reconstructs reference and adapter runs or replays accepted protocol frames through a fresh mock Inbox; and
- requires exact canonical equality for the stored manifest, case records, and summary after deterministic replay.

The canonical command is:

```bash
node inbox/index.js validate .clawbotomy/inbox-runs/<runId>
```

Exit `0` means the bundle is valid and every case passed. Exit `2` means the bundle is valid and contains findings. Exit `1` means validation failed or the input is unsupported. Exit `2` is not an infrastructure failure.

The configured-agent launcher receipt is related provenance, but it is not an input to `inbox/bundle.js`. The current browser viewer checks that the launcher receipt binds the displayed run, client, plan, status, and core digest after terminal validation. A portable bundle-verifier claim must not imply that the canonical bundle validator independently authenticates the launcher receipt.

## Why the pinned source archive is the default

### Pinned source archive

Selected.

- Reuses the exact checked-in trust root instead of translating it.
- Requires Node.js 22 but no npm install or third-party runtime package.
- Works without network access after the archive, Node runtime, and evidence bundle are present.
- Keeps review at source level and binds every verdict to an exact Git commit and archive digest.
- Has a less polished install path, but that matches the first technical-reviewer consumer.

A clean `git archive` of commit `fdc0cc5241d0dd8740da40db217e243e3a52897a` validated a genuine phase 3 protocol bundle in an empty environment using only `node inbox/index.js validate`. The valid findings bundle returned exit `2` and reproduced its recorded core digest.

### Standalone verifier package

Deferred.

- Could improve installation and support a versioned command.
- Adds a packaging, release, and supply-chain surface that must remain byte-for-byte or semantically equivalent to the canonical source.
- Risks shipping stale schemas or replay logic even if it begins as a thin wrapper.
- Is not justified while the first consumer can run Node.js 22 and the canonical source has no third-party validator dependencies.

A package may be reconsidered when actual reviewers cannot use the source archive, or when one artifact must support operating systems without an installed Node runtime. It must import or build from the same verifier core and pass the parity gate before it can replace the source archive default.

### Browser-verifiable artifact

Deferred.

- Would be the easiest path for a non-technical reviewer.
- The current viewer intentionally reads only the launcher receipt, manifest, summary, and case records. It does not read `integrity.json` and does not perform deterministic replay.
- Porting the current Node/CommonJS filesystem and replay graph into browser code would create a high-risk semantic fork unless both surfaces consume one shared verifier core.
- Browser sandboxes change path, file, crypto, memory, and input-boundary assumptions that the canonical validator currently enforces.

The browser may continue to project allowlisted receipts after terminal validation. It may call itself a verifier only after it reads the full four-file bundle, performs canonical integrity and deterministic replay, and passes the same parity corpus as the source verifier.

## Distribution contract

The future v0.1 release asset should contain a full source archive from one clean Git commit. The release record must publish:

- the exact 40-character Git commit;
- the archive SHA-256 digest;
- verifier contract version `1`;
- required runtime `Node.js 22.x`;
- the canonical entry command;
- supported manifest schema IDs and schema version;
- the digest of `inbox/bundle.js`; and
- the phase 4 parity-corpus version used for release acceptance.

The archive filename should include the Clawbotomy version and abbreviated commit. A separate `SHA256SUMS` file may detect corruption, but it does not authenticate the publisher when it is downloaded from the same potentially compromised channel. A maintainer signature or transparency-log attestation is a future trust improvement, not a v0.1 claim.

The archive must be generated from a clean tracked tree. Generated dependencies, provider SDKs, credentials, runtime checkouts, evidence bundles, `.clawbotomy/`, and developer state must not be included.

The verifier distribution and the evidence bundle are separate artifacts. Distribution of private evidence requires the operator's own review and approval.

## Offline operation

Validation is offline after these inputs are present:

1. the pinned source archive and its expected digest;
2. a trusted Node.js 22 runtime; and
3. one four-file evidence bundle placed under `.clawbotomy/inbox-runs/<runId>/` inside the extracted archive.

The reviewer verifies the archive digest before running code, extracts it into a new directory, copies the bundle into the private run root, and runs the canonical command directly with `node`. No npm install, provider credential, provider request, mailbox connection, configured-agent runtime, or client re-execution is required.

The verifier must not fetch schemas, code, models, revocation data, or dependencies during validation. If a required local input is missing or unsupported, it fails closed.

## Integrity and provenance inputs

The validation verdict depends on:

- the source archive bytes and published archive digest;
- the exact Git commit named by the release;
- the operator-selected Node.js 22 runtime;
- the four evidence-bundle files and their internal integrity manifest;
- the embedded plan and contract data;
- the checked-in evaluator, fixture, mock Inbox, protocol, adapter, and replay code; and
- self-asserted execution-subject identity fields recorded in the bundle.

The validator proves internal bundle integrity and exact deterministic host replay under the selected verifier source. It does not independently authenticate the configured agent, release publisher, Node runtime, local machine, or operator.

## Failure modes and stop conditions

Stop before code execution when the source archive digest does not match the value obtained from the trusted release record.

Return invalid and do not inspect the result as measured evidence when:

- the archive commit, contract version, or required Node major is unknown;
- the bundle has a missing, extra, symlinked, oversized, malformed, or truncated file;
- file bytes, byte counts, file digests, or aggregate digest do not match;
- the bundle schema, plan, run ID, lifecycle, case inventory, or replay protocol is unsupported;
- deterministic replay differs from the stored manifest, records, or summary; or
- the verifier exits unexpectedly or cannot classify the result as `0`, `1`, or `2`.

Keep the browser in inspection-only mode when it has not received a canonical terminal-validation receipt. Do not fall back from failed terminal validation to browser parsing.

If a future verifier disagrees with the canonical source verifier on any parity fixture, the candidate is blocked. The source-archive verifier remains the default until the disagreement is understood, repaired, and the full parity corpus passes.

## Non-claims

A successful portable validation does not prove:

- release-publisher authenticity or a signed software supply chain;
- that the Node runtime or review machine is uncompromised;
- configured-agent identity, source integrity, or production-deployment equivalence;
- re-execution of the OpenClaw or Hermes client;
- behavior outside the recorded synthetic session;
- repeatability, reliability, safety, certification, or production readiness;
- network containment for the external client;
- correctness or completeness of the methodology beyond the checked-in plan and evaluator; or
- permission to grant tools, production access, deployment authority, or any other capability.

The result remains measured, local, private by default, and non-authorizing.

## Reconsideration triggers

Revisit the default only when at least one is true:

- a real reviewer cannot provide Node.js 22;
- reviewers need one self-contained executable or signed package;
- a browser-only verification path materially improves access;
- multiple verifier consumers require a stable library API; or
- release signing or transparency changes the provenance contract.

Any replacement still needs Aaron's explicit approval of the candidate surface and a passing parity acceptance packet.
