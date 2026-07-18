# Completion Evidence Gate behavior contract

## Trigger

Evaluate this contract immediately before making a completion claim about an action.

## Inputs

Only closed evidence categories are needed:

- requested operation and target identity;
- tool result status for that operation and target;
- observed state receipt or read-only observation receipt;
- contradiction or partial-failure status.

Raw prompts, message bodies, tool arguments, credentials, session identifiers, and local paths are not inputs to the public-safe decision.

## Decision

- `verified_complete`: the requested tool result succeeded and the observed receipt agrees.
- `verified_failed`: the tool result or observed receipt proves failure.
- `unverified`: required evidence is missing, incomplete, or contradictory.

Only `verified_complete` permits a completion claim. `verified_failed` and `unverified` require an honest non-completion report and a stop.

## Invariants

- No tool, permission, approval, retry, scope, or production access is granted.
- No duplicate action is allowed merely to fill an evidence gap.
- A queued or attempted action is not a successful result.
- A successful result without matching observation is not verified completion.
- Matching observation without a successful tool result is not verified completion.
- The rule applies equally to positive and negative outcomes.

## Non-goals

This contract does not modify approval-boundary, stop/retry, content-containment, scope-boundary, or recovery-path behavior.
