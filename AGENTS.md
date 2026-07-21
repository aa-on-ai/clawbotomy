# Clawbotomy agent continuation contract

This file is the mandatory startup contract for every agent working in this repository. Run the gates below before reading an old plan or making a change. If a gate fails, stop and report the mismatch; do not repair, clean, reset, switch, or fetch around it without explicit approval.

Clawbotomy uses two distinct checkout lanes:

1. A **supervisory checkout** based on the live GitHub default branch. Use it for state reconciliation, documentation, ordinary development, and approval preparation.
2. A **frozen execution checkout** pinned to an approved historical commit. Use it only for an experiment whose exact approval names that commit. It is verified against the approved OID, not against current-main ancestry.

Never weaken one lane's gate to make the other lane pass.

## 1. Resolve and verify the checkout

1. Resolve the Git root, change to it, and identify the canonical repository from its remote. A worktree directory may have an arbitrary name, so repository identity is `aa-on-ai/clawbotomy`, not the directory basename.
2. For a supervisory checkout, fail fast unless all of the following are true:
   - the canonical repository is Clawbotomy (`aa-on-ai/clawbotomy`);
   - the resolved worktree is not `~/Documents/Codex` or below it;
   - the working tree has no unexpected tracked, untracked, staged, or conflicted changes;
   - `HEAD` is based on the current live GitHub default-branch tip.
3. Resolve the live default branch from GitHub on every fresh continuation. Do not substitute a cached remote-tracking ref or a session summary.

A suitable non-worktree-mutating preflight is below. It updates the remote-tracking default-branch ref. Prompting is disabled so unavailable authentication fails closed instead of hanging.

```bash
repo_root="$(git rev-parse --show-toplevel)" || exit 1
cd "$repo_root" || exit 1
export GH_PROMPT_DISABLED=1
export GIT_TERMINAL_PROMPT=0

case "$(git remote get-url origin)" in
  https://github.com/aa-on-ai/clawbotomy|https://github.com/aa-on-ai/clawbotomy.git|git@github.com:aa-on-ai/clawbotomy.git|ssh://git@github.com/aa-on-ai/clawbotomy.git) ;;
  *) printf '%s\n' 'stop: this is not the canonical Clawbotomy repository' >&2; exit 1 ;;
esac

case "$(pwd -P)" in
  "$HOME/Documents/Codex"|"$HOME/Documents/Codex/"*)
    printf '%s\n' 'stop: this worktree is under ~/Documents/Codex' >&2
    exit 1
    ;;
esac

if test -n "$(git status --porcelain=v1 --untracked-files=all)"; then
  printf '%s\n' 'stop: unexpected worktree changes exist' >&2
  git status --short >&2
  exit 1
fi

repo_identity="$(gh repo view --json nameWithOwner --jq .nameWithOwner)" || exit 1
default_branch="$(gh repo view --json defaultBranchRef --jq .defaultBranchRef.name)" || exit 1
test "$repo_identity" = 'aa-on-ai/clawbotomy' || exit 1
live_default_sha="$(gh api "repos/aa-on-ai/clawbotomy/commits/$default_branch" --jq .sha)" || exit 1
git fetch --no-tags origin "refs/heads/$default_branch:refs/remotes/origin/$default_branch" || exit 1
test "$(git rev-parse "refs/remotes/origin/$default_branch")" = "$live_default_sha" || {
  printf '%s\n' 'stop: fetched default branch does not match the live GitHub SHA' >&2
  exit 1
}
git merge-base --is-ancestor "$live_default_sha" HEAD || {
  printf '%s\n' 'stop: HEAD is not based on the live GitHub default branch' >&2
  exit 1
}
```

If GitHub, authentication, or the live lookup is unavailable, the startup gate is unresolved. Stop rather than assuming a cached SHA is current.

## 2. Establish current state without exposing private evidence

1. Read [`docs/current-state.md`](docs/current-state.md) in full.
2. Inventory open pull requests with a read-only query, including each exact head OID, then reconcile their states with that document:

   ```bash
   gh pr list \
     --repo aa-on-ai/clawbotomy \
     --state open \
     --limit 100 \
     --json number,headRefName,headRefOid,baseRefName,isDraft
   ```

   Phase 9 is frozen to the exact public PR #15 head OID. Verify it separately and stop on mismatch:

   ```bash
   frozen_phase9_sha='c52d37077cbe6dfd1cb534ccddeb73e5d7c34b9d'
   live_phase9_sha="$(GH_PROMPT_DISABLED=1 gh pr view 15 \
     --repo aa-on-ai/clawbotomy \
     --json headRefOid \
     --jq .headRefOid)" || exit 1
   test "$live_phase9_sha" = "$frozen_phase9_sha" || {
     printf '%s\n' 'stop: PR #15 no longer matches the frozen Phase 9 OID' >&2
     exit 1
   }
   ```

3. Inventory only the **shape** of any checkout-local private artifacts. Do not print or copy their paths, IDs, digests, prompts, messages, tool arguments, provider output, or traces. This metadata-only inventory reports aggregate counts and does not read file contents:

