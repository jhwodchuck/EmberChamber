#!/usr/bin/env bash
set -euo pipefail

OUTPUT_DIR="${1:-apps/mobile/artifacts/android-screenshots}"
PACKAGE_NAME="${2:-com.emberchamber.mobile}"

mkdir -p "$OUTPUT_DIR"

adb wait-for-device

# Keep captures deterministic and reduce flakiness from transitions.
adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0

# Wake and unlock if needed.
adb shell input keyevent KEYCODE_WAKEUP || true
adb shell wm dismiss-keyguard || true
adb shell input keyevent 82 || true

LAUNCH_ACTIVITY="$(adb shell cmd package resolve-activity --brief "$PACKAGE_NAME" | tr -d '\r' | tail -n 1)"

if [[ -z "$LAUNCH_ACTIVITY" || "$LAUNCH_ACTIVITY" == "No activity found" ]]; then
  echo "Unable to resolve launcher activity for package: $PACKAGE_NAME" >&2
  exit 1
fi

adb shell am start -W -n "$LAUNCH_ACTIVITY"

# Wait for first render and async initialization.
sleep 12

adb exec-out screencap -p > "$OUTPUT_DIR/01-onboarding.png"

echo "Saved screenshots to $OUTPUT_DIR"
