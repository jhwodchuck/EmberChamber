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

# Wait for the 'cmd package' service to be ready.
# 'adb install' uses 'cmd package install' (streamed install) internally.
# On AAOS (android-automotive) this service registers in ServiceManager
# much later than sys.boot_completed=1 — sometimes 4+ minutes after boot.
# 'pm list packages' uses the PackageManager binder directly and becomes
# ready earlier, so it cannot be used as a readiness gate here.
echo "Waiting for cmd package service to be ready..."
_pm_ready=false
for _pm_attempt in $(seq 1 36); do
  if adb shell cmd package list packages 2>/dev/null | grep -q "^package:"; then
    _pm_ready=true
    break
  fi
  sleep 10
done
if [[ "$_pm_ready" != "true" ]]; then
  echo "::warning::cmd package service did not become ready for ${DEVICE_CLASS} (waited 360s), no screenshots will be captured"
  exit 0
fi

# Retry the install — the service may briefly reject connections right after
# it registers.
APK_INSTALLED=false
for _install_attempt in $(seq 1 6); do
  if adb install -r "$APK_PATH"; then
    APK_INSTALLED=true
    break
  fi
  echo "Install attempt ${_install_attempt} failed, retrying in 20s..."
  sleep 20
done

if [[ "$APK_INSTALLED" != "true" ]]; then
  echo "::warning::APK install failed for ${DEVICE_CLASS}, no screenshots will be captured"
  exit 0
fi

# Exercise the compositor once so the first real screencap does not fail.
# Use /data/local/tmp — always writable on all Android images including AAOS.
adb shell screencap -p /data/local/tmp/emberchamber-ci-warmup.png >/dev/null || true
adb shell rm -f /data/local/tmp/emberchamber-ci-warmup.png >/dev/null || true

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
