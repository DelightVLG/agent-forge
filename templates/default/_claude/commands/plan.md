---
description: Dispatch feature description to project-manager for decomposition into tasks + GitHub Issues.
argument-hint: <feature description>
---

Delegate to the `project-manager` subagent. The feature to plan:

$ARGUMENTS

The PM should ask clarifying questions, then write task files to `.agent-memory/tasks/` and create matching GitHub Issues via `gh`.
