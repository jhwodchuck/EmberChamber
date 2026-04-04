#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${1:-ci-signals}"
mkdir -p "$OUT_DIR"

run_and_capture() {
  local name="$1"
  shift
  local out="$OUT_DIR/$name.txt"
  echo "Running: $*"
  if "$@" >"$out" 2>&1; then
    echo "status=passed" > "$OUT_DIR/$name.status"
  else
    echo "status=failed" > "$OUT_DIR/$name.status"
  fi
}

if [ -f package.json ]; then
  run_and_capture npm_type_check npm run type-check
  run_and_capture npm_test npm test
fi

if [ -f Cargo.toml ]; then
  run_and_capture cargo_check cargo check -p emberchamber-core -p emberchamber-relay-protocol
fi

echo "Wrote CI signal outputs into $OUT_DIR"
