# Agent Framework

Base monorepo for agent-driven development with Claude Code + OpenAI Codex CLI. Stack-agnostic — a one-time interview populates the real stack on first run.

## Stack

- **pnpm workspaces** monorepo (`apps/backend`, `apps/frontend`)
- **Claude Code** for planning, implementation, testing orchestration (subagents in `.claude/agents/`)
- **OpenAI Codex CLI** as external reviewer
- **GitHub Issues** as task tracker (via `gh` CLI)
- **lefthook** for local git hooks (no Claude API needed → no GH Actions for Claude)
- **Markdown** memory in `.agent-memory/` (git-tracked, human-readable, agent-writable)

## Prerequisites

```bash
# Required
claude --version      # Claude Code CLI
codex --version       # OpenAI Codex CLI
gh auth status        # GitHub CLI, authenticated
pnpm --version        # pnpm 9+
node --version        # Node 20+
```

## First-time setup

```bash
pnpm install                   # installs lefthook
pnpm exec lefthook install     # activate git hooks
./scripts/init-project.sh      # interview to populate .agent-memory/project.md
```

The interview (run by the `context-collector` subagent, Opus 4.6) asks about stack, architecture, deploy, conventions, and hard constraints. Answers are written to `.agent-memory/project.md` and `apps/*/CLAUDE.md`. **Agents refuse to work until this is done.**

## Daily flow

```bash
# 1. Plan a feature → PM decomposes into tasks + GitHub Issues
claude
> /plan Add passwordless email login

# 2. Dispatch a task → dev agent implements + writes tests,
#    tester runs suite, codex-reviewer reviews
> /implement 001

# 3. See what's in flight
./scripts/status.sh

# 4. Manual review on current branch
./scripts/review.sh

# 5. Create PR → you approve on GitHub
gh pr create
```

## Layout

```
.claude/
  agents/        subagents (project-manager, context-collector, backend-dev,
                 frontend-dev, tester, codex-reviewer)
  commands/      slash commands (/init-project, /plan, /implement, /review, /status)
  skills/        reusable guidance
    common/      git-flow, conventions, security-basics
    backend/     api-design, db-migrations, testing-be
    frontend/    component-design, a11y, testing-fe
  settings.json  tool permissions

.agent-memory/   long-term memory (git-tracked, always read before planning)
  project.md     stack + conventions, filled by context-collector
  session-log.md append-only log, newest on top
  tasks/         one file per task, status lifecycle
  decisions/     ADR-style records

apps/
  backend/       CLAUDE.md with BE rules (seeded by context-collector)
  frontend/      CLAUDE.md with FE rules (seeded by context-collector)

scripts/
  init-project.sh  bootstrap
  dev-task.sh      run full dev cycle for one task
  review.sh        codex review of current diff
  status.sh        tasks + branch + open PRs

CLAUDE.md        root rules (read every session)
lefthook.yml     pre-commit (lint) + pre-push (tests + codex)
```

## Development flow

```
user idea
   │
   ▼
[project-manager / opus]
   │  clarify → decompose → write task files → create GH Issues
   ▼
[backend-dev or frontend-dev / sonnet]
   │  implement + write tests in same change → update task log
   ▼
[tester / sonnet]
   │  run suite → report pass/fail + AC coverage
   ▼
[codex-reviewer / sonnet]
   │  shell out to `codex exec` on diff → APPROVE / REQUEST_CHANGES / BLOCK
   ▼
gh pr create  →  user reviews  →  user merges
```

## Memory model

Everything important is a markdown file in `.agent-memory/`. Agents read it at session start and append to it as they work. Nothing magical — just files, git-tracked, PR-reviewable.

If a piece of state needs structure beyond what markdown allows (e.g. you want a dashboard), add a `tasks.json` later. Start simple.

## Extending

- **New skill:** drop a file in `.claude/skills/{common,backend,frontend}/`. Agents pick it up via the CLAUDE.md pointer.
- **New agent:** add a file to `.claude/agents/` with frontmatter (`name`, `description`, `model`, `tools`).
- **New command:** add a file to `.claude/commands/`. Referenced as `/<filename>` in Claude Code.
- **New ADR:** write it to `.agent-memory/decisions/`.

## Notes

- Nothing in this repo requires the Claude API. All Claude calls go through the local Claude Code CLI.
- GitHub Actions can still run your own tests/deploys — just don't expect Claude to run inside them.
- `lefthook` pre-push runs tests and codex review locally as the safety net instead of CI-based Claude review.
