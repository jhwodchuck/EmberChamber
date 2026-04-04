#!/usr/bin/env bash
set -euo pipefail

BASE_REF="${1:-main}"
HEAD_REF="${2:-HEAD}"

if [[ "$HEAD_REF" == "WORKTREE" ]]; then
  {
    git diff --name-only "$BASE_REF"
    git ls-files --others --exclude-standard
  } | sed '/^$/d' | sort -u > changed-files.txt
else
  git diff --name-only "$BASE_REF" "$HEAD_REF" | sed '/^$/d' > changed-files.txt
fi

{
  echo "# Changed Files"
  echo
  echo "Base: $BASE_REF"
  echo "Head: $HEAD_REF"
  echo
  cat changed-files.txt
} > changed-files.md

echo "Wrote changed-files.txt and changed-files.md"
