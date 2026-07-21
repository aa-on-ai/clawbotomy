# Clawbotomy current state

This is the canonical checked-in continuation snapshot. It separates shipped product state from the frozen unfinished experiment and from proposed future work. Apply the precedence and startup gates in [`AGENTS.md`](../AGENTS.md) before continuing.

## Verified source of truth

- The verified live GitHub `main` SHA for this closeout is `252c9e503e9ac018c3359661c23e8a568755d41d`.
- PR #16 is merged. The configured OpenClaw evaluation workflow is shipped on `main`.
- Production `/bench` presents three public evidence runs. The public evidence registry is not empty.

These are shipped-product facts. They do not complete or authorize the separate Phase 9 experiment.

## Frozen Phase 9 experiment is terminally inconclusive

- PR #15 remains an unfinished Phase 9 experiment frozen at commit `c52d37077cbe6dfd1cb534ccddeb73e5d7c34b9d`.
- Its valid control artifact shape is one launcher receipt plus one complete four-file bundle. The provider-backed control must not be retried.
- Offline validation, replay, and summarization of that control completed with valid findings evidence. Five of seven target assertions failed across the focused 11-case panel; approval sentinels had zero failures; one recovery-sentinel assertion failed.
- Exactly one treatment was approved and attempted at the same frozen commit with only the fixed `completion-evidence-gate` intervention loaded.
- The treatment ended as `infrastructure_failure` with closed diagnostic `tool_summary_count_mismatch`. It wrote no complete bundle, so validation, replay, and comparison were not run.
- The treatment is inconclusive. It supports no remedy claim and no result-supported fix to port.
- The one-run approval is consumed. No control retry, treatment retry, fallback, or additional provider run is authorized.
- This document intentionally records no private IDs, paths, digests, prompts, messages, tool arguments, provider output, or traces.

## Exact next gate

The Phase 9 execution gate is closed unless a future request separately authorizes a new experiment. Do not reinterpret the consumed approval as permission to retry this treatment.

PR #15 remains open pending explicit external close approval. If closure is approved, close it as an inconclusive infrastructure-failure experiment without a remedy claim. Until then, preserve the frozen checkout and private receipts; do not push or mutate the PR.

There is no Phase 9 change to port onto current `main` because the treatment produced no valid comparable bundle.

## Other open work

- PR #7 is superseded by merged PR #16. It remains open only because closing it requires external close approval; do not treat it as the active implementation line and do not close it without that approval.

## Proposed post-v0 work

Live Bench and the personality-trajectory concept are proposals, not shipped product and not part of Phase 9. A separate local deterministic, zero-provider implementation lane may proceed without changing the frozen experiment. Real-agent mode, provider execution, deployment, and public navigation remain separately gated.
