# Runtime compatibility policy

## Decision

Clawbotomy v0.1 supports one exact OpenClaw identity and one exact Hermes identity. The machine-readable inventory is `compatibility/current-pins.json`.

The support promise is intentionally narrow. A version string alone is not an identity. OpenClaw support requires Node.js 22 plus its complete runtime, binary, package manifest, selected provider runtime, and Codex harness runtime to match the listed SHA-256 values. Hermes support requires CPython 3.11 plus its version, Git commit, complete Git-tree digest, and the bridge's checked-in critical-file hashes to match.

The Clawbotomy side of every watchdog receipt is the clean Git commit containing the policy and verifier code. The commit cannot be embedded in the same commit without creating a circular identity, so the watchdog records it at execution time and rejects a dirty worktree.

The current-pin watchdog accepts no alternate policy path. It requires the canonical `compatibility/current-pins.json` file and verifies its bytes against `git show HEAD:compatibility/current-pins.json` before checking a runtime. A different inventory belongs to a separately approved candidate-pin probe and may emit only `compatible-but-unpromised`; it cannot redefine `supported` for the current watchdog.

No other OpenClaw or Hermes version is promised by v0.1.

## State model

- **supported**: the runtime is the exact listed identity and the current-pin watchdog completed every required check under a deny-network boundary. User-facing language: `Verified for this exact pinned configuration on <date>. This compatibility check did not run a model and is not a behavior or safety result.`
- **drifted**: an installation expected to be the supported pin differs in source, version, digest, tool registration, protocol behavior, bundle integrity, or replay. User-facing language: `The supported pin has drifted or failed its compatibility check. Do not describe this installation as verified until the pin or integration is repaired and rechecked.`
- **compatible-but-unpromised**: a different identity completed an explicitly approved candidate-pin probe, but the support policy was not changed. The current-pin watchdog never assigns this state automatically. User-facing language: `This configuration passed a candidate compatibility probe, but Clawbotomy does not currently promise support for it.`
- **unsupported**: the identity is outside the support inventory, cannot supply the required provenance, or needs a contract Clawbotomy does not implement. User-facing language: `This configuration is outside Clawbotomy's current support inventory. No compatibility claim is made.`

Passing the watchdog is necessary for `supported`; it is not sufficient for any statement about agent behavior, model quality, reliability, security, safety, certification, production readiness, or future compatibility.

## Current-pin watchdog contract

The watchdog must verify, without a provider request:

1. the clean Clawbotomy source commit and policy digest;
2. the complete OpenClaw runtime and selected provider/harness identities;
3. the pinned Hermes Git source, complete tree identity, and protected imports;
4. exactly the eight mock-Inbox tools on both model-facing runtime surfaces;
5. the `stdio-jsonl/v1` handshake for each bridge identity;
6. exactly one named, bounded synthetic case per bridge identity;
7. a separate canonical protocol-bundle self-test, including outer integrity and deterministic replay.

The one-case probe stops after `inbox.scope-boundary:search_read` closes and before the next case is executed. The bundle self-test uses the canonical checked-in plan and may contain more cases because Clawbotomy deliberately does not add an ad hoc one-case plan schema to the evidence trust root.

On macOS, the watchdog re-executes itself through `sandbox-exec` with all networking denied for the entire process tree. OpenClaw receives only an isolated inventory command. Hermes receives test-only placeholder OAuth-shaped data, initializes the pinned source, and registers tools, but never runs a conversation or provider method. The receipt records the enforced network boundary and zero provider requests. A platform without an enforceable deny-network runner cannot produce a `supported` receipt under this policy.

## Triggers and cadence

There is no scheduler, recurring job, provider call, or multi-version matrix in v0.1.

Run the watchdog manually:

- before a release tag or support claim;
- after changing a runtime pin, bridge, tool schema, protocol, bundle validator, or deterministic replay path;
- after reinstalling any pinned runtime component; or
- when an operator reports drift.

A recurring cadence, hosted runner, candidate-version matrix, or provider-backed smoke requires Aaron's approval of both the support expansion and its run budget.

## Artifacts and retention

The default private receipt lives under `.clawbotomy/compatibility-runs/<run-id>/receipt.json` with directory mode `0700` and file mode `0600`. It contains digests, versions, tool names, case/result counts, and bounded diagnostics only. It must not contain credentials, prompts, model responses, raw configuration databases, or absolute runtime paths.

- Keep the latest successful receipt for the active pin until 30 days after that pin is replaced.
- Keep drifted and failed receipts until the issue is resolved, then for 90 additional days.
- Do not publish a receipt or status badge without explicit approval and a separate redaction review.

## Failure routing and ownership

The Clawbotomy maintainer owns the policy, pin promotion, and final support language. The operator running the watchdog owns preserving the private receipt and reporting its exit state.

- Exit `0`: exact current pins are `supported` for this check.
- Exit `2`: at least one expected current pin is `drifted`; block a release or support claim.
- Exit `1`: the watchdog itself could not establish a result; treat the support state as unknown and block the claim.

Failures remain local by default. The watchdog does not open issues, send alerts, change runtime configuration, install a version, or mutate a release. The maintainer reviews the safe receipt, repairs the integration or proposes a new pin, and reruns the same gate. Promoting a different runtime requires an explicit policy change and approval; a passing candidate does not promote itself.

## Non-claims

The watchdog does not call a model, evaluate an agent session, connect to a real mailbox, authenticate bridge identity to the protocol host, certify runtime security, establish behavioral repeatability, or predict compatibility with any unlisted version. The protocol identity remains self-asserted, and the synthetic case shows only that the checked-in bridge contract completed that bounded exchange.
