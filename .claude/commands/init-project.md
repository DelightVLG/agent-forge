---
description: Run the context-collector agent to populate .agent-memory/project.md. Run once per repo.
---

Launch the `context-collector` subagent. It will interview me about this project's stack, architecture, deploy, and conventions, then write the results to `.agent-memory/project.md` and seed `apps/backend/CLAUDE.md` and `apps/frontend/CLAUDE.md`.

Do not start asking questions yourself — delegate entirely to the subagent.
