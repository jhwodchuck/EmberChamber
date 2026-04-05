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

- Android:
  - `emberchamber-android-screenshots-phone-<run_number>`
  - `emberchamber-android-screenshots-tablet-<run_number>`
  - `emberchamber-android-screenshots-chromebook-<run_number>`
  - each artifact contains 4 screenshots (`01`-`04`) under `apps/mobile/artifacts/android-screenshots/<form-factor>/`
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

## Gallery publishing

Screenshots captured in CI are ephemeral GitHub Actions artifacts (14-day retention). The
`publish-screenshots.yml` workflow promotes them to a persistent location by:

1. Triggering automatically after any successful run of `CI - Mobile` or
   `CI - Relay and Companion Apps` on `main`.
2. Using `gh run download` to fetch the latest artifact from each CI workflow
   (not just the triggering one — always shows the latest from both).
3. Copying PNGs to `docs/wiki-site/public/screenshots/{platform}/` at canonical
   paths (overwriting in place on each publish).
4. Running `scripts/generate-screenshot-gallery.mjs` to regenerate
   `docs/wiki-site/screenshots.md` from whatever images are present.
5. Committing and pushing to `main`, which triggers `deploy-wiki.yml` to
   redeploy the VitePress wiki with the new images.

The gallery is accessible at the **Screenshots** page of the wiki. It can also be triggered
manually from the Actions tab (`workflow_dispatch`).

PNG files in `docs/wiki-site/public/screenshots/` are marked as binary in `.gitattributes`
to suppress spurious diff output. The `staging/` working directory used by the workflow is
gitignored.
