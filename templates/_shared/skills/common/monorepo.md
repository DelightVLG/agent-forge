# Monorepo (pnpm workspaces)

Rules and patterns for managing a pnpm-based monorepo. Apply on top of
`conventions.md`.

## Rules

- **pnpm workspaces as the foundation.** Define all packages in
  `pnpm-workspace.yaml`. Never use `npm` or `yarn` in a pnpm monorepo.
- **Strict package boundaries.** Each package has its own `package.json`,
  `tsconfig.json`, and entry point. No reaching into another package's `src/` —
  import through the package name only.
- **Workspace protocol for internal deps.** Use `"@repo/shared": "workspace:*"`
  in `package.json`. Never use file paths or version numbers for local packages.
- **Shared packages in `packages/`.** Apps in `apps/`. Configuration packages
  (ESLint, TypeScript, Prettier configs) in `packages/config-*`.
- **Single lockfile at root.** Never run `pnpm install` inside a nested package.
  Always run from the repo root.
- **Filter commands to affected packages.** Use `pnpm --filter <pkg>` for
  targeted operations: `pnpm --filter @repo/backend dev`.
- **TypeScript project references** for cross-package type checking. Set
  `composite: true` in each package's `tsconfig.json` and reference dependencies
  in the consuming package.
- **Shared configs via `extends`.** ESLint, TypeScript, and Prettier
  configurations live in `packages/config-*` and are extended by each
  app/package.
- **Hoist only when necessary.** Default to `shamefully-hoist=false`. If a tool
  requires hoisting, document it in `.npmrc` with a comment.
- **Build in topological order.** Ensure the build script respects dependency
  order. Tools like Turbo or pnpm's `--workspace-concurrency` handle this.

## Patterns

### Repository structure

```
/
  pnpm-workspace.yaml
  package.json            # root scripts, devDependencies
  .npmrc
  turbo.json              # (optional) Turborepo config
  apps/
    backend/
      package.json
      tsconfig.json
      src/
    web/
      package.json
      tsconfig.json
      src/
    mobile/
      package.json
      tsconfig.json
      src/
  packages/
    shared/               # shared types, utils, DTOs
      package.json
      tsconfig.json
      src/
        index.ts          # barrel export
    config-typescript/
      base.json
      react.json
      node.json
    config-eslint/
      base.js
      react.js
      node.js
```

### pnpm-workspace.yaml

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### Workspace protocol in package.json

```json
{
  "name": "@repo/backend",
  "dependencies": {
    "@repo/shared": "workspace:*"
  }
}
```

### TypeScript project references

```json
// apps/backend/tsconfig.json
{
  "extends": "@repo/config-typescript/node.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "references": [{ "path": "../../packages/shared" }]
}
```

### Shared config package

```json
// packages/config-typescript/package.json
{
  "name": "@repo/config-typescript",
  "files": ["base.json", "react.json", "node.json"]
}
```

```json
// packages/config-typescript/base.json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### Root package.json scripts

```json
{
  "scripts": {
    "dev": "pnpm --filter @repo/backend dev & pnpm --filter @repo/web dev",
    "build": "pnpm -r --workspace-concurrency=4 build",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test",
    "clean": "pnpm -r exec rm -rf dist node_modules/.cache"
  }
}
```

### Turbo pipeline (optional)

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["build"]
    }
  }
}
```

## Anti-patterns

```json
// ❌ Reaching into another package's source
import { UserDto } from "../../packages/shared/src/dto/user";

// ✅ Import through package name
import { UserDto } from "@repo/shared";
```

```json
// ❌ Hardcoded version for internal dependency
{ "@repo/shared": "^1.0.0" }

// ✅ Workspace protocol
{ "@repo/shared": "workspace:*" }
```

```bash
# ❌ Installing inside a nested package
cd apps/backend && pnpm install

# ✅ Always install from root
pnpm install
pnpm --filter @repo/backend add express
```

```json
// ❌ Duplicated TypeScript config in every package
// apps/backend/tsconfig.json — 30 lines of compilerOptions
// apps/web/tsconfig.json — same 30 lines copy-pasted

// ✅ Shared config via extends
{ "extends": "@repo/config-typescript/node.json" }
```

```bash
# ❌ Building all packages when only one changed
pnpm -r build  # rebuilds everything

# ✅ Filtered build
pnpm --filter @repo/backend... build  # builds backend + its deps only
```

## Checklist

- [ ] `pnpm-workspace.yaml` lists all package directories
- [ ] Internal dependencies use `workspace:*` protocol
- [ ] Each package has its own `package.json` and `tsconfig.json`
- [ ] No cross-package `src/` imports — only through package names
- [ ] Shared configs in `packages/config-*`, extended by apps
- [ ] TypeScript project references configured for cross-package types
- [ ] Root scripts use `pnpm -r` or `pnpm --filter` for orchestration
- [ ] Single lockfile at root, no nested `pnpm install`
- [ ] Build order respects dependency topology
