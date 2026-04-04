#!/usr/bin/env bash
set -euo pipefail

APP_PATH="${1:?Usage: capture-ios-screenshots.sh <simulator-app-path> [output-dir] [bundle-id]}"
OUTPUT_DIR="${2:-apps/mobile/artifacts/ios-screenshots}"
BUNDLE_ID="${3:-com.emberchamber.mobile}"

mkdir -p "$OUTPUT_DIR"

if [[ ! -d "$APP_PATH" ]]; then
  echo "Simulator app path does not exist: $APP_PATH" >&2
  exit 1
fi

RUNTIME_ID="$({ xcrun simctl list runtimes available -j || true; } | python3 - <<'PY'
import json
import sys

data = json.load(sys.stdin)
runtimes = [r for r in data.get("runtimes", []) if r.get("isAvailable") and "iOS" in r.get("name", "")]
runtimes.sort(key=lambda r: r.get("version", "0"), reverse=True)
print(runtimes[0]["identifier"] if runtimes else "")
PY
)"

if [[ -z "$RUNTIME_ID" ]]; then
  echo "Unable to find an available iOS simulator runtime" >&2
  exit 1
fi

DEVICE_TYPE_ID="$({ xcrun simctl list devicetypes -j || true; } | python3 - <<'PY'
import json
import sys

data = json.load(sys.stdin)
for device in data.get("devicetypes", []):
    if device.get("identifier") == "com.apple.CoreSimulator.SimDeviceType.iPhone-16":
        print(device["identifier"])
        raise SystemExit
for device in data.get("devicetypes", []):
    if "iPhone" in device.get("name", ""):
        print(device["identifier"])
        raise SystemExit
print("")
PY
)"

if [[ -z "$DEVICE_TYPE_ID" ]]; then
  echo "Unable to find an iPhone simulator device type" >&2
  exit 1
fi

DEVICE_NAME="EmberChamber CI Screenshot"
UDID="$(xcrun simctl create "$DEVICE_NAME" "$DEVICE_TYPE_ID" "$RUNTIME_ID")"

cleanup() {
  xcrun simctl shutdown "$UDID" >/dev/null 2>&1 || true
  xcrun simctl delete "$UDID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

xcrun simctl boot "$UDID"
xcrun simctl bootstatus "$UDID" -b

xcrun simctl install "$UDID" "$APP_PATH"
xcrun simctl launch "$UDID" "$BUNDLE_ID"

sleep 10

xcrun simctl io "$UDID" screenshot "$OUTPUT_DIR/01-onboarding.png"

echo "Saved iOS screenshots to $OUTPUT_DIR"
