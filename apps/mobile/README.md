# EmberChamber Mobile (Expo)

## Mobile screenshots in CI

GitHub Actions now captures mobile screenshots for both Android and iOS flows:

- `CI - Mobile` includes `android-screenshots` (emulator + `adb`).
- `Release - Apple Beta` captures iOS simulator screenshots with `xcrun simctl`.

### Approach chosen

- **Emulator + adb capture** (via `reactivecircus/android-emulator-runner`) was selected because this repo does not currently include Android instrumentation/UI-test scaffolding (Detox, Maestro, Espresso, etc.).
- This keeps implementation small while remaining reliable enough for CI artifact generation.
- The screenshot script (`apps/mobile/scripts/capture-android-screenshots.sh`) resolves the launcher activity dynamically and captures a stable first-screen image after app boot.

### How screenshots are generated

1. `expo prebuild` generates `apps/mobile/android`.
2. Gradle builds `app-debug.apk`.
3. CI boots a form-factor-specific API 34 emulator profile (`pixel_6`, `nexus_10`, `pixel_c`).
4. APK is installed and launched.
5. `adb shell screencap -p` writes PNG files to:
   - `apps/mobile/artifacts/android-screenshots/phone`
   - `apps/mobile/artifacts/android-screenshots/tablet`
   - `apps/mobile/artifacts/android-screenshots/chromebook`
6. Android CI captures **4 screenshots per form factor** (phone/tablet/chromebook).

### Artifacts

- Artifacts are uploaded from each CI run as:
  - `emberchamber-android-screenshots-phone-<run_number>`
  - `emberchamber-android-screenshots-tablet-<run_number>`
  - `emberchamber-android-screenshots-chromebook-<run_number>`
  - `emberchamber-ios-screenshots-<run_number>`
- Path in artifact:
  - `apps/mobile/artifacts/android-screenshots/<form-factor>/01-...png` through `04-...png`
  - `apps/mobile/artifacts/ios-screenshots/01-onboarding.png`

### Secrets and credentials

- No additional secrets are required for screenshot capture.
- Existing Play Store deploy credentials and workflow behavior remain unchanged.
- iOS screenshot capture does not require additional secrets.

### Tradeoffs / follow-ups

- Current capture is a **boot-screen screenshot** (reliable, low maintenance).
- If deeper flows are needed, next step is to add deterministic UI automation (e.g., Maestro or Espresso) and capture multiple named screens.
