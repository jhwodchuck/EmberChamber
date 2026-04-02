# EmberChamber Launch Targets

## First Beta Targets

| Platform | Target | Packaging path | Status in repo |
| --- | --- | --- | --- |
| Android | `.apk` | `apps/mobile` via Expo prebuild | Scaffolded |
| iPhone | `.app` (simulator) | `apps/mobile` via Expo prebuild | Scaffolded |
| Windows | `.exe`, `.msi` | `apps/desktop` via Tauri v2 | Scaffolded |
| Ubuntu / Debian | `.deb`, AppImage | `apps/desktop` via Tauri v2 | Scaffolded |
| macOS | `.dmg`, `.app` | `apps/desktop` via Tauri v2 | Scaffolded |

## Deferred Targets

No targets formally deferred at this time, other than broader non-goals.

## Beta Artifact Strategy

### Android

- real primary client
- built from `apps/mobile`
- uses email magic link onboarding
- local SQLite for conversation history
- SecureStore for small secret material

### iPhone

- shares the same Expo codebase as Android
- built from `apps/mobile` with `expo prebuild --platform ios`
- CI produces a simulator `.app` bundle (no code signing)
- TestFlight and App Store distribution require Apple Developer certificates and are a separate step

### macOS, Windows and Ubuntu

- companion native chat shell
- built from `apps/desktop`
- local bundled frontend, not a hosted remote wrapper
- intended to consume the same relay contracts and Rust core over time

### Web

- built from `apps/web`
- deployed as a Next.js app rather than packaged as a native artifact
- supports onboarding, messaging, search, invite review, settings, and lighter-weight channel use
- intentionally positioned as a secondary surface rather than the preferred primary client

## What the web app is now

`apps/web` is a real but secondary client surface. It is used for:

- beta positioning and download guidance
- invite landing pages
- auth bootstrap
- direct messages and lighter-weight chat use
- group creation and invite review
- search across accessible conversations, channels, and users
- channel reading and posting
- account recovery support
- privacy and session settings

## Android CI

The Android release lane now:

1. installs repo dependencies
2. runs Expo prebuild for Android
3. builds a debug APK from the generated Android project

This is a beta artifact lane, not a Play Store publishing lane yet.

## iOS CI

The iOS release lane now:

1. installs repo dependencies on a macOS runner
2. runs Expo prebuild for iOS
3. builds a simulator `.app` bundle via `xcodebuild` (no signing)
4. packages the artifact as a zip for GitHub Releases

This is a beta artifact lane. TestFlight distribution requires Apple Developer certificates and provisioning profiles.

## Desktop CI

The macOS, Windows, and Ubuntu release lanes now build the bundled Tauri desktop shell directly, without requiring a deployed web origin.

## Assumptions

- Beta is invite-only.
- Android and iPhone are the priority clients.
- macOS, Windows and Ubuntu matter for early adopters and operators.
- Web remains available when it is the fastest path, but native stays preferred for primary use.
