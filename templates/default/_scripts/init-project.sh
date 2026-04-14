#!/usr/bin/env bash
# Bootstrap a new project from this framework. Runs the context-collector interview.
set -euo pipefail

if ! command -v claude >/dev/null; then
  echo "error: claude CLI not found. Install Claude Code first." >&2
  exit 1
fi

if [ -s .agent-memory/project.md ] && grep -q "^## Identity" .agent-memory/project.md; then
  echo "project.md already initialized. Re-run anyway? [y/N]"
  read -r ans
  [ "$ans" = "y" ] || exit 0
fi

echo "Launching context-collector via Claude Code..."
claude "/init-project"