```bash
python3 - <<'PY'
import os
import stat
import sys
from pathlib import Path

root = Path('.clawbotomy')
required = {'manifest.json', 'cases.jsonl', 'summary.json', 'integrity.json'}
complete_bundles = 0
launcher_receipts = 0
private_files = 0
anomalies = 0

def walk_error(_error):
    raise RuntimeError('private artifact traversal failed')

root_present = root.is_dir() and not root.is_symlink()
try:
    if root.exists() and not root_present:
        anomalies += 1
    if root_present:
        for current, directories, files in os.walk(
            root,
            followlinks=False,
            onerror=walk_error,
        ):
            kept_directories = []
            for name in directories:
                entry = Path(current) / name
                mode = entry.lstat().st_mode
                if stat.S_ISDIR(mode):
                    kept_directories.append(name)
                else:
                    anomalies += 1
            directories[:] = kept_directories

            regular_names = []
            for name in files:
                entry = Path(current) / name
                mode = entry.lstat().st_mode
                if stat.S_ISREG(mode):
                    regular_names.append(name)
                else:
                    anomalies += 1

            private_files += len(regular_names)
            names = set(regular_names)
            complete_bundles += int(required <= names)
            launcher_receipts += sum(
                name.startswith('evaluation-attempt-') and name.endswith('.json')
                for name in regular_names
            )
except (OSError, RuntimeError):
    print('stop: private artifact inventory could not be completed', file=sys.stderr)
    raise SystemExit(1)

result = {
    'private_root_present': root_present,
    'private_file_count': private_files,
    'launcher_receipt_count': launcher_receipts,
    'complete_four_file_bundle_count': complete_bundles,
    'anomaly_count': anomalies,
}
print(result)
if anomalies:
    print('stop: private artifact inventory contains non-regular entries', file=sys.stderr)
    raise SystemExit(1)
PY
```

Do not infer current state from session summaries alone. Session summaries, GBrain, and old plans are discovery aids, not authoritative continuation receipts.

## 3. Evidence and execution gates

- Offline validation, replay, and summarization of an existing bundle are not permission to launch a provider-backed run.
- Never rerun a provider-backed control or treatment without a fresh, exact approval for that run. A past approval, a failed display/notification, or an ambiguous receipt does not authorize a retry.
- The Phase 9 control must not be retried. Its offline validation is complete; the exact next gate is the treatment decision in `docs/current-state.md`.
- Any Phase 9 treatment requires fresh exact approval and must remain on commit `c52d37077cbe6dfd1cb534ccddeb73e5d7c34b9d` so it stays comparable to the frozen control.
- Keep private evidence private. Checked-in docs and handoff summaries may report only the approved aggregate state or terminal classification.

### Approved frozen-execution procedure

The live-main preflight above is always completed first in the supervisory checkout. It prepares the decision but does not authorize the experiment.

Only after an exact treatment approval:

1. Identify the intended frozen execution checkout. It may be a previously preserved worktree or a new detached worktree created from the approved OID.
2. Independently verify its canonical `origin`, resolved path, clean worktree, and exact `HEAD`:

   ```bash
   repo_root="$(git rev-parse --show-toplevel)" || exit 1
   cd "$repo_root" || exit 1
   approved_sha='c52d37077cbe6dfd1cb534ccddeb73e5d7c34b9d'
   test "$(git rev-parse HEAD)" = "$approved_sha" || {
     printf '%s\n' 'stop: frozen execution checkout is not at the approved OID' >&2
     exit 1
   }
   case "$(git remote get-url origin)" in
     https://github.com/aa-on-ai/clawbotomy|https://github.com/aa-on-ai/clawbotomy.git|git@github.com:aa-on-ai/clawbotomy.git|ssh://git@github.com/aa-on-ai/clawbotomy.git) ;;
     *) printf '%s\n' 'stop: frozen execution checkout has the wrong origin' >&2; exit 1 ;;
   esac
   case "$(pwd -P)" in
     "$HOME/Documents/Codex"|"$HOME/Documents/Codex/"*)
       printf '%s\n' 'stop: frozen execution checkout is under ~/Documents/Codex' >&2
       exit 1
       ;;
   esac
   test -z "$(git status --porcelain=v1 --untracked-files=all)" || {
     printf '%s\n' 'stop: frozen execution checkout has unexpected changes' >&2
     exit 1
   }
   ```
3. Do not apply the live-main ancestry check to this lane. Exact approved OID equality is the stronger and correct gate for the frozen experiment.
4. Do not modify tracked files in the frozen execution checkout. Launch only the approved treatment, once, under the frozen runtime and request limits.

## 4. Source-of-truth precedence

When sources disagree, use this order and stop on unresolved conflicts:

1. **Live GitHub state plus locally validated receipts**
2. **Checked-in [`docs/current-state.md`](docs/current-state.md)**
3. **GBrain, session summaries, and old plans**

Do not let a stale workdir, cached remote ref, old project summary, or remembered approval override a higher-precedence source.
