# EmberChamber Launch Targets

## First Beta Targets

| Platform | Target | Packaging path | Status in repo |
| --- | --- | --- | --- |
| Android | `.apk` | `apps/mobile` via Expo prebuild | Scaffolded |
| Windows | `.exe`, `.msi` | `apps/desktop` via Tauri v2 | Scaffolded |
| Ubuntu / Debian | `.deb`, AppImage | `apps/desktop` via Tauri v2 | Scaffolded |

## Deferred Targets

| Platform | Reason for delay |
| --- | --- |
| iPhone | backgrounding, store review, and native reliability work still need a dedicated pass after Android stability |
| macOS | follows the Tauri desktop path later, but not required for the first closed beta |

## Beta Artifact Strategy

### Android

- real primary client
- built from `apps/mobile`
- uses email magic link onboarding
- local SQLite for conversation history
- SecureStore for small secret material

### Windows and Ubuntu

- companion native chat shell
- built from `apps/desktop`
- local bundled frontend, not a hosted remote wrapper
- intended to consume the same relay contracts and Rust core over time

## What the browser is now

`apps/web` is no longer a first-class chat client for launch. It is used for:

- beta positioning and download guidance
- invite landing pages
- auth bootstrap
- account recovery support

## Android CI

The Android release lane now:

1. installs repo dependencies
2. runs Expo prebuild for Android
3. builds a debug APK from the generated Android project

This is a beta artifact lane, not a Play Store publishing lane yet.

## Desktop CI

The Windows and Ubuntu release lanes now build the bundled Tauri desktop shell directly, without requiring a deployed web origin.

## Assumptions

- Beta is invite-only.
- Android is the priority client.
- Windows and Ubuntu matter for early adopters and operators.
- iPhone and macOS are explicitly phase 2, not silently broken promises.
