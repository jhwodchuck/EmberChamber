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

RUNTIMES_JSON="$(xcrun simctl list runtimes available -j || true)"
RUNTIME_ID="$(python3 -c '
import json
import sys

raw = sys.stdin.read().strip()
if not raw:
  print("")
  raise SystemExit

try:
  data = json.loads(raw)
except json.JSONDecodeError:
  print("")
  raise SystemExit

runtimes = [r for r in data.get("runtimes", []) if r.get("isAvailable") and "iOS" in r.get("name", "")]
runtimes.sort(key=lambda r: r.get("version", "0"), reverse=True)
print(runtimes[0]["identifier"] if runtimes else "")
' <<<"$RUNTIMES_JSON")"

if [[ -z "$RUNTIME_ID" ]]; then
  echo "Unable to find an available iOS simulator runtime" >&2
  exit 1
fi

DEVICE_TYPES_JSON="$(xcrun simctl list devicetypes -j || true)"
DEVICE_TYPE_ID="$(python3 -c '
import json
import sys

raw = sys.stdin.read().strip()
if not raw:
  print("")
  raise SystemExit

try:
  data = json.loads(raw)
except json.JSONDecodeError:
  print("")
  raise SystemExit

for device in data.get("devicetypes", []):
  if device.get("identifier") == "com.apple.CoreSimulator.SimDeviceType.iPhone-16":
    print(device["identifier"])
    raise SystemExit
for device in data.get("devicetypes", []):
  if "iPhone" in device.get("name", ""):
    print(device["identifier"])
    raise SystemExit
print("")
' <<<"$DEVICE_TYPES_JSON")"

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

# Wait for the React Native JS bundle to evaluate and the first screen to render.
# A Debug build on a cold CI simulator typically takes 30-60 s.  We poll every
# 8 s: once at least 2% of the middle 60% of the screen is brighter than the
# near-black splash / app background (#140d10 / #0d0809) we declare it ready.
echo "Waiting for app content to render..."
POLL_TMP="/tmp/ec_poll.png"
MAX_WAIT=120
POLL_INTERVAL=8
WAITED=0

sleep 20   # minimum — give Hermes time to start evaluating the bundle

while [[ $WAITED -lt $MAX_WAIT ]]; do
  xcrun simctl io "$UDID" screenshot "$POLL_TMP" 2>/dev/null || true
  READY=$(python3 -c "
from PIL import Image
import sys
img = Image.open('$POLL_TMP')
w, h = img.size
y0, y1 = int(h * 0.20), int(h * 0.80)
region = img.crop((0, y0, w, y1))
pixels = list(region.getdata())
bright = sum(1 for r,g,b,a in pixels if r > 40 or g > 40 or b > 40)
pct = bright / len(pixels) * 100
print('ready' if pct > 2.0 else 'loading')
" 2>/dev/null || echo "loading")

  if [[ "$READY" == "ready" ]]; then
    echo "App content detected (waited ~${WAITED}s total)."
    break
  fi

  echo "  content not yet visible (${WAITED}s elapsed), retrying in ${POLL_INTERVAL}s..."
  sleep "$POLL_INTERVAL"
  WAITED=$((WAITED + POLL_INTERVAL))
done

if [[ "$WAITED" -ge "$MAX_WAIT" ]]; then
  echo "WARNING: app may not have fully rendered after ${MAX_WAIT}s — screenshot may show a loading state." >&2
fi

sleep 2   # final settle before capture

xcrun simctl io "$UDID" screenshot "$OUTPUT_DIR/01-onboarding.png"

echo "Saved iOS screenshots to $OUTPUT_DIR"
