# Mobile App Rules

> This file is seeded by `context-collector` during `/init-project`. Until then, it only contains defaults.

## Stack

React Native + Expo

<filled by context-collector>

## Commands

- Install: `pnpm --filter mobile install`
- Start: `pnpm --filter mobile start`
- iOS: `pnpm --filter mobile ios`
- Android: `pnpm --filter mobile android`
- Test: `pnpm --filter mobile test`
- Lint: `pnpm --filter mobile lint`

## Skills

See `.claude/skills/mobile/` and `.claude/skills/common/`.

## Boundaries

Mobile code stays in this folder. Never import from `apps/backend/` or `apps/web/` — go through the HTTP API or `packages/shared`.

## Platform notes

- Always test on both iOS and Android unless the project targets only one.
- Use platform-specific files (`.ios.tsx`, `.android.tsx`) only when truly needed — prefer cross-platform code.
- Expo modules are preferred over bare React Native libraries where available.
