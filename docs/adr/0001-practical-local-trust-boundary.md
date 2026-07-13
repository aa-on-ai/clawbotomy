# ADR 0001: Practical local trust boundary

- **Status:** Accepted for the local product preview
- **Date:** 2026-07-13
- **Scope:** OpenClaw and Hermes Agent bridges for the fixed `stdio-jsonl/v1` mock-Inbox protocol

## Context

Clawbotomy evaluates an agent-controlled process against a runner-owned synthetic Inbox. The useful product boundary is not a hostile workstation sandbox. It is a local, operator-run measurement boundary that keeps the evaluated model and its runtime from redefining the tools, protocol, evidence, or permission decision.

Open-ended self-auditing by the evaluated runtime is not part of this boundary. Runtime maintenance and code review remain ordinary local engineering work.

## Decision

For the current product preview, Clawbotomy trusts:

- the local operator;
- the same-UID filesystem and process environment;
- the Node.js and Python interpreters, Git binary, and installed dependencies selected by the operator;
- the owner of each canonical OpenClaw or Hermes checkout; and
- operator-supplied runtime and source pins obtained outside the runtime being evaluated.

Clawbotomy treats these inputs as untrusted:

- model output and model-selected tool calls;
- agent claims about actions or completion;
- protocol frames and self-asserted client identity;
- message content, including prompt injection inside the synthetic Inbox; and
- private evidence until the checked-in validator and deterministic replay accept it.

The bridges must continue to protect against:

- ambient or unexpected model-facing tools;
- protocol sequence, binding, and transcript tampering;
- fabricated, incomplete, or replay-divergent evidence;
- accidental ambient runtime modules;
- credentials or private bundle content crossing into Clawbotomy output; and
- a measured result being mistaken for authorization or a production permission change.

## Consequences

- A complete run is evidence about one observed synthetic session. It is not a security certification, runtime attestation, or permission decision.
- Exit `0` means a complete validated bundle with all cases passed. Exit `2` means a complete validated bundle with findings. Exit `1` always remains a process anomaly; if and only if the launcher independently discovers exactly one new bundle that passes the checked-in validator and deterministic replay, that bundle may retain its measured `passed` or `findings` status while the abnormal exit remains visible. Otherwise no agent result is scored.
- Private bundles remain under `.clawbotomy/` unless the operator explicitly performs the separate public-export workflow.
- Clawbotomy never needs a real mailbox connection for this evaluation flow.

## Deliberately excluded boundary

The preview does not claim protection from a hostile local operator, malicious same-UID process, compromised interpreter, compromised dependency, or writable canonical runtime checkout.

`HermesRuntime._sanitize_sys_path()` currently decides whether a path is blocked from its resolved target. A path lexically inside the trusted Hermes checkout that is itself a symlink to an outside directory can therefore remain. Creating or changing that link requires write access inside the trusted local runtime boundary, so this is not an MVP blocker under the decision above.

If Clawbotomy later claims a hostile-local-filesystem boundary, the implementation must check both the lexical absolute path and the resolved path and add regression coverage for symlinks in both directions before that claim is made.

## Product language

User-facing surfaces should say **local**, **private**, **measured**, **findings**, and **non-authorizing**. They should not say **safe**, **certified**, **approved**, or **attested**.
