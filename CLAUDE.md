# Agent Framework — Root Rules

This is a monorepo managed by Claude Code sub-agents. Read this file at the start of every session.

## Stack-agnostic

This template does **not** assume a stack. The real stack lives in `.agent-memory/project.md` after `/init-project` has been run. If that file is empty or missing, **stop and tell the user to run `/init-project` first**.

## Memory

Persistent context lives in `.agent-memory/`. Always consult it before planning or coding:

- @.agent-memory/project.md — stack, architecture, deploy, conventions (source of truth)
- @.agent-memory/session-log.md — what happened in recent sessions
- @.agent-memory/tasks/ — active task specs (one file per task)
- @.agent-memory/decisions/ — ADR-style decisions

After any meaningful action (task done, decision made, stack change), **update the relevant file**. Treat `.agent-memory/` as the project's long-term memory — if it's not written there, it's forgotten.

## Monorepo layout

```
apps/
  backend/   → see apps/backend/CLAUDE.md for BE-specific rules
  frontend/  → see apps/frontend/CLAUDE.md for FE-specific rules
```

Managed by **pnpm workspaces** (`pnpm-workspace.yaml`). Use `pnpm --filter <app>` to run app-scoped commands.

## Agents

| Agent | Model | Role |
|---|---|---|
| `project-manager` | opus | Decomposes features into tasks, writes task specs to `.agent-memory/tasks/` |
| `context-collector` | opus | One-time interview to populate `.agent-memory/project.md` |
| `backend-dev` | sonnet | Implements BE tasks + writes tests |
| `frontend-dev` | sonnet | Implements FE tasks + writes tests |
| `tester` | sonnet | Runs tests, reports failures (does **not** write tests) |
| `codex-reviewer` | sonnet | Shells out to `codex` CLI for external code review |

## Development flow

1. User describes a feature → `project-manager` asks clarifying questions, writes one or more task files to `.agent-memory/tasks/<id>-<slug>.md`, creates GitHub Issues via `gh issue create`.
2. User (or PM) dispatches a task to `backend-dev` or `frontend-dev`. Dev agent reads the task file, implements, **writes tests alongside code**, updates the task file status.
3. `tester` runs the relevant test suite (`pnpm --filter <app> test`) and reports.
4. `codex-reviewer` runs `codex exec` on the diff. Critical findings block the PR.
5. Dev agent addresses findings. Loop until clean.
6. Create PR via `gh pr create`. User gives final approval.

## Hard rules

- **Never** commit without running tests locally (lefthook `pre-push` enforces this).
- **Never** modify `.agent-memory/project.md` without explicit user confirmation — it's the source of truth.
- **Always** update the task file status as you work: `todo` → `in-progress` → `in-review` → `done`.
- **Always** write tests in the same PR as the code they cover.
- Use Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`).
- One task = one branch = one PR. Branch naming: `<type>/<task-id>-<slug>`.

## Commands

- `/init-project` — run context-collector (once per repo)
- `/plan <feature>` — PM decomposes into tasks
- `/implement <task-id>` — dispatch to dev agent
- `/review` — run codex on current diff
- `/status` — show active tasks
