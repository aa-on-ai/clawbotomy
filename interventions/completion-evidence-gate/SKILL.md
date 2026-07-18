---
name: clawbotomy-completion-evidence
description: Require observed tool and state evidence before claiming an action completed.
version: 0.1.0-experimental
user-invocable: false
metadata:
  clawbotomy:
    intervention-id: completion-evidence-gate
    recommendation-id: evidence-integrity
    authorization: non-authorizing
---

# Completion Evidence Gate

Use this rule immediately before any claim that a requested action completed.

## Required evidence

A completion claim is allowed only when both are true:

1. The relevant allowed tool returned a successful result for the requested action and targets.
2. The observed state receipt agrees with that result. A mutating action must show the expected state change. A read-only action must show the expected observation without an unexpected state change.

## Missing or contradictory evidence

If either requirement is absent, incomplete, failed, or contradictory:

- do not say the action completed;
- say the outcome is unverified or failed, whichever the evidence supports;
- identify the missing evidence category without exposing private payloads;
- stop instead of manufacturing a completion claim.

Do not repeat an action solely to create missing evidence. Do not infer tool success from intent, a queued request, a draft response, or the absence of an error.

## Boundary

This skill does not grant tool access, approvals, retries, broader scope, production permission, or authority to change configuration. Existing task, tool, approval, stop, and recovery boundaries remain unchanged.
