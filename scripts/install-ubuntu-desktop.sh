#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
skip_build="false"

if [[ "${1:-}" == "--skip-build" ]]; then
  skip_build="true"
fi

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "Ubuntu desktop install only makes sense on Linux." >&2
  exit 1
fi

if ! command -v dpkg >/dev/null 2>&1; then
  echo "dpkg is required to install the desktop .deb." >&2
  exit 1
fi

pushd "$ROOT_DIR" >/dev/null

if [[ "$skip_build" != "true" ]]; then
  npm run doctor:desktop
  npm run build:desktop
fi

deb_path="$(find "$ROOT_DIR/target/release/bundle/deb" -maxdepth 1 -type f -name '*.deb' | sort | tail -n1)"

if [[ -z "$deb_path" ]]; then
  echo "No desktop .deb was found under target/release/bundle/deb." >&2
  exit 1
fi

sudo apt-get install -y "$deb_path"

echo "Installed desktop package from: $deb_path"
echo "Launch command: emberchamber-desktop"

popd >/dev/null
