#!/usr/bin/env bash
set -euo pipefail

OUTPUT_DIR="${1:-apps/mobile/artifacts/android-screenshots/phone}"
PACKAGE_NAME="${2:-com.emberchamber.mobile}"
DEVICE_CLASS="${3:-phone}"
WM_SIZE="${4:-1080x1920}"
WM_DENSITY="${5:-420}"

mkdir -p "$OUTPUT_DIR"

adb wait-for-device

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

# Match Play Store form-factor sizing expectations.
adb shell wm size "$WM_SIZE"
adb shell wm density "$WM_DENSITY"
adb shell input keyevent KEYCODE_HOME || true

LAUNCH_ACTIVITY="$(adb shell cmd package resolve-activity --brief "$PACKAGE_NAME" | tr -d '\r' | tail -n 1)"

if [[ -z "$LAUNCH_ACTIVITY" || "$LAUNCH_ACTIVITY" == "No activity found" ]]; then
  echo "Unable to resolve launcher activity for package: $PACKAGE_NAME" >&2
  exit 1
fi

adb shell am start -W -n "$LAUNCH_ACTIVITY"

# Wait for first render and async initialization.
sleep 12

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

adb exec-out screencap -p > "$OUTPUT_DIR/01-${DEVICE_CLASS}-onboarding-top.png"

tap_text "Add beta invite token" || true
sleep 2
adb exec-out screencap -p > "$OUTPUT_DIR/02-${DEVICE_CLASS}-invite-expanded.png"

adb shell input swipe 540 1500 540 900 450 || true
sleep 1
adb exec-out screencap -p > "$OUTPUT_DIR/03-${DEVICE_CLASS}-mid-form.png"

adb shell input swipe 540 1500 540 700 450 || true
sleep 1
adb exec-out screencap -p > "$OUTPUT_DIR/04-${DEVICE_CLASS}-bottom-form.png"

echo "Saved screenshots to $OUTPUT_DIR"
