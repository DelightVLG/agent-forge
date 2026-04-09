---
description: Dispatch a task to the appropriate dev agent (backend-dev or frontend-dev).
argument-hint: <task-id>
---

Read `.agent-memory/tasks/$ARGUMENTS-*.md`. Based on the `App:` field, delegate to `backend-dev` or `frontend-dev`. For `both`, dispatch BE first, then FE after BE lands.

After the dev agent reports done, automatically invoke the `tester` subagent. If tests pass, invoke `codex-reviewer`. Report the full chain result back to me.
