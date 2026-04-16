#!/usr/bin/env bash
# Captures Android Auto (AAOS emulator) screenshots of the EmberChamber
# Car App Library messaging UI. Runs inside the android-emulator-runner
# action on an android-automotive-playstore system image.
set -euo pipefail

OUTPUT_DIR="${1:-apps/mobile/artifacts/android-screenshots/auto}"
PACKAGE_NAME="${2:-com.emberchamber.mobile}"
DEVICE_CLASS="${3:-auto}"
WM_SIZE="${4:-1024x768}"
WM_DENSITY="${5:-160}"
SCREEN_ORIENTATION="${6:-landscape}"

mkdir -p "$OUTPUT_DIR"

adb wait-for-device

# Disable transition animations so captures are deterministic.
adb shell settings put global window_animation_scale 0 || true
adb shell settings put global transition_animation_scale 0 || true
adb shell settings put global animator_duration_scale 0 || true

# Wake and dismiss keyguard.
adb shell input keyevent KEYCODE_WAKEUP || true
adb shell wm dismiss-keyguard || true
adb shell input keyevent 82 || true

# AAOS uses fixed rotation; override density for Play Store sizing.
adb shell wm density "$WM_DENSITY" || true

capture_png() {
  local target="$1"
  local remote_path="/sdcard/emberchamber-auto-screencap.png"
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

  echo "::warning::Unable to capture screenshot after retries: $target" >&2
  return 1
}

tap_text() {
  local target="$1"
  adb shell uiautomator dump /data/local/tmp/window_dump.xml >/dev/null 2>&1 || return 1
  adb pull /data/local/tmp/window_dump.xml "$OUTPUT_DIR/window_dump.xml" >/dev/null 2>&1 || return 1

  python3 - "$OUTPUT_DIR/window_dump.xml" "$target" <<'PY' | while read -r x y; do
import re, sys
dump_path, needle = sys.argv[1], sys.argv[2].lower()
xml = open(dump_path, encoding="utf-8").read()
pattern = re.compile(r'text="([^"]*)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"')
for text, x1, y1, x2, y2 in pattern.findall(xml):
    if needle in text.lower():
        print(f"{(int(x1)+int(x2))//2} {(int(y1)+int(y2))//2}")
        break
PY
    adb shell input tap "$x" "$y"
    rm -f "$OUTPUT_DIR/window_dump.xml"
    return 0
  done

  rm -f "$OUTPUT_DIR/window_dump.xml" 2>/dev/null || true
  return 1
}

# Warm the compositor.
adb shell screencap -p /sdcard/emberchamber-auto-warmup.png >/dev/null 2>&1 || true
adb shell rm -f /sdcard/emberchamber-auto-warmup.png >/dev/null 2>&1 || true

# -------------------------------------------------------------------------
# Launch the app in the AAOS car launcher.
# On android-automotive-playstore images the car host mediates Car App Library
# services; we trigger it by starting the CarAppService directly through the
# system binding intent, then let the car host render the screens.
# -------------------------------------------------------------------------

# Ask the car host to bind our CarAppService via the MESSAGING category intent.
adb shell am startservice \
  --user 0 \
  -n "${PACKAGE_NAME}/com.emberchamber.mobile.auto.EmberCarAppService" \
  -a "androidx.car.app.CarAppService" \
  -c "androidx.car.app.category.MESSAGING" 2>/dev/null || true

# Fall back: open the AAOS launcher, find the app tile, tap it.
adb shell am start \
  -a android.intent.action.MAIN \
  -c android.intent.category.HOME \
  --activity-clear-top 2>/dev/null || true
sleep 3

capture_png "$OUTPUT_DIR/01-auto-home.png" || true

# Try tapping the EmberChamber tile in the car launcher.
tap_text "EmberChamber" || true
sleep 5

capture_png "$OUTPUT_DIR/02-auto-conversation-list.png" || true

# If a conversation row is visible, tap it to open the chat screen.
tap_text "Message" || true
sleep 3

capture_png "$OUTPUT_DIR/03-auto-chat-screen.png" || true

# Capture the voice reply button if present.
tap_text "Reply" || true
sleep 2

capture_png "$OUTPUT_DIR/04-auto-voice-reply.png" || true

echo "Saved Android Auto screenshots to $OUTPUT_DIR"
