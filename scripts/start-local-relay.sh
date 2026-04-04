#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELAY_DIR="$ROOT_DIR/apps/relay"
SESSION_NAME="${EMBERCHAMBER_RELAY_SESSION:-ember-relay}"
HOST="${EMBERCHAMBER_RELAY_HOST:-127.0.0.1}"
PORT="${EMBERCHAMBER_RELAY_PORT:-8787}"

EMAIL_ENCRYPTION_SECRET="${EMBERCHAMBER_EMAIL_ENCRYPTION_SECRET:-local-email-encryption-secret}"
EMAIL_INDEX_SECRET="${EMBERCHAMBER_EMAIL_INDEX_SECRET:-local-email-index-secret}"
ACCESS_TOKEN_SECRET="${EMBERCHAMBER_ACCESS_TOKEN_SECRET:-local-access-token-secret}"
REFRESH_TOKEN_SECRET="${EMBERCHAMBER_REFRESH_TOKEN_SECRET:-local-refresh-token-secret}"
ATTACHMENT_TOKEN_SECRET="${EMBERCHAMBER_ATTACHMENT_TOKEN_SECRET:-local-attachment-token-secret}"
LOCAL_AUTOCONNECT_MARKER="${EMBERCHAMBER_LOCAL_AUTOCONNECT_MARKER:-emberchamber-local-relay}"

mode="${1:-foreground}"

stop_relay() {
  if command -v screen >/dev/null 2>&1; then
    screen -S "$SESSION_NAME" -X quit >/dev/null 2>&1 || true
  fi

  pkill -f "wrangler dev --ip $HOST --port $PORT" >/dev/null 2>&1 || true
}

wait_for_health() {
  local attempts=0
  while (( attempts < 20 )); do
    if curl -fsS "http://$HOST:$PORT/health" >/dev/null 2>&1; then
      return 0
    fi
    attempts=$((attempts + 1))
    sleep 1
  done

  return 1
}

if [[ "$mode" == "--stop" ]]; then
  stop_relay
  echo "Local relay stopped."
  exit 0
fi

pushd "$RELAY_DIR" >/dev/null
npx wrangler d1 migrations apply emberchamber-relay-dev --local
popd >/dev/null

local_test_invite_token="$(bash "$ROOT_DIR/scripts/create-local-test-invite.sh")"
echo "Local test invite token: $local_test_invite_token"

dev_cmd=(
  npx wrangler dev
  --ip "$HOST"
  --port "$PORT"
  --show-interactive-dev-session=false
  --var "EMBERCHAMBER_EMAIL_ENCRYPTION_SECRET:$EMAIL_ENCRYPTION_SECRET"
  --var "EMBERCHAMBER_EMAIL_INDEX_SECRET:$EMAIL_INDEX_SECRET"
  --var "EMBERCHAMBER_ACCESS_TOKEN_SECRET:$ACCESS_TOKEN_SECRET"
  --var "EMBERCHAMBER_REFRESH_TOKEN_SECRET:$REFRESH_TOKEN_SECRET"
  --var "EMBERCHAMBER_ATTACHMENT_TOKEN_SECRET:$ATTACHMENT_TOKEN_SECRET"
  --var "EMBERCHAMBER_LOCAL_AUTOCONNECT_MARKER:$LOCAL_AUTOCONNECT_MARKER"
)

if [[ "$mode" == "--screen" ]]; then
  if ! command -v screen >/dev/null 2>&1; then
    echo "screen is required for --screen mode." >&2
    exit 1
  fi

  stop_relay

  quoted_dir="$(printf '%q' "$RELAY_DIR")"
  quoted_cmd="$(printf '%q ' "${dev_cmd[@]}")"
  screen -dmS "$SESSION_NAME" bash -lc "cd $quoted_dir && $quoted_cmd"

  if ! wait_for_health; then
    echo "Local relay failed to start on http://$HOST:$PORT." >&2
    exit 1
  fi

  echo "Local relay is ready at http://$HOST:$PORT."
  echo "Detached screen session: $SESSION_NAME"
  exit 0
fi

pushd "$RELAY_DIR" >/dev/null
exec "${dev_cmd[@]}"
