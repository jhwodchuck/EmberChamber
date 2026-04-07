#!/usr/bin/env bash
# Installs the project's Git hooks into .git/hooks/.
# Run automatically via the npm `prepare` lifecycle (npm install / npm ci).
# Safe to re-run; existing hooks are replaced only if they differ.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_SRC="$ROOT_DIR/scripts/git-hooks"
HOOKS_DST="$ROOT_DIR/.git/hooks"

if [[ ! -d "$HOOKS_DST" ]]; then
  echo "install-git-hooks: .git/hooks directory not found, skipping (not a git repo?)"
  exit 0
fi

for src in "$HOOKS_SRC"/*; do
  name="$(basename "$src")"
  dst="$HOOKS_DST/$name"
  if [[ ! -f "$dst" ]] || ! diff -q "$src" "$dst" >/dev/null 2>&1; then
    cp "$src" "$dst"
    chmod +x "$dst"
    echo "install-git-hooks: installed $name"
  fi
done

echo "install-git-hooks: done"
