#!/usr/bin/env bash
set -euo pipefail

OUT="${1:-repo-facts.md}"

{
  echo "# Repo Facts"
  echo
  echo "Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo
  echo "## package.json signals"
  if [ -f package.json ]; then
    grep -n '"packageManager"' package.json || true
    grep -n '"workspaces"' package.json || true
    grep -n '"check:repo-contracts"' package.json || true
  else
    echo "package.json not found"
  fi
  echo
  echo "## Cargo workspace signals"
  if [ -f Cargo.toml ]; then
    grep -n 'members = \[' -n Cargo.toml || true
    grep -n 'services/' Cargo.toml || true
  else
    echo "Cargo.toml not found"
  fi
  echo
  echo "## repo-map ownership signals"
  if [ -f repo-map.yaml ]; then
    grep -n 'owner:' repo-map.yaml || true
    grep -n 'risk:' repo-map.yaml || true
    grep -n 'change_routes:' repo-map.yaml || true
  else
    echo "repo-map.yaml not found"
  fi
  echo
  echo "## Active runtime docs"
  for f in AGENTS.md README.md docs/architecture.md docs/launch-targets.md; do
    if [ -f "$f" ]; then
      echo "- found: $f"
    else
      echo "- missing: $f"
    fi
  done
  echo
  echo "## Workflow files"
  find .github/workflows -maxdepth 1 -type f 2>/dev/null | sort || true
} > "$OUT"

echo "Wrote $OUT"
