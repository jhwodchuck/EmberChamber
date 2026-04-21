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

# Wait for the package manager to be fully ready.
# boot_completed=1 is set before the package manager service is stable;
# attempting adb install immediately produces "Broken pipe (32)".
echo "Waiting for package manager to be ready..."
for _pm_attempt in 1 2 3 4 5 6 7 8 9 10; do
  if adb shell pm list packages 2>/dev/null | grep -q "^package:"; then
    break
  fi
  sleep 5
done

# Retry the install — transient Broken pipe errors clear within a few seconds.
APK_INSTALLED=false
for _install_attempt in 1 2 3; do
  if adb install -r "$APK_PATH"; then
    APK_INSTALLED=true
    break
  fi
  echo "Install attempt ${_install_attempt} failed, retrying in 5s..."
  sleep 5
done

if [[ "$APK_INSTALLED" != "true" ]]; then
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
