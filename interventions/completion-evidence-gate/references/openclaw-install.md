# OpenClaw experiment installation

The Phase 9 evaluator installs this skill only through Clawbotomy's fixed intervention ID:

```text
--intervention completion-evidence-gate
```

The launcher resolves the checked-in package, validates its exact file surface and digest, copies it into a fresh isolated OpenClaw workspace, and requires the installed runtime to report exactly one eligible agent skill named `clawbotomy-completion-evidence` before provider initialization.

Do not install this experiment from an arbitrary path, URL, package spec, git ref, ClawHub entry, global skill directory, or user workspace. The no-skill control must report zero eligible agent skills. Both arms keep bundled and global skill loading disabled.

This document is an experiment reference, not a command to modify a production OpenClaw installation.
