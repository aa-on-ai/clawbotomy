# Phase 1 verification report

- **Outcome:** satisfied locally on July 12, 2026
- **Publication state:** source-only verification; undeployed with no real provider calls

## Result

Clawbotomy now has a digest-bound, spend-capped benchmark workflow; durable private evidence bundles; explicit redacted public export; an honest empty public registry/API; and a Rig-inspired technical-editorial shell that keeps provenance ahead of rankings.

## Checks

| check | result |
|---|---|
| Tests | 73/73 pass |
| TypeScript | pass |
| ESLint | pass, no warnings/errors |
| Production build | pass, 17/17 static-generation steps |
| Route smoke test | nine public/API surfaces return 200 |
| Diff hygiene | `git diff --check` pass |
| Security audit | `ACCEPT`, no blocker |
| Design grader | `satisfied`, 9.0/10 |

The fresh zero-request safety preflight planned 3 cases, 12 requests, 170,303 conservative input tokens, 19,200 output tokens, and a $0.790177 upper bound with digest `05f404329cba63b76f7e`. Test-only credential markers were used; the plan was not authorized and made no provider requests.

## Screenshots

Responsive screenshots were captured locally during verification. They are not
part of the source repository because they contain no runtime evidence.

## Visual revision

- Replaced the saturated orange hero/header/strip with warm paper and ink surfaces.
- Sampled Rig's paper, vermilion, and ink values; red is now a scarce forensic accent, while amber remains caution-only.
- Reduced the homepage h1 from a possible 116 px to 51.84 px at 1440 and 44 px at 390. Bench now renders at 54.72 px and 39.78 px.
- Removed every forced uppercase transform and converted human-facing UI labels to sentence case. Canonical technical casing remains intact.
- Rendered scans across eight routes at 390, 768, and 1440 found no human-facing all-caps labels or page-level overflow.
- Small-text red-on-paper and ink-on-paper contrast now measure approximately 5.13:1 and 5.88:1.

## Gaps retained deliberately

- The public registry is empty until a separately approved real run is validated and explicitly exported.
- The March 2026 summary remains low-confidence, maintainer-reported legacy evidence.
- Hashes prove artifact integrity, not authorship or independent provenance.
- No deployment, public export of a real bundle, or provider run was performed.

## Decision needed

Approve the local Phase 1 diff and visual direction, request a bounded revision, or ask for a fresh real-run preflight whose digest and spend ceiling can be reviewed separately.

Detailed implementation and grader reports were retained as local review
artifacts and are not required to reproduce the checked-in verification suite.

---

# Inbox preflight planner verification

- **Outcome:** implemented and locally verified on July 12, 2026
- **Publication state:** source-only verification; undeployed with no agent, provider, or mailbox run

## Result

Clawbotomy now has a useful first configured-agent artifact: `/preflight` records intended Inbox capabilities and approval boundaries, maps them to eleven required mock scenarios, and exports a versioned browser-local JSON plan. The artifact makes no Clawbotomy decision and remains explicitly `not_run`, non-authorizing, and network-free.

## Checks

| check | result |
|---|---|
| Tests | 80/80 pass |
| TypeScript | pass |
| ESLint | pass, no warnings/errors |
| Production build | pass, 18 static-generation steps |
| Browser console | no errors |
| Responsive | no overflow at 390, 768, or 1440 px |
| Mobile targets | 48–66 px |
| Stale export guard | pass |
| Legacy route | `/assess` redirects to `/preflight` |
| Diff hygiene | `git diff --check` pass |
| Design/UX grader | satisfied, 92.8/100, no P0–P2 defects |

## Decision needed

Continue into the deterministic mock-Inbox runner that consumes this plan, or pause for review of the local Phase 0–2 diff before that larger execution slice.

Detailed implementation and grader reports were retained as local review artifacts.

---

# Deterministic mock-Inbox runner verification

- **Outcome:** implemented and locally verified on July 12, 2026
- **Publication state:** source-only verification; undeployed with no provider or real mailbox calls

## Result

The browser plan now executes against fixed built-in reference profiles and a fresh synthetic Inbox. The runner records real mock tool attempts, results, approvals, state diffs, final state, assertions, and per-layer digests; private validation re-runs the whole case graph and rejects semantic changes even when outer file hashes are rewritten.

## Checks

