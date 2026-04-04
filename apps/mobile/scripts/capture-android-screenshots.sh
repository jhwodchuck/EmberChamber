#!/usr/bin/env bash
set -euo pipefail

OUTPUT_DIR="${1:-apps/mobile/artifacts/android-screenshots/phone}"
PACKAGE_NAME="${2:-com.emberchamber.mobile}"
DEVICE_CLASS="${3:-phone}"
WM_SIZE="${4:-1080x1920}"
WM_DENSITY="${5:-420}"
SCREEN_ORIENTATION="${6:-portrait}"

SCREEN_WIDTH="${WM_SIZE%x*}"
SCREEN_HEIGHT="${WM_SIZE#*x}"
WM_APPLY_SIZE="$WM_SIZE"
CENTER_X=$((SCREEN_WIDTH / 2))
SWIPE_START_Y=$((SCREEN_HEIGHT * 78 / 100))
SWIPE_MID_Y=$((SCREEN_HEIGHT * 47 / 100))
SWIPE_BOTTOM_Y=$((SCREEN_HEIGHT * 36 / 100))

mkdir -p "$OUTPUT_DIR"

reset_display() {
  adb shell wm size reset >/dev/null 2>&1 || true
  adb shell wm density reset >/dev/null 2>&1 || true
  adb shell wm user-rotation free >/dev/null 2>&1 || true
  adb shell settings delete system accelerometer_rotation >/dev/null 2>&1 || true
  adb shell settings delete system user_rotation >/dev/null 2>&1 || true
}

trap reset_display EXIT

adb wait-for-device

# Fresh emulators sometimes fail their first screencap request unless the
# compositor has already been exercised once.
adb shell screencap -p /sdcard/emberchamber-preflight.png >/dev/null 2>&1 || true
adb shell rm -f /sdcard/emberchamber-preflight.png >/dev/null 2>&1 || true

# Keep captures deterministic and reduce flakiness from transitions.
# Allow failures here — the settings service may not be ready immediately
# after sys.boot_completed on emulators, which is a known transient condition.
adb shell settings put global window_animation_scale 0 || true
adb shell settings put global transition_animation_scale 0 || true
adb shell settings put global animator_duration_scale 0 || true

# Wake and unlock if needed.
adb shell input keyevent KEYCODE_WAKEUP || true
adb shell wm dismiss-keyguard || true
adb shell input keyevent 82 || true

case "$SCREEN_ORIENTATION" in
  portrait)
    adb shell settings put system accelerometer_rotation 0 || true
    adb shell settings put system user_rotation 0 || true
    adb shell wm user-rotation lock 0 || true
    ;;
  landscape)
    # `wm size` uses the device's natural portrait coordinate space, so apply
    # the swapped dimensions when we want a landscape output.
    WM_APPLY_SIZE="${SCREEN_HEIGHT}x${SCREEN_WIDTH}"
    adb shell settings put system accelerometer_rotation 0 || true
    adb shell settings put system user_rotation 1 || true
    adb shell wm user-rotation lock 1 || true
    ;;
  *)
    echo "Unsupported orientation: $SCREEN_ORIENTATION" >&2
    exit 1
    ;;
esac

# Match Play Store form-factor sizing expectations.
adb shell wm size "$WM_APPLY_SIZE"
adb shell wm density "$WM_DENSITY"

adb shell input keyevent KEYCODE_HOME || true

LAUNCH_ACTIVITY="$(adb shell cmd package resolve-activity --brief "$PACKAGE_NAME" | tr -d '\r' | tail -n 1)"

if [[ -z "$LAUNCH_ACTIVITY" || "$LAUNCH_ACTIVITY" == "No activity found" ]]; then
  echo "Unable to resolve launcher activity for package: $PACKAGE_NAME" >&2
  exit 1
fi

adb shell am start -n "$LAUNCH_ACTIVITY" >/dev/null

# Wait for the launcher activity to actually become foregrounded. Some
# emulator/release combinations hang on `am start -W` even when the app has
# launched successfully, so keep this polling explicit and bounded.
for _ in $(seq 1 30); do
  CURRENT_FOCUS="$(adb shell dumpsys window windows | tr -d '\r' | grep -F 'mCurrentFocus=' || true)"
  if [[ "$CURRENT_FOCUS" == *"$PACKAGE_NAME"* ]]; then
    break
  fi
  sleep 1
done

# Wait for first render and async initialization after focus is acquired.
sleep 8

capture_png() {
  local target="$1"
  local remote_path="/sdcard/emberchamber-screencap.png"
  local attempt

  for attempt in 1 2 3; do
    if adb shell screencap -p "$remote_path" >/dev/null \
      && adb pull "$remote_path" "$target" >/dev/null; then
      adb shell rm -f "$remote_path" >/dev/null
      return 0
    fi

    adb shell rm -f "$remote_path" >/dev/null 2>&1 || true
    sleep 1
  done

  echo "Unable to capture screenshot after retries: $target" >&2
  exit 1
}

tap_text() {
  local target="$1"
  adb shell uiautomator dump /data/local/tmp/window_dump.xml >/dev/null
  adb pull /data/local/tmp/window_dump.xml "$OUTPUT_DIR/window_dump.xml" >/dev/null

  python3 - "$OUTPUT_DIR/window_dump.xml" "$target" <<'PY' | while read -r x y; do
import re
import sys

dump_path = sys.argv[1]
needle = sys.argv[2].lower()
xml = open(dump_path, encoding="utf-8").read()

pattern = re.compile(r'text="([^"]*)"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"')
for text, x1, y1, x2, y2 in pattern.findall(xml):
    if needle in text.lower():
        cx = (int(x1) + int(x2)) // 2
        cy = (int(y1) + int(y2)) // 2
        print(f"{cx} {cy}")
        break
PY
    adb shell input tap "$x" "$y"
    rm -f "$OUTPUT_DIR/window_dump.xml"
    return 0
  done

  rm -f "$OUTPUT_DIR/window_dump.xml"
  return 1
}

# Warm the compositor before the first artifact capture. Freshly booted
# emulators sometimes drop the first screencap request.
adb shell screencap -p /sdcard/emberchamber-warmup.png >/dev/null 2>&1 || true
adb shell rm -f /sdcard/emberchamber-warmup.png >/dev/null 2>&1 || true

capture_png "$OUTPUT_DIR/01-${DEVICE_CLASS}-onboarding-top.png"

tap_text "Add beta invite token" || true
sleep 2
capture_png "$OUTPUT_DIR/02-${DEVICE_CLASS}-invite-expanded.png"

adb shell input swipe "$CENTER_X" "$SWIPE_START_Y" "$CENTER_X" "$SWIPE_MID_Y" 450 || true
sleep 1
capture_png "$OUTPUT_DIR/03-${DEVICE_CLASS}-mid-form.png"

adb shell input swipe "$CENTER_X" "$SWIPE_START_Y" "$CENTER_X" "$SWIPE_BOTTOM_Y" 450 || true
sleep 1
capture_png "$OUTPUT_DIR/04-${DEVICE_CLASS}-bottom-form.png"

echo "Saved screenshots to $OUTPUT_DIR"
