#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELAY_DIR="$ROOT_DIR/apps/relay"
DATABASE_NAME="${EMBERCHAMBER_RELAY_D1_NAME:-emberchamber-relay-dev}"
INVITE_TOKEN="${1:-${EMBERCHAMBER_LOCAL_TEST_INVITE_TOKEN:-ubuntu-local-test-invite}}"

hash_invite_token() {
  if command -v sha256sum >/dev/null 2>&1; then
    printf 'invite:%s' "$INVITE_TOKEN" | sha256sum | awk '{print $1}'
    return
  fi

  if command -v shasum >/dev/null 2>&1; then
    printf 'invite:%s' "$INVITE_TOKEN" | shasum -a 256 | awk '{print $1}'
    return
  fi

  printf 'invite:%s' "$INVITE_TOKEN" | openssl dgst -sha256 -r | awk '{print $1}'
}

created_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
token_hash="$(hash_invite_token)"
sql="INSERT OR REPLACE INTO beta_invites (token_hash, created_at, expires_at, max_uses, use_count, created_by, revoked_at) VALUES ('$token_hash', '$created_at', NULL, NULL, 0, 'local-ubuntu-test', NULL);"

pushd "$RELAY_DIR" >/dev/null
npx wrangler d1 migrations apply "$DATABASE_NAME" --local >/dev/null
npx wrangler d1 execute "$DATABASE_NAME" --local --command "$sql" >/dev/null
popd >/dev/null

printf '%s\n' "$INVITE_TOKEN"
