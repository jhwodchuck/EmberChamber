# PrivateMesh Launch Targets

## Artifact Matrix

| Platform | Artifact | Current packaging path | Notes |
| --- | --- | --- | --- |
| Windows | `.exe`, `.msi` | Tauri v2 native shell | Best fit for direct download installer |
| Ubuntu / Debian | `.deb`, AppImage | Tauri v2 native shell | `.deb` is primary, AppImage is portable fallback |
| Android | `.apk`, `.aab` | Tauri v2 mobile shell | `.apk` for direct install, `.aab` for Play Store |
| iPhone | `.ipa` | Tauri v2 mobile shell | Requires Xcode, provisioning profile, TestFlight/App Store review |
| macOS | `.dmg`, `.pkg` | Tauri v2 native shell | Requires signing and notarization |

## Current MVP Decision

PrivateMesh now has two client layers:

- `apps/web` is the canonical product UI and admin surface
- `apps/desktop` is a native Tauri shell that packages access to the deployed web app

This is the fastest credible path to shipping all five launch targets without rewriting the current product UI. It also keeps the backend, auth, realtime, and moderation stack shared across every platform.

For repo clarity:

- the current working product runtime is still `apps/api` + `apps/web`
- the Rust `services/` and `crates/` directories remain forward-looking scaffold work
- the desktop/mobile launch path is real today through `apps/desktop`

## Important Constraint

The native shell currently wraps the deployed PrivateMesh web client. It does not yet embed a fully offline-capable native UI. That means:

- the shell still depends on the hosted app environment
- mobile store review may require deeper native work if the wrapped experience is judged too web-only
- push, device APIs, and background behavior can be improved later without discarding the current web client

## Packaging Inputs

### Required for all native release builds

- Rust toolchain
- Node.js 20+
- `PRIVATEMESH_APP_URL` set to the deployed app origin

### Android

- Android SDK
- Android NDK
- JDK 17
- Play signing setup if shipping `.aab`

### Apple

- Apple Developer account
- Xcode 16+
- signing certificate
- provisioning profile for iPhone
- notarization credentials for macOS

## Recommended Release Flow

1. Build and deploy the web app and API.
2. Set `PRIVATEMESH_APP_URL` to the deployed app origin.
3. Build native artifacts from `apps/desktop`.
4. Sign platform artifacts.
5. Upload `.exe` / `.msi`, `.deb`, AppImage, `.apk`, `.aab`, `.ipa`, and `.dmg` through the appropriate channels.

## Post-MVP Path

- Keep Tauri for desktop if it performs well enough.
- Reassess mobile after beta feedback.
- If iPhone or Android store review, push behavior, or device integrations become limiting, add a dedicated `apps/mobile` React Native client while reusing the same API contracts and shared design tokens.
