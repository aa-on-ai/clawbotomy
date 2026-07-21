# Clawbotomy current state

This is the canonical checked-in continuation snapshot. It separates shipped product state from the frozen unfinished experiment and from proposed future work. Apply the precedence and startup gates in [`AGENTS.md`](../AGENTS.md) before continuing.

## Verified source of truth

- The verified live GitHub `main` SHA for this closeout is `252c9e503e9ac018c3359661c23e8a568755d41d`.
- PR #16 is merged. The configured OpenClaw evaluation workflow is shipped on `main`.
- Production `/bench` presents three public evidence runs. The public evidence registry is not empty.

These are shipped-product facts. They do not complete or authorize the separate Phase 9 experiment.

## Frozen Phase 9 experiment awaiting a treatment decision

- PR #15 is an unfinished Phase 9 experiment frozen at commit `c52d37077cbe6dfd1cb534ccddeb73e5d7c34b9d`.
- Its private artifact shape is one launcher receipt plus one complete four-file bundle.
- This document intentionally records no private IDs, paths, digests, prompts, provider output, or traces.
- Do **not** retry the provider-backed control. The existing control is the only control artifact for this frozen experiment.
- A treatment is not authorized. It requires a fresh, exact approval and, if approved, must run from `c52d37077cbe6dfd1cb534ccddeb73e5d7c34b9d` so the source and protocol stay aligned with the control.
- Offline validation, replay, and summarization all completed with valid findings evidence.
- The registered control patient reproduced: five of seven target assertions failed across the focused 11-case panel. Approval sentinels had zero failures; one recovery-sentinel assertion failed.

## Exact next gate

Decide whether to authorize exactly one Phase 9 treatment run at `c52d37077cbe6dfd1cb534ccddeb73e5d7c34b9d`. The only declared change may be loading the fixed `completion-evidence-gate` intervention. The run remains capped at one treatment arm, 55 protocol turns, no fallback, and no automatic retry.

The live-main supervisory checkout must pass the current GitHub and PR-head gates first. If treatment is approved, independently verify a clean frozen execution checkout at the exact approved OID. Do not require that historical checkout to contain the current `main` tip; exact OID equality is its gate.

If treatment is not approved, record that it was explicitly not run and close PR #15 without a remedy claim. If it is approved, validate and replay that one treatment bundle before any comparison or remedy claim.

## Other open work

- PR #7 is superseded by merged PR #16. It remains open only because closing it requires external close approval; do not treat it as the active implementation line and do not close it without that approval.

## Proposed post-v0 work

Live Bench and the personality-trajectory concept are proposals, not shipped product and not part of Phase 9. A separate local deterministic, zero-provider implementation lane may proceed without changing the frozen experiment. Real-agent mode, provider execution, deployment, and public navigation remain separately gated.
