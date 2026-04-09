#!/usr/bin/env bash
# Run the full dev cycle for a task: implement -> test -> review.
set -euo pipefail

TASK_ID="${1:-}"
if [ -z "$TASK_ID" ]; then
  echo "usage: $0 <task-id>" >&2
  exit 1
fi

TASK_FILE=$(ls .agent-memory/tasks/${TASK_ID}-*.md 2>/dev/null | head -1)
if [ -z "$TASK_FILE" ]; then
  echo "error: no task file for id $TASK_ID" >&2
  exit 1
fi

echo "Dispatching task $TASK_ID to Claude Code..."
claude "/implement $TASK_ID"
