# CI Screenshot Automation

This repository now captures UI screenshots in GitHub Actions for the currently supported non-Android surfaces that are practical to run in hosted CI.

## Platforms detected from repo/workflows

- Android mobile (`apps/mobile`, `ci-mobile.yml`) — already implemented.
- iOS mobile scaffold (`apps/mobile`, `release-apple.yml`).
- Web companion (`apps/web`, `ci-web.yml`).
- Desktop shell UI (`apps/desktop/shell`, `ci-web.yml`) used by macOS/Windows/Linux Tauri packaging workflows.

## Chosen approach by platform

- **Android**: emulator + `adb screencap` in `CI - Mobile`.
- **iOS**: Xcode-built simulator app + `xcrun simctl io screenshot` in `Release - Apple Beta`.
- **Web**: Next.js production server + Playwright Chromium screenshots in `CI - Relay and Companion Apps`.
- **Desktop shell**: Playwright screenshot of `apps/desktop/shell/index.html` in `CI - Relay and Companion Apps`.

These choices prioritize reliability and low maintenance with the tooling already present in this repo.

## Artifact locations

- Android: `emberchamber-android-screenshots-<run_number>`
  - `apps/mobile/artifacts/android-screenshots/*.png`
- iOS: `emberchamber-ios-screenshots-<run_number>`
  - `apps/mobile/artifacts/ios-screenshots/*.png`
- Web: `emberchamber-web-screenshots-<run_number>`
  - `apps/web/artifacts/screenshots/*.png`
- Desktop shell: `emberchamber-desktop-screenshots-<run_number>`
  - `apps/desktop/artifacts/screenshots/*.png`

## Limitations / tradeoffs

- iOS screenshots currently run in the Apple build workflow (tags/manual dispatch), not in Linux CI.
- Desktop screenshots currently validate the shared shell UI HTML. Native window chrome and OS-specific compositor behavior are not captured yet.
- Future improvement path: add platform-native UI automation for deep in-app navigation and multi-screen captures per target.
