#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

copy_if_missing() {
  local source_path="$1"
  local destination_path="$2"
  local display_path="${destination_path#$ROOT_DIR/}"

  if [[ -f "$destination_path" ]]; then
    echo "Keeping existing $display_path."
    return
  fi

  cp "$source_path" "$destination_path"
  echo "Created $display_path from example."
}

pushd "$ROOT_DIR" >/dev/null
npm install --no-audit --no-fund
popd >/dev/null

copy_if_missing "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
copy_if_missing "$ROOT_DIR/apps/web/.env.example" "$ROOT_DIR/apps/web/.env.local"

pushd "$ROOT_DIR" >/dev/null
npm run build --workspace=packages/protocol
popd >/dev/null

local_test_invite_token="$(bash "$ROOT_DIR/scripts/create-local-test-invite.sh")"

printf '\nBootstrap complete.\n'
printf 'Local beta invite token: %s\n' "$local_test_invite_token"
printf 'Next steps:\n'
printf '  npm run dev\n'
printf '  npm run verify:all\n'
