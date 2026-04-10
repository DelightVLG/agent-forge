---
description: Run the context-collector agent to populate .agent-memory/project.md. Run once per repo.
---

Launch the `context-collector` subagent. It will interview me about this project's platforms, stack, architecture, deploy, and conventions, then write the results to `.agent-memory/project.md` and seed CLAUDE.md files for each selected app directory (`apps/backend/`, `apps/web/`, `apps/mobile/`).

Do not start asking questions yourself — delegate entirely to the subagent.
