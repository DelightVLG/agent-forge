#!/usr/bin/env bash
# Run codex reviewer on the current branch diff.
set -euo pipefail

if ! command -v codex >/dev/null; then
  echo "error: codex CLI not found. Install OpenAI Codex CLI first." >&2
  exit 1
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" = "main" ]; then
  echo "error: on main, nothing to review" >&2
  exit 1
fi

git diff main...HEAD > /tmp/review-diff.patch
git diff main...HEAD --stat > /tmp/review-stat.txt

LINES=$(wc -l < /tmp/review-diff.patch)
echo "Diff: $LINES lines. Running codex..."

PROMPT_FILE=/tmp/review-prompt.txt
{
  echo "You are reviewing a pull request in a monorepo."
  echo
  echo "Project conventions:"
  cat .agent-memory/project.md 2>/dev/null || echo "(project.md missing)"
  echo
  echo "Diff stat:"
  cat /tmp/review-stat.txt
  echo
  echo "Full diff:"
  cat /tmp/review-diff.patch
  echo
  echo "Review for: correctness, security, convention violations, missing tests, performance."
  echo "Output: VERDICT: APPROVE|REQUEST_CHANGES|BLOCK, then CRITICAL/MAJOR/MINOR/NOTES sections."
} > "$PROMPT_FILE"

codex exec --skip-git-repo-check "$(cat $PROMPT_FILE)" | tee /tmp/review-result.txt
