# Portable verifier parity acceptance

- **Status:** Contract ready for approval; no candidate verifier approved
- **Date:** 2026-08-04
- **Canonical oracle:** `inbox/bundle.js` at the exact source-archive commit under Node.js 22

## Purpose

This gate prevents a standalone package, executable, or browser implementation from weakening the current bundle verdict while claiming compatibility.

Passing this gate is necessary but not sufficient to replace the pinned source archive. Distribution provenance, platform security, and user-facing claims require separate review.

## Candidate input contract

The candidate receives the same four bundle files as the canonical verifier:

- `manifest.json`
- `cases.jsonl`
- `summary.json`
- `integrity.json`

No candidate may fetch missing code, schemas, dependencies, models, or evidence from the network. No candidate may repair, rewrite, normalize, or omit an input before validation.

Browser candidates must preserve the same per-file and total-byte ceilings even though they do not have filesystem paths. Package and executable candidates must preserve regular-file, exact-file-set, and symlink rejection.

## Verdict contract

For every fixture, compare the candidate with the canonical verifier pinned to the same contract corpus:

- `valid_pass`: canonical exit `0`; candidate must accept and classify passed.
- `valid_findings`: canonical exit `2`; candidate must accept and classify findings.
- `invalid`: canonical exit `1`; candidate must reject and must not expose a measured pass/findings receipt.
- `infrastructure_failure`: candidate execution failed before a verdict; candidate must expose no bundle verdict.

Exact human error strings are not part of parity because the canonical verifier does not publish stable diagnostic codes. The fixture ID owns the expected rejection category. A future stable-code contract must first be added to the canonical verifier.

For every accepted fixture, the candidate must produce the same normalized fields as the canonical verifier:

- `runId`
- execution-subject ID and kind
- applicability
- measured status
- scheduled, completed, passed, and failed case counts
- tool-attempt and state-transition totals
- `coreDigest`
- bundle digest
- authorization status and null permission decision
- ordered case record digests

Absolute paths, display formatting, and human prose are excluded from normalized comparison.

## Required corpus

The corpus must contain at least:

1. A complete passing protocol bundle.
2. A complete findings protocol bundle.
3. One complete reference-control bundle.
4. One complete declarative-adapter bundle.
5. A file-byte mutation with the original integrity manifest.
6. A semantic case-event mutation after all outer file hashes and the aggregate digest are recomputed.
7. A plan-document mutation with recomputed outer hashes.
8. A manifest or summary core-digest mismatch.
9. A duplicate protocol case token with recomputed outer hashes.
10. An unsupported protocol ID, manifest schema, and schema version.
11. A lifecycle that is not complete.
12. A run-directory and manifest run-ID mismatch for filesystem candidates.
13. Each missing required file and each unexpected extra file.
14. A symlinked file and a symlinked path component for filesystem candidates.
15. An oversized individual file and oversized total bundle.
16. Malformed UTF-8, duplicate JSON keys, a blank JSONL record, and a truncated final JSONL record.
17. A case-count mismatch, duplicate case ID, unsupported case record, and replay-divergent summary.
18. An authorizing evidence field or non-null permission decision.

Each invalid fixture must be generated from a valid canonical fixture by one named mutation. The packet records the source fixture digest, mutation recipe, resulting file digests, expected verdict, and canonical receipt or bounded failure category.

## Acceptance rules

The candidate passes only when:

- the canonical source verifier passes its own existing test suite;
- every corpus fixture has a recorded canonical verdict under Node.js 22;
- the candidate matches every canonical valid/invalid verdict;
- every accepted normalized receipt matches exactly;
- the candidate never accepts a canonical rejection;
- the candidate makes zero network requests;
- the candidate leaves input files unchanged;
- repeated validation of the same bytes produces the same normalized receipt;
- supported schema and protocol allowlists match the canonical source; and
- bounds, strict parsing, integrity checks, plan validation, deterministic replay, and non-authorizing checks are exercised in the candidate.

One mismatch blocks the candidate. There is no acceptable mismatch rate, weighted score, or warning-only category.

## Approval packet

Before implementation begins, the candidate proposal must name:

- the first consumer and why the pinned source archive is insufficient;
- whether it imports, compiles, or independently rewrites the verifier core;
- target platforms and runtime dependencies;
- distribution and update channel;
- artifact digest and publisher-authentication mechanism;
- offline behavior and any unavoidable network boundary;
- supported schema and contract versions;
- resource and input bounds;
- the complete parity corpus and runner;
- rollback to the pinned source archive; and
- every user-facing claim and non-claim.

Aaron must explicitly approve that packet before a second verifier implementation starts. After implementation, the completed parity receipts and artifact provenance require a second approval before the candidate can be presented as a verifier.

## Current decision

No standalone or browser verifier is approved. The current browser remains an allowlisted local evidence inspector after canonical terminal validation. The pinned source archive remains the default.
