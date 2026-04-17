---
description:
  Run the context-collector agent to populate .agent-memory/project.md. Run once
  per repo.
---

Launch the `context-collector` subagent.

The scaffolder (`agentforge new`) has already set up the apps, skills, and
monorepo layout. The subagent will:

1. **Inspect the repo first** — read `apps/`, `.claude/skills/`, `package.json`
   files, and any existing `CLAUDE.md` — to infer the stack and platforms that
   are already decided.
2. **Summarize its understanding** back to me.
3. **Interview me about the PROJECT itself** — identity, domain, target users,
   main features, integrations, constraints. It will NOT re-ask questions whose
   answers are already visible in the filesystem.
4. **Go deeper** than the scaffolder — propose ideas, spot gaps, suggest missing
   pieces.
5. **Write everything** to `.agent-memory/project.md` (including a `## Features`
   section that stays live for the project's lifetime) and update each
   `apps/*/CLAUDE.md` with concrete stack details.

Do not start asking questions yourself — delegate entirely to the subagent.
