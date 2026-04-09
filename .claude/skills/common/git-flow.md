# Git Flow

## Branches
- `main` — always deployable
- Feature branches: `<type>/<task-id>-<slug>` e.g. `feat/012-user-login`
- Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`

## Commits
Conventional Commits, always. Scope is the app:
- `feat(backend): add /auth/login endpoint (#12)`
- `fix(frontend): debounce search input (#15)`
- `test(backend): cover refresh-token rotation (#12)`

One logical change per commit. Don't bundle refactor + feature.

## PRs
- Title = first commit summary
- Body references the task file and issue
- Never merge your own PR — wait for user approval
