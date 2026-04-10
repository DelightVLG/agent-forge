# Web App Rules

> This file is seeded by `context-collector` during `/init-project`. Until then, it only contains defaults.

## Stack

<filled by context-collector>

## Commands

- Install: `pnpm --filter web install`
- Dev: `pnpm --filter web dev`
- Test: `pnpm --filter web test`
- Lint: `pnpm --filter web lint`

## Skills

See `.claude/skills/frontend/` and `.claude/skills/common/`.

## Boundaries

Web code stays in this folder. Never import from `apps/backend/` or `apps/mobile/` — go through the HTTP API or `packages/shared`.
