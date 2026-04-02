#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
build_arg="${1:-}"

bash "$ROOT_DIR/scripts/start-local-relay.sh" --screen

local_test_invite_token="$(bash "$ROOT_DIR/scripts/create-local-test-invite.sh")"

if [[ "$build_arg" == "--skip-build" ]]; then
  bash "$ROOT_DIR/scripts/install-ubuntu-desktop.sh" --skip-build
else
  bash "$ROOT_DIR/scripts/install-ubuntu-desktop.sh"
fi

cat <<EOF

Ubuntu local test lane is ready.

- Local relay: http://127.0.0.1:8787
- Detached relay session: screen -r ember-relay
- Desktop launcher: emberchamber-desktop
- Local test invite token: $local_test_invite_token

Recommended first-run path:

1. Launch EmberChamber.
2. Let the app adopt the local relay automatically.
3. Keep the prefilled local test invite token or paste a real group invite URL.
4. Enter any email-shaped value and confirm 18+.
5. Send magic link.
6. The completion token should appear in-app below the auth form.
7. Complete sign-in, create a group, and send the first message.
EOF