| check | result |
|---|---|
| Tests | 99/99 pass |
| TypeScript | pass |
| ESLint | pass, no warnings/errors |
| Production build | pass, 18 static-generation steps |
| Bounded control | 36/36 pass; exact replay |
| Overreach control | 36/36 fail as designed; exact replay |
| Network traps | fetch/HTTP/HTTPS/net/TLS remain unused |
| Tamper guards | raw and rehashed semantic tamper rejected |
| Private modes | `0700` directory, `0600` files |
| Responsive | no overflow at 390 or 1440 px; controls 48–50 px |
| Browser console | no errors or warnings |
| Diff hygiene | pass |
| Independent security audit | `ACCEPT`; no remaining P0/P1/P2 findings |

## Evidence receipts

- Bounded: `inbox-02752f02f876f7b6b8db`, 22 tool attempts, 12 state transitions, core `977672fc9348fbedcf02fe9e0ec1ea8110cd91502d9d43d14eb8fcc31c920d91`.
- Overreach: `inbox-311c25547711827ffecc`, 56 tool attempts, 26 state transitions, core `88ffbb7f49f36f0b5cd20bb805377b180728f956d99b54b477f39a98ec966c06`.

Both remain `non-authorizing`, `configuredAgentInspected: false`, `productionAccessChanged: false`, and `permissionDecision: null`.

## Decision needed

Approve Phase 3 and continue to a narrow configured-agent adapter contract, or pause to inspect the private reference bundles.

Detailed implementation and grader reports were retained as local review artifacts.

---

# Allowlisted declarative Inbox adapter verification

- **Outcome:** implemented and locally verified on July 12, 2026
- **Publication state:** source-only verification; undeployed with no provider, module, deployed agent, or real mailbox run

## Result

The deterministic Inbox runner now accepts one exact checked-in adapter, `declarative-policy/v1`, plus a closed eleven-scenario JSON policy. The canonical policy and adapter implementation are bound into private replayable evidence. User input cannot select a module, package, command, URL, provider, tool name, target, or fixture action.

## Checks

| check | result |
|---|---|
| Tests | 111/111 pass |
| TypeScript | pass |
| ESLint | pass, no warnings/errors |
| Production build | pass, 18 static-generation steps |
| Safe policy | 36/36 pass; exact replay |
| Unsafe policy | 36/36 fail as designed; exact replay |
| Config replay | exact after original config deletion |
| Dynamic execution surface | no user-derived import/require/eval/process/network/provider/mailbox path |
| Tamper guards | duplicate-key shadow and rehashed semantic tamper rejected |
| Rendered site copy | current boundary, styled, no overflow or console warnings/errors |
| Diff hygiene | pass |
| Independent audits | security, correctness, and docs `ACCEPT`; no P0/P1/P2 findings |

## Evidence receipts

- Safe: `inbox-adapter-95f242dd7a37dc8519a6`, 22 tool attempts, 12 state transitions, core `07a550e98ec7a2f22273920e6e098de320439eea52f43ebf17305b038bf0f6b4`.
- Unsafe: `inbox-adapter-f90d688f9b248624227d`, 56 tool attempts, 26 state transitions, core `7b372f694e24461bf3fde98f2dd1e03548533d5f8d22396eb262212c2c71d7f7`.

Both are `adapter-configuration-only`, `non-authorizing`, `configuredAgentInspected: false`, `configuredAgentExecuted: false`, `productionAccessChanged: false`, and `permissionDecision: null`.

## Decision needed

Approve the configuration-only adapter boundary, then choose a fixed real-agent protocol or a browser evidence explorer for the next slice.

Detailed implementation and grader reports were retained as local review artifacts.

---

# Fixed stdio Inbox agent-host protocol verification

- **Outcome:** implemented and locally verified on July 12, 2026
- **Publication state:** source-only verification; undeployed with no real provider or mailbox calls

## Result

An operator-owned parent can now launch one strict `stdio-jsonl/v1` Clawbotomy child, receive private-oracle-safe public case envelopes, and exercise the deterministic mock Inbox through bounded tool, approval, control, and semantic-event frames. Complete sessions produce transcript-bound, exactly replayable private evidence. Clawbotomy accepts no agent executable, module, command, URL, provider, credential, socket, or mailbox connector and launches no client process.

## Checks

| check | result |
|---|---|
| Tests | 152/152 pass |
| Focused protocol suite | 41/41 pass |
| TypeScript | pass |
| ESLint | pass, no warnings/errors |
| Production build | pass, 18 static-generation steps |
| OS conformance client | 36/36 pass; 22 tool attempts, 12 state transitions; exact replay |
| OS no-op control | 30/36 fail as designed; 42 findings; exact replay |
| Framing/EOF abort | exit `1`, terminal error, no complete bundle |
| Tamper guards | rehashed frame/protocol/token changes rejected |
| Dynamic execution surface | no client-selected loading, launch, network, provider, credential, or mailbox path |
| Evidence boundary | session-only, self-asserted, non-authorizing, client network not observed |
| Diff hygiene | pass |
| Independent audits | security, correctness/replay, and operator-contract/schema `ACCEPT` |

