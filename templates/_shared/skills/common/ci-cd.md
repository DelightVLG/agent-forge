# CI/CD (GitHub Actions)

Rules and patterns for CI/CD pipelines with GitHub Actions. Apply on top of
`conventions.md`.

## Rules

- **Every PR must pass CI before merge.** Configure branch protection on `main`:
  require status checks, no direct pushes.
- **Fast feedback first.** Order jobs: lint → type-check → unit tests →
  integration tests → e2e tests → build → deploy. Fail fast on cheap checks.
- **Cache aggressively.** Cache pnpm store, Docker layers, Turbo cache. A cold
  CI run should be the exception, not the norm.
- **Pin action versions to SHA**, not tags. Use `actions/checkout@<sha>`, not
  `actions/checkout@v4`. Dependabot updates them safely.
- **Secrets in GitHub Secrets only.** Never hardcode tokens, keys, or passwords
  in workflow files. Use environment protection rules for production secrets.
- **One workflow per concern.** Separate CI (test/lint), deploy (staging/prod),
  and release workflows. Don't combine them into one mega-workflow.
- **Matrix builds for compatibility.** Test against multiple Node.js versions
  (e.g. 20, 22) if the package supports them.
- **Concurrency control.** Use `concurrency` to cancel in-progress runs when a
  new commit is pushed to the same PR. Don't waste minutes on stale runs.
- **Reusable workflows for shared logic.** Extract common patterns (setup, test,
  deploy) into `.github/workflows/reusable-*.yml` with `workflow_call`.
- **Artifacts for debugging.** Upload test reports, coverage, and build logs as
  artifacts. Set short retention (7 days) to avoid storage costs.

## Patterns

### CI workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@<sha>
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    strategy:
      matrix:
        node-version: [20, 22]
    steps:
      - uses: actions/checkout@<sha>

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@<sha>
        with:
          node-version: ${{ matrix.node-version }}
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm test -- --coverage

      - uses: actions/upload-artifact@<sha>
        if: always()
        with:
          name: coverage-node-${{ matrix.node-version }}
          path: coverage/
          retention-days: 7

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@<sha>

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@<sha>
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm build
```

### Deploy workflow with environments

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@<sha>
      - run: echo "Deploy to staging"
      # ... deploy steps using ${{ secrets.STAGING_URL }}

  deploy-production:
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment:
      name: production
      url: https://app.example.com
    steps:
      - uses: actions/checkout@<sha>
      - run: echo "Deploy to production"
      # ... deploy steps using ${{ secrets.PROD_URL }}
```

### Reusable setup workflow

```yaml
# .github/workflows/reusable-setup.yml
name: Setup Node + pnpm

on:
  workflow_call:
    inputs:
      node-version:
        type: string
        default: '22'

jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@<sha>
        with:
          node-version: ${{ inputs.node-version }}
          cache: pnpm

      - run: pnpm install --frozen-lockfile
```

### Docker build and push

```yaml
# .github/workflows/docker.yml
name: Docker

on:
  push:
    tags: ['v*']

jobs:
  build-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@<sha>

      - uses: docker/setup-buildx-action@<sha>

      - uses: docker/login-action@<sha>
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/build-push-action@<sha>
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.ref_name }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

## Anti-patterns

```yaml
# ❌ No concurrency control — stale runs waste CI minutes
on:
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest

# ✅ Cancel in-progress runs on new push
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

```yaml
# ❌ Floating action tag — vulnerable to supply chain attacks
- uses: actions/checkout@v4

# ✅ Pinned to commit SHA
- uses: actions/checkout@<sha>
```

```yaml
# ❌ Secret in workflow file
env:
  API_KEY: sk-1234567890

# ✅ Secret from GitHub Secrets
env:
  API_KEY: ${{ secrets.API_KEY }}
```

```yaml
# ❌ All checks run sequentially regardless of cost
jobs:
  everything:
    steps:
      - run: pnpm build      # slow
      - run: pnpm lint        # fast, should go first
      - run: pnpm test        # depends on nothing

# ✅ Fast checks first, parallel where possible
jobs:
  lint:
    steps: [pnpm lint]       # fast, fails early
  test:
    needs: lint
    steps: [pnpm test]
  build:
    needs: test
    steps: [pnpm build]
```

## Checklist

- [ ] Branch protection enabled on `main` with required status checks
- [ ] Jobs ordered fast → slow (lint → typecheck → test → build → deploy)
- [ ] `concurrency` configured to cancel stale PR runs
- [ ] pnpm store and build caches configured
- [ ] All action versions pinned to SHA
- [ ] Secrets stored in GitHub Secrets, not in workflow files
- [ ] Environment protection rules for production deployments
- [ ] Test coverage and reports uploaded as artifacts
- [ ] Matrix builds for supported Node.js versions
- [ ] Reusable workflows extracted for common setup steps
