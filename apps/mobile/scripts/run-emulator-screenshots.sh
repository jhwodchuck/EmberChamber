#!/usr/bin/env bash
# Wrapper called by reactivecircus/android-emulator-runner@v2.
# That action passes the `script:` field to `sh -c`, so only a single line is
# safe there.  All multi-line logic lives here instead.
set -euo pipefail

APK_PATH="${1:?APK_PATH required}"
DEVICE_CLASS="${2:-phone}"
WM_SIZE="${3:-1080x1920}"
WM_DENSITY="${4:-420}"
ORIENTATION="${5:-portrait}"

if ! adb install -r "$APK_PATH"; then
  echo "::warning::APK install failed for ${DEVICE_CLASS}, no screenshots will be captured"
  exit 0
fi

# Exercise the compositor once so the first real screencap does not fail.
adb shell screencap -p /sdcard/emberchamber-ci-warmup.png >/dev/null || true
adb shell rm -f /sdcard/emberchamber-ci-warmup.png >/dev/null || true

if [[ "$DEVICE_CLASS" == "auto" ]]; then
  bash "$(dirname "$0")/capture-auto-screenshots.sh" \
    "apps/mobile/artifacts/android-screenshots/${DEVICE_CLASS}" \
    "com.emberchamber.mobile" \
    "${DEVICE_CLASS}" \
    "${WM_SIZE}" \
    "${WM_DENSITY}" \
    "${ORIENTATION}" || true
else
  bash "$(dirname "$0")/capture-android-screenshots.sh" \
    "apps/mobile/artifacts/android-screenshots/${DEVICE_CLASS}" \
    "com.emberchamber.mobile" \
    "${DEVICE_CLASS}" \
    "${WM_SIZE}" \
    "${WM_DENSITY}" \
    "${ORIENTATION}" || true
fi
