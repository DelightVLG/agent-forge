#!/usr/bin/env bash
# Show all tasks grouped by status + current branch + open PRs.
set -euo pipefail

echo "=== Current branch ==="
git rev-parse --abbrev-ref HEAD
echo

echo "=== Tasks ==="
for f in .agent-memory/tasks/*.md; do
  [ -f "$f" ] || continue
  status=$(grep -m1 '^- \*\*Status:\*\*' "$f" | sed 's/.*Status:\*\* //')
  title=$(head -1 "$f" | sed 's/^# //')
  app=$(grep -m1 '^- \*\*App:\*\*' "$f" | sed 's/.*App:\*\* //')
  printf "  [%-12s] %-10s %s\n" "$status" "$app" "$title"
done
echo

echo "=== Open PRs ==="
command -v gh >/dev/null && gh pr list --author @me 2>/dev/null || echo "(gh not available)"
