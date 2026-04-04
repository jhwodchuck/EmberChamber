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
3. CI boots a Pixel 6 API 34 emulator.
4. APK is installed and launched.
5. `adb exec-out screencap -p` writes PNG files to `apps/mobile/artifacts/android-screenshots`.

### Artifacts

- Artifacts are uploaded from each CI run as:
  - `emberchamber-android-screenshots-<run_number>`
  - `emberchamber-ios-screenshots-<run_number>`
- Path in artifact:
  - `apps/mobile/artifacts/android-screenshots/01-onboarding.png`
  - `apps/mobile/artifacts/ios-screenshots/01-onboarding.png`

### Secrets and credentials

- No additional secrets are required for screenshot capture.
- Existing Play Store deploy credentials and workflow behavior remain unchanged.
- iOS screenshot capture does not require additional secrets.

### Tradeoffs / follow-ups

- Current capture is a **boot-screen screenshot** (reliable, low maintenance).
- If deeper flows are needed, next step is to add deterministic UI automation (e.g., Maestro or Espresso) and capture multiple named screens.
