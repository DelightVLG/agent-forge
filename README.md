<div align="center">

# Agent Forge

**Scaffold projects pre-wired for Claude Code multi-agent workflows**

[![npm](https://img.shields.io/npm/v/@delightvlg/agent-forge?color=CB3837&label=npm&logo=npm&logoColor=white)](https://www.npmjs.com/package/@delightvlg/agent-forge)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org)

> **English** ·
> [Русский](https://github.com/DelightVLG/agent-forge/blob/main/README.ru.md)

</div>

---

One command — and you get a ready-made monorepo with a team of AI agents: PM
plans, developer writes code, tester verifies, reviewer checks the diff.
Everything runs through the local Claude Code CLI, no API keys needed.

<div align="center">

![agentforge new demo](https://raw.githubusercontent.com/DelightVLG/agent-forge/main/demo.gif)

</div>

## ![Quick Start](https://img.shields.io/badge/Quick_Start-6C47FF?style=for-the-badge&logo=terminal&logoColor=white)

```bash
# Install globally
npm i -g @delightvlg/agent-forge

# Create a project (interactive mode)
agentforge new my-app

# Or without installing — via npx / pnpm
npx @delightvlg/agent-forge new my-app
pnpm dlx @delightvlg/agent-forge new my-app
```

```bash
cd my-app && pnpm install
claude                    # open Claude Code
> /init-project           # interview → fills in the stack and configures the project
```

## ![Skills](https://img.shields.io/badge/Interactive_Setup_&_Skills-8B5CF6?style=for-the-badge&logo=sparkles&logoColor=white)

When you run `agentforge new`, the CLI walks you through an interactive setup:

1. **Project structure** — choose which layers you need: backend, web, mobile.
   The CLI picks the right template automatically.
2. **Skill selection** — for each layer, pick the technologies and best
   practices your agents should know. Skills are `.md` instruction files that
   teach agents _how_ to write code for your specific stack.

### What are skills?

Skills are curated best-practice guides injected into `.claude/skills/`. Each
skill contains rules, patterns, and anti-patterns for a specific technology.
When an agent works on your code, it follows these instructions — resulting in
consistent, idiomatic, production-quality output.

<details>
<summary><b>Available skills (40+)</b></summary>

| Category     | Skills                                                                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Backend**  | NestJS, Express, TypeScript, PostgreSQL, Prisma, TypeORM, Drizzle, Redis, GraphQL, REST API, Backend Testing, BullMQ (Queues), S3 / Object Storage                             |
| **Frontend** | React, Next.js, Vite + React, Tailwind CSS, TypeScript, Zustand, React Query, React Hook Form + Zod, Frontend Testing, Accessibility, Component Design, Performance, Storybook |
| **Mobile**   | React Native, Expo, Expo Router, React Navigation, RN Testing Library, App Store / Google Play                                                                                 |
| **Common**   | Monorepo, Docker, CI/CD, Auth (JWT/OAuth2), Conventions, Git Flow, Security, Error Handling, Logging & Observability, Environment & Config                                     |

</details>

You can also add skills to an existing project at any time:

```bash
agentforge add skill prisma
```

> **With `--yes`** the CLI uses sensible defaults (no prompts). **With
> `-s nestjs,prisma,react`** you can pass skills explicitly.

---

## ![What's Inside](https://img.shields.io/badge/What's_Inside-1A1A2E?style=for-the-badge&logo=files&logoColor=white)

Agent Forge creates a **pnpm workspaces monorepo** with fully configured
infrastructure for AI-driven development:

<table>
<tr>
<td width="50%">

### Agents

| Agent                 | Role                             |
| --------------------- | -------------------------------- |
| **project-manager**   | Task decomposition, planning     |
| **context-collector** | Gathering stack and conventions  |
| **backend-dev**       | Backend development              |
| **web-dev**           | Web interface development        |
| **mobile-dev**        | Mobile app development           |
| **tester**            | Running tests, verifying AC      |
| **codex-reviewer**    | External review via OpenAI Codex |

</td>
<td width="50%">

### Structure

```
.claude/
  agents/       ← agent configs
  commands/     ← /plan /implement /review /status
  skills/       ← reusable instructions
.agent-memory/
  project.md    ← stack + conventions
  session-log.md
  tasks/        ← task = file
  decisions/    ← ADR records
apps/
  backend/      ← if backend is selected
  web/          ← if web is selected
  mobile/       ← if mobile is selected (Expo)
packages/
  shared/       ← shared types (web + mobile)
```

</td>
</tr>
</table>

> **Stack-agnostic:** the template doesn't impose a framework. On the first
> `/init-project` interview it determines the platforms and populates
> `.agent-memory/project.md` with the actual stack.

---

## ![Workflow](https://img.shields.io/badge/Development_Flow-16213E?style=for-the-badge&logo=workflow&logoColor=white)

After creating a project, the entire development process goes through a chain of
AI agents:

```
  ┌─────────────────┐
  │  Your idea       │
  └────────┬────────┘
           ▼
  ┌──────────────────────────────────────────────────┐
  │  Project Manager                        (opus)   │
  │  Clarifies requirements → decomposes into tasks  │
  │  → creates files in tasks/ → GitHub Issues       │
  └────────┬─────────────────────────────────────────┘
           ▼
  ┌──────────────────────────────────────────────────┐
  │  Dev Agent (backend / web / mobile)    (sonnet)  │
  │  Implements task + writes tests                  │
  └────────┬─────────────────────────────────────────┘
           ▼
  ┌──────────────────────────────────────────────────┐
  │  Tester                                (sonnet)  │
  │  Runs tests → pass/fail + AC coverage            │
  └────────┬─────────────────────────────────────────┘
           ▼
  ┌──────────────────────────────────────────────────┐
  │  Codex Reviewer                        (sonnet)  │
  │  Reviews diff → APPROVE / REQUEST_CHANGES        │
  └────────┬─────────────────────────────────────────┘
           ▼
  ┌───────────────────┐
  │  PR → You merge    │
  └───────────────────┘
```

---

## ![CLI](https://img.shields.io/badge/Commands_&_Flags-0A1628?style=for-the-badge&logo=gnubash&logoColor=white)

```bash
agentforge new <name>                     # interactive
agentforge new <name> --yes --no-install  # non-interactive
agentforge new <name> -t default          # pick a template
agentforge new <name> --lang en           # CLI language
```

| Flag                       |  Default  | Description                |
| -------------------------- | :-------: | -------------------------- |
| `-t, --template <name>`    | `default` | Project preset (see below) |
| `--git / --no-git`         |  prompts  | Initialize git             |
| `--install / --no-install` |  prompts  | Run `pnpm install`         |
| `-y, --yes`                |  `false`  | Accept all defaults        |
| `--lang <en\|ru>`          |   auto    | CLI interface language     |

Available `--template` presets: `default` (backend + web + mobile),
`backend-web`, `backend-mobile`, `web-mobile`, `backend-only`, `web-only`,
`mobile-only`, `minimal`. In interactive mode the CLI picks the preset for you
based on which platforms you enable — any combination is valid.

### Localization

The CLI detects language automatically: `--lang` flag → `AGENTFORGE_LANG` env
variable → system locale → English.

```bash
AGENTFORGE_LANG=ru agentforge new my-app   # via env
agentforge --lang ru new my-app            # via flag
```

---

## ![Dependencies](https://img.shields.io/badge/Dependencies-1B1F3B?style=for-the-badge&logo=dependabot&logoColor=white)

Agent Forge relies on:

- [**Claude Code CLI**](https://docs.anthropic.com/en/docs/claude-code) — the
  main agent engine
- [**Codex CLI**](https://github.com/openai/codex) _(optional)_ — external
  review
- [**gh CLI**](https://cli.github.com/) _(optional)_ — GitHub Issues / PR
  management

> No Claude API key needed — everything works through the local Claude Code.

---

## ![Contributing](https://img.shields.io/badge/Contributing-2D2D2D?style=for-the-badge&logo=github&logoColor=white)

<details>
<summary><b>CLI Development</b></summary>

```bash
pnpm install
pnpm dev new /tmp/smoke --yes --no-install --no-git   # run from source
pnpm build                                             # build to dist/
pnpm smoke                                             # E2E smoke test
```

</details>

<details>
<summary><b>Repository structure</b></summary>

```
src/                    CLI source (TypeScript, ESM)
  index.ts              entry point
  commands/new.ts       `agentforge new` command
  lib/                  copy-template, render, paths
  i18n/                 en.ts, ru.ts, index.ts
templates/
  _base/                shared root (CLAUDE.md.hbs, .claude/, .agent-memory/, scripts, configs)
  _apps/                one folder per platform (backend / web / mobile)
  _shared/              skills + agents copied into .claude/ on demand
  minimal/              self-contained minimal preset (no apps/)
packages/
  create-agent-forge/   package for `pnpm create`
scripts/
  smoke.mjs             E2E smoke test
```

Every platform-aware preset (`default`, `backend-web`, `backend-mobile`,
`web-mobile`, `backend-only`, `web-only`, `mobile-only`) is composed on the fly
from `_base` + the subset of `_apps/*` that was requested. The `minimal` preset
is kept as a separate tree because it ships a slightly different `package.json`
/ `lefthook.yml`.

</details>

---

<div align="center">

**MIT** · Made by [Sergey Kompanietc](https://github.com/DelightVLG)

</div>
