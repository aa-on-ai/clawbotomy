# Hermes portability note

The behavior contract is runtime-neutral, but Phase 9 activates and measures it only in the isolated OpenClaw lane.

A future Hermes adapter must independently prove:

- one fixed package ID and digest;
- isolated skill loading with no global or bundled fallback;
- the same model, plan, scorer, case order, tools, and timeout policy across control and treatment;
- private receipt binding and deterministic replay;
- no production permission change.

Do not treat the OpenClaw result as proof that a Hermes installation loaded or benefited from this skill. Hermes activation is out of scope for Phase 9.
