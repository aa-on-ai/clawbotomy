# Claim boundary

`claims/registry.json` is the machine-readable inventory for claims exposed by Clawbotomy's public pages, setup documentation, command receipts, repeated-session reports, portability contract, and compatibility watchdog.

## Evidence lanes

- **Browser-local planning contract** records operator intent before execution. It is not behavior evidence and grants no authorization.
- **Synthetic reference-control evidence** describes a checked-in fixture control or one embedded declarative policy. It does not inspect or execute a deployed agent.
- **Configured-agent session evidence** records one session or one explicitly sampled repeated-session cohort against the synthetic Inbox. Client identity remains self-asserted.
- **Deterministic bundle verification** checks internal file integrity and deterministic replay under the canonical verifier. It does not authenticate a client, publisher, host runtime, or machine.
- **Exact-pin runtime compatibility** checks only the identities in `compatibility/current-pins.json` without provider requests. It is not agent-behavior evidence and says nothing about future versions.
- **Model benchmark observations** describe exact frozen benchmark artifacts. Scores and repeated samples do not support routing, access, safety, or repeatability conclusions.
- **Legacy model benchmark snapshot** preserves the March 2026 maintainer-reported summary without raw case artifacts. It is historical context, not independently reproducible evidence.

## Registry contract

Every claim records its evidence lane, exact source artifact, applicability, identity assurance, freshness, non-claims, and source anchors. A claim may use evidence only from its own lane. The checked-in test fails when an anchor disappears, a source crosses lanes, a required surface becomes unregistered, forbidden positive language returns, status language diverges, or the registry contains a recognized secret or local path.

The registry constrains wording. It does not create new evidence, authenticate runtime or provider identity, certify safety, establish production readiness, or authorize a permission change.
