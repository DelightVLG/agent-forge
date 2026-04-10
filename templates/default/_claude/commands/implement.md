---
description: Dispatch a task to the appropriate dev agent (backend-dev, web-dev, or mobile-dev).
argument-hint: <task-id>
---

Read `.agent-memory/tasks/$ARGUMENTS-*.md`. Based on the `App:` field, delegate to the appropriate agent: `backend-dev`, `web-dev`, or `mobile-dev`. For `multiple`, dispatch in order: BE first, then web/mobile after BE lands.

After the dev agent reports done, automatically invoke the `tester` subagent. If tests pass, invoke `codex-reviewer`. Report the full chain result back to me.
