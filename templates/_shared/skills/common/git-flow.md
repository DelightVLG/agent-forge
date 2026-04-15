# Git Flow

Rules for branch management, commits, and pull requests. Apply on every
repository scaffolded by Agent Forge.

## Rules

- **`main` is always deployable.** Never push broken code to `main`. All changes
  go through PRs with passing CI.
- **Feature branches from `main`.** No long-lived `develop` branch. Branch off
  `main`, merge back to `main`.
- **Branch naming: `<type>/<task-id>-<slug>`.** Types: `feat`, `fix`, `chore`,
  `docs`, `test`, `refactor`, `perf`. Example: `feat/012-user-login`,
  `fix/045-null-avatar`.
- **Conventional Commits always.** Format:
  `<type>(<scope>): <description> (#issue)`. Scope is the app or package name.
- **One logical change per commit.** Don't bundle a refactor with a feature.
  Don't mix formatting changes with logic changes.
- **Atomic commits.** Each commit should compile and pass tests. Never commit
  half-done work to a shared branch.
- **Rebase before merge.** Keep a linear history. Use `git rebase main` before
  opening a PR, not merge commits.
- **Squash only if all commits are noise.** If commit history is meaningful
  (step-by-step implementation), preserve it. Squash only WIP/fixup commits.
- **Never force-push to `main`.** Force-push to feature branches is acceptable
  after rebase.
- **Delete branch after merge.** Enable auto-delete in GitHub repository
  settings.
- **Tag releases.** Use semver tags: `v1.2.3`. Tag on `main` only.

## Patterns

### Branch lifecycle

```
main ──●──────────────●──── (always deployable)
        \            /
         ●──●──●──●──       feat/012-user-login
         │  │  │  │
         │  │  │  └─ test(backend): cover login edge cases (#12)
         │  │  └──── feat(backend): add refresh token rotation (#12)
         │  └─────── feat(backend): add /auth/login endpoint (#12)
         └────────── chore(backend): scaffold auth module (#12)
```

### Commit message examples

```
feat(backend): add /auth/login endpoint (#12)
fix(frontend): debounce search input to prevent API spam (#15)
test(backend): cover refresh-token rotation (#12)
refactor(shared): extract validation utils to @repo/shared (#20)
chore: update dependencies to latest stable
docs(backend): add OpenAPI descriptions for auth endpoints (#12)
perf(frontend): lazy-load dashboard charts (#25)
```

### PR template

```markdown
## What

Brief description of the change.

## Why

Link to task/issue: #12

## How

Key implementation decisions or trade-offs.

## Testing

- [ ] Unit tests added/updated
- [ ] Manual testing done
- [ ] CI passes
```

### Rebase workflow

```bash
# On feature branch, before opening PR
git fetch origin
git rebase origin/main

# If conflicts, resolve and continue
git add .
git rebase --continue

# Push (force is OK for feature branches)
git push --force-with-lease
```

## Anti-patterns

```bash
# ❌ Vague branch name
git checkout -b "new-feature"

# ✅ Descriptive with type and task ID
git checkout -b "feat/012-user-login"
```

```bash
# ❌ Vague commit message
git commit -m "fix stuff"
git commit -m "wip"
git commit -m "updates"

# ✅ Conventional commit with context
git commit -m "fix(backend): handle null avatar URL in user serializer (#45)"
```

```bash
# ❌ Mega-commit: refactor + feature + formatting
git add -A && git commit -m "feat: add login and refactor auth and fix formatting"

# ✅ Separate commits for separate concerns
git commit -m "refactor(backend): extract token service from auth service (#12)"
git commit -m "feat(backend): add /auth/login endpoint (#12)"
```

```bash
# ❌ Merge commit on feature branch
git merge main  # creates a merge commit, pollutes history

# ✅ Rebase to keep linear history
git rebase origin/main
```

## Checklist

- [ ] Branch name follows `<type>/<task-id>-<slug>` convention
- [ ] All commits use Conventional Commits format
- [ ] Each commit is atomic (compiles, tests pass)
- [ ] No mixed concerns in a single commit
- [ ] Branch rebased on `main` before PR
- [ ] PR title matches the primary commit summary
- [ ] PR body references the task/issue
- [ ] CI passes before requesting review
- [ ] Branch deleted after merge
