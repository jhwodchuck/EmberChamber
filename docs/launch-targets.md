# EmberChamber Launch Targets

This file tracks what the repo can actually build and, where release lanes exist, distribute today.

## Current Buildable Surfaces

| Surface | Artifact | Backend path | Current product scope | Automation |
| --- | --- | --- | --- | --- |
| Android | Debug `.apk` from `apps/mobile` | Relay | Email bootstrap, sessions, privacy defaults, group invite preview/accept, relay-hosted group threads, attachment upload/download, local SQLite and SecureStore. | `.github/workflows/release-android.yml` |
| iPhone | Simulator `.app` zipped from `apps/mobile` | Relay | Same codebase and runtime scope as Android. No signed TestFlight or App Store lane yet, and not a first-beta commitment. | `.github/workflows/release-apple.yml` |
| Windows | `.exe` and `.msi` from `apps/desktop` | Relay | Bundled desktop shell for auth, groups, invites, sessions, privacy, and attachment sending. | `.github/workflows/release-windows.yml` |
| Ubuntu / Debian | `.deb` and `.AppImage` from `apps/desktop` | Relay | Bundled desktop shell for auth, groups, invites, sessions, privacy settings, and attachment sending. | `.github/workflows/release-linux.yml` |
| macOS | `.app` and `.dmg` from `apps/desktop` | Relay | Same bundled desktop shell as Windows/Linux, but signed distribution and launch commitment remain later work. | `.github/workflows/release-macos.yml` |
| Web | Next.js deployment from `apps/web` | Relay | Public site, onboarding, DM/chat, groups, invite flows, joined-space metadata search, and settings on relay. Legacy channel routes are retired placeholders only. | `.github/workflows/ci-web.yml` |

## What Counts As Primary Right Now

- Android, Windows, and Ubuntu are the active first-wave native surfaces.
- Web is intentionally available and still a real product surface, but it remains secondary to native for longer sessions and heavier media handling.
- iPhone and macOS build lanes exist, but neither is a committed first-beta launch surface.
- Native remains the preferred daily-use path for longer sessions and heavier media handling.
- Adults-only invite-gated onboarding is part of the current product contract across every committed surface.

## Release Workflow Reality

### Android

1. Install Node and Android toolchain dependencies.
2. Run Expo prebuild for Android.
3. Build a debug APK.
4. Upload the artifact and optionally attach it to a tagged GitHub Release.

### Apple mobile

1. Install Node dependencies on macOS.
2. Run Expo prebuild for iOS.
3. Build an unsigned simulator `.app`.
4. Zip and upload the artifact.

### Desktop

1. Install Node and Rust dependencies.
2. Build the bundled Tauri shell locally for the target OS.
3. Upload the generated bundles.

## Deferred Or Not Yet Productized

- Play Store, App Store, and TestFlight publishing
- Signed and notarized Apple desktop releases
- Code-signed Windows desktop releases
- Auto-update channels
- Later-beta community-room flows
- Final end-to-end encrypted group-history and attachment model

## Distribution Assumptions

- Beta remains invite-only.
- Android, Windows, and Ubuntu are the committed first-wave native surfaces.
- Web remains available for onboarding, messaging, invite review, search, settings, and recovery when a native build is unavailable or not preferred.
- iPhone and macOS are deferred until the first-wave surfaces are stable enough to justify the extra reliability and review work.
- Channel-style browser surfaces remain deferred, and they are not the target long-term beta architecture.

## Ubuntu Testing

- Use [`ubuntu-install-and-test.md`](/home/jason/gh/PrivateMesh/docs/ubuntu-install-and-test.md) for the current Linux release state, install path, local build commands, and smoke-test checklist.