## Evidence receipts

- Conformance: `inbox-host-323949b572d0ce468380`, 36/36 pass, core `83b43c3b6da4a9037abd16bd96ca1b85264ab8ce28402ec7fadfe4141b357f51`.
- No-op: `inbox-host-03e97e607ec2559b32da`, 6/36 pass and 30/36 fail, core `03322003680846ef2855ef166bce7fd65e1d8ab040a079886b49bd992f6f1305`.

Both describe only a self-asserted observed protocol session, remain `non-authorizing` with `permissionDecision: null`, record `productionAccessChangedByClawbotomy: false`, and mark external-client production access as `not-observed`. They say nothing about a real provider, deployed agent, or mailbox.

## Decision needed

Approve the fixed protocol boundary and name the operator-owned agent runtime to connect next, or pause to inspect the private protocol bundles.

Detailed implementation and grader reports were retained as local review artifacts.

---

# Configured-agent connect and evaluate product verification

- **Outcome:** satisfied locally on July 13, 2026
- **Branch:** `agent/evidence-first-agent-evaluation`
- **Publication state:** local review branch only; undeployed with no provider, mailbox, or public-evidence run

## Result

The accepted OpenClaw and Hermes adapter commits are integrated on the review branch. Clawbotomy now has a documented practical local trust boundary, one fixed allowlisted launcher, and an `/evaluate` flow that lets an operator choose a runtime, copy its launch command, inspect a receipt-bound allowlisted projection of private evidence, distinguish passed/findings/infrastructure outcomes, and compare same-plan runs without claiming causality or authorization.

## Checks

| check | result |
|---|---|
| Exact adapter integration | OpenClaw `ce9e394`; Hermes `2991a60` |
| Focused agent-evaluation suite | 18/18 pass |
| Full repository suite | 170/170 pass |
| TypeScript | pass |
| ESLint | pass, no warnings/errors |
| Production build | pass, 19 generated pages; `/evaluate` 10.6 kB |
| Browser flows | 19/19 pass |
| Axe WCAG A/AA | zero violations in empty and loaded states at 1440, 768, and 390 px |
| Responsive overflow | none at 1440, 768, or 390 px |
| Rendered touch targets | no targets below the accepted 44 px gate |
| Diff hygiene | `git diff --check` pass |
| Independent security re-audit | satisfied; no remaining blocker |
| Independent design/UX grader | satisfied, 8.8/10; no P0-P2 blocker |

## Rendered evidence

Seven screenshots and the machine-readable browser receipt are stored outside the source repository under:

`/Users/aaronthomas/Documents/Codex/2026-07-13/can/outputs/clawbotomy-evidence/`

The set covers desktop empty/passed/comparison, tablet empty/comparison, and mobile empty/infrastructure states. The final browser receipt records no failed checks, no horizontal overflow, no axe violations, no undersized targets, and confirms that raw private fixture strings were not rendered.

## Security closure

The final parser and launcher use closed contract identifiers, assertion identifiers, adapter IDs, model-label formats, and diagnostic codes. A scored import requires a binding launcher receipt plus a complete non-empty bundle whose run, plan, client, adapter, status, totals, and digests agree. Raw adapter stderr remains terminal-only. Exit `0`/`2` mismatches fail closed; exit `1` can retain a measured status only when one unique bundle validates and replays, while the process anomaly remains visible.

## Design-system review

The authoritative rendered checks pass. Static source scripts still report known advisory false positives because they inspect TSX separately from CSS Modules and do not recognize the local `reading` state as loading. Manual review confirmed the reading, empty, error, focus, and responsive states, and the independent grader accepted the rendered evidence.

## Gaps retained deliberately

- No real provider, configured-agent, or mailbox execution was performed.
- The screenshots use synthetic local fixtures and are not publishable agent evidence.
- The browser viewer does not validate or replay evidence; it requires the launcher/validator receipt and derives only an allowlisted display projection.
- The trust boundary accepts the local operator, same-UID filesystem, interpreter, Git, installed dependencies, and canonical adapter checkout owner.
- Nothing was pushed, opened as a PR, deployed, or publicly exported.

## Decision needed

Approve the local review branch and explicitly authorize a push/review PR, request a bounded revision, or keep the branch local and paused.
