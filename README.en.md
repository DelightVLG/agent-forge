# agentforge

> [Русский](./README.md) · **English**

CLI that scaffolds a new project pre-wired for Claude Code sub-agent workflows (PM → dev → tester → reviewer), with a markdown-based memory layer in `.agent-memory/`.

Stack-agnostic: the template does not assume a backend/frontend stack. On first run inside the generated project, a one-time interview populates `.agent-memory/project.md` with the real stack.

## Install

```bash
# global
npm i -g @delightvlg/agent-forge
# or one-shot
pnpm create @delightvlg/agent-forge my-app
pnpm dlx @delightvlg/agent-forge new my-app
npx @delightvlg/agent-forge new my-app
```

## Usage

```bash
agentforge new my-app                     # interactive
agentforge new my-app --yes --no-install  # non-interactive, skip pnpm install
agentforge new my-app -t default          # pick template (only "default" for now)
```

Flags:

| Flag | Default | Description |
| --- | --- | --- |
| `-t, --template <name>` | `default` | Template to use (must exist in `templates/`). |
| `--git / --no-git` | prompt | `git init` inside the new project. |
| `--install / --no-install` | prompt | `pnpm install` inside the new project. |
| `-y, --yes` | `false` | Accept defaults; requires a project name as argument. |

After scaffolding:

```bash
cd my-app
pnpm install
claude           # open Claude Code
> /init-project  # context-collector will populate .agent-memory/project.md
```

## What you get

The `default` template creates a pnpm workspaces monorepo wired for Claude Code sub-agents:

```
.claude/
  agents/        project-manager, context-collector, backend-dev, frontend-dev, tester, codex-reviewer
  commands/      /init-project /plan /implement /review /status
  skills/        reusable guidance (common/backend/frontend)
  settings.json  tool permissions
.agent-memory/   long-term memory, git-tracked, read every session
  project.md     stack + conventions (filled by context-collector on first run)
  session-log.md append-only log
  tasks/         one file per task
  decisions/     ADR-style records
apps/
  backend/       CLAUDE.md for BE rules
  frontend/      CLAUDE.md for FE rules
scripts/         init-project.sh, dev-task.sh, review.sh, status.sh
CLAUDE.md        root rules
lefthook.yml     pre-commit (lint) + pre-push (tests + codex)
pnpm-workspace.yaml
```

Agents expect Claude Code CLI locally, `codex` CLI (OpenAI) for external review, and `gh` for GitHub Issues/PRs. No Claude API key is used — everything goes through the local Claude Code CLI.

## Development flow (in the generated project)

```
user idea
   │
   ▼
[project-manager / opus]    clarify → decompose → write task files → open GH Issues
   ▼
[backend-dev | frontend-dev / sonnet]   implement + write tests in the same change
   ▼
[tester / sonnet]           run suite → report pass/fail + AC coverage
   ▼
[codex-reviewer / sonnet]   shell out to `codex exec` on diff → APPROVE / REQUEST_CHANGES / BLOCK
   ▼
gh pr create                you review and merge
```

## Repo layout (this repository)

```
src/                CLI source (TypeScript, ESM)
  index.ts          commander entry
  commands/new.ts   `agentforge new`
  lib/              copy-template, render, paths
templates/
  default/          the scaffold — dotfiles stored as _name, templated files as *.hbs
dist/               built CLI (published to npm)
package.json        CLI manifest
tsup.config.ts      bundler config
```

### Template authoring rules

- Dotfiles are stored with a `_` prefix: `_claude/`, `_gitignore`. They are renamed back to `.name` on copy.
- Files with `.hbs` suffix are rendered with `{{projectName}}` substitution and lose the suffix: `package.json.hbs` → `package.json`.
- Plain files are copied byte-for-byte.

## Develop the CLI

```bash
pnpm install
pnpm dev new /tmp/smoke --yes --no-install --no-git  # run from source via tsx
pnpm build                                            # bundle to dist/
node dist/index.js new /tmp/smoke --yes --no-install --no-git
```

## License

MIT
