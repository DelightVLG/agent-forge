# Shared Conventions

Rules that apply to every file in every package. Follow them before any
framework-specific skill.

## Rules

- **Read neighbours first.** Before creating a new file, read 2-3 files in the
  same directory to absorb the local style (naming, imports order, export
  pattern).
- **No orphan TODOs.** Every `TODO` must reference an issue:
  `// TODO(#42): migrate to v2 API`. Remove the TODO when the issue is closed.
- **No commented-out code** in commits. Delete it; git keeps history.
- **No `console.log` / `print` debugging** left in committed code. Use the
  project logger (`logger.info`, `logger.debug`, etc.).
- **Secrets never in code.** Always environment variables, loaded via the
  mechanism defined in `project.md` (e.g. `@nestjs/config`, `dotenv`,
  `expo-constants`).
- **Errors are structured, not strings.** Throw typed error classes or return
  discriminated unions — never `throw new Error("something went wrong")`.
- **One export per file for major abstractions** (component, service, hook).
  Re-export from barrel `index.ts` only at package boundaries.
- **Imports order** (enforced by ESLint, but follow manually when no linter):
  1. Node built-ins (`node:fs`, `node:path`)
  2. External packages (`react`, `@nestjs/common`)
  3. Internal aliases (`@repo/shared`, `~/utils`)
  4. Relative imports (`./Button`, `../hooks`) Blank line between each group.
- **Naming:**
  - Files: `kebab-case.ts` (or `.tsx` for JSX).
  - Classes / types / interfaces: `PascalCase`.
  - Functions / variables / hooks: `camelCase`.
  - Constants / env vars: `UPPER_SNAKE_CASE`.
  - Database tables / columns: `snake_case`.
- **Prefer `const` over `let`; never use `var`.**
- **Prefer named exports** over default exports (easier to refactor, grep, and
  auto-import).
- **Keep functions short** — if a function exceeds ~40 lines, extract a helper
  or split the logic.

## Patterns

### Structured error

```typescript
// errors/app-error.ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Usage
throw new AppError('USER_NOT_FOUND', 'User does not exist', 404);
```

### Barrel re-export at package boundary

```typescript
// packages/shared/src/index.ts
export { AppError } from './errors/app-error';
export type { UserDto } from './dto/user.dto';
```

## Anti-patterns

```typescript
// ❌ Stringly-typed error
throw new Error('user not found');

// ✅ Structured error
throw new AppError('USER_NOT_FOUND', 'User does not exist', 404);
```

```typescript
// ❌ Leftover debug log
console.log('>>> data', data);

// ✅ Use project logger
logger.debug('Fetched data', { count: data.length });
```

```typescript
// ❌ Orphan TODO
// TODO: fix later

// ✅ Tracked TODO
// TODO(#128): switch to streaming API after backend supports it
```

## Checklist

- [ ] No `console.log` / `console.error` left (use logger)
- [ ] No commented-out code blocks
- [ ] Every TODO has an issue reference
- [ ] No secrets or API keys in source
- [ ] Imports follow the 4-group order
- [ ] Naming follows the conventions above
- [ ] New file matches the style of its neighbours
