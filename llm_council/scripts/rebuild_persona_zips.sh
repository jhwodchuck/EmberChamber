#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COUNCIL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ZIP_DIR="$COUNCIL_DIR/persona-zips"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$ZIP_DIR"

for persona_path in "$COUNCIL_DIR"/personas/*.md; do
  persona_file="$(basename "$persona_path")"
  persona_name="${persona_file%.md}"
  bundle_dir="$TMP_DIR/$persona_name"
  mkdir -p "$bundle_dir/personas" "$bundle_dir/shared" "$bundle_dir/templates" "$bundle_dir/scripts"

  cp "$persona_path" "$bundle_dir/personas/"
  cp "$COUNCIL_DIR"/shared/*.md "$bundle_dir/shared/"
  cp "$COUNCIL_DIR"/templates/*.md "$bundle_dir/templates/"
  cp "$COUNCIL_DIR"/templates/*.yaml "$bundle_dir/templates/"
  cp "$COUNCIL_DIR"/scripts/*.sh "$bundle_dir/scripts/"
  cp "$COUNCIL_DIR"/scripts/*.py "$bundle_dir/scripts/"
  cp "$COUNCIL_DIR"/COUNCIL-OPERATING-MODEL.md "$bundle_dir/"
  cp "$COUNCIL_DIR"/EVIDENCE-PACK-SPEC.md "$bundle_dir/"
  cp "$COUNCIL_DIR"/ROUTING-MATRIX.md "$bundle_dir/"
  cp "$COUNCIL_DIR"/TOKEN-REDUCTION-STRATEGY.md "$bundle_dir/"

  (
    cd "$bundle_dir"
    zip -qr "$ZIP_DIR/$persona_name.zip" .
  )
done

echo "Rebuilt persona bundles in $ZIP_DIR"
