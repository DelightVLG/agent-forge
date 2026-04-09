# Frontend App Rules

> This file is seeded by `context-collector` during `/init-project`. Until then, it only contains defaults.

## Stack

<filled by context-collector>

## Commands

- Install: `pnpm --filter frontend install`
- Dev: `pnpm --filter frontend dev`
- Test: `pnpm --filter frontend test`
- Lint: `pnpm --filter frontend lint`

## Skills

See `.claude/skills/frontend/` and `.claude/skills/common/`.

## Boundaries

Frontend code stays in this folder. Never import from `apps/backend/` — go through the HTTP API.
