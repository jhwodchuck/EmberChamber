# EmberChamber Mobile (Expo)

## Purpose

Shared Expo client for Android and iPhone. Android is the committed first-wave mobile surface; iPhone remains a later-surface lane that should stay in sync where practical.

## Structure

| Path | Purpose |
| ---- | ------- |
| `App.tsx` | Application scaffold and main UI flow logic |
| `assets/` | App icons and packaging assets |
| `app.json` | Expo app configuration and deep-link setup |

`App.tsx` contains most current behavior. If a feature grows materially, extract helpers or components instead of making the file denser.

## Responsibilities

- **Auth bootstrap**: Magic-link relay integration with invite handling
- **Relay-first messaging**: Auth, adults-only affirmation, sessions, privacy defaults, group invite preview/accept, device-encrypted group creation, legacy compatibility history, attachment upload/download
- **Local-first storage**: SQLite for message history, SecureStore for device secrets, vault metadata for attachments
- **Push notifications**: Android FCM token registration and encrypted token storage
- **Packaging**: Signed release `.apk`/`.aab` for Android, `.app` for iOS simulator

## Dependencies

- [`../../apps/relay`](../../apps/relay): Backend API for auth, mailbox, groups, attachments
- [`../../packages/protocol`](../../packages/protocol): TypeScript relay contract types

## Development

```bash
# From repo root - starts Expo dev server
npm run dev:mobile

# Verify
npm run verify --workspace=apps/mobile
npm run type-check --workspace=apps/mobile
```

## Verification

```bash
npm run verify --workspace=apps/mobile
npm run verify:android --workspace=apps/mobile
```

## Mobile screenshots in CI

GitHub Actions captures mobile screenshots for both Android and iOS flows:

- `CI - Mobile` includes `android-screenshots` (emulator + `adb`).
- `Release - Apple Beta` captures iOS simulator screenshots with `xcrun simctl`.

### Approach

- **Emulator + adb capture** (via `reactivecircus/android-emulator-runner`) was selected because this repo does not currently include Android instrumentation/UI-test scaffolding (Detox, Maestro, Espresso, etc.).
- This keeps implementation small while remaining reliable enough for CI artifact generation.

### How screenshots are generated

1. `expo prebuild` generates `apps/mobile/android`.
2. Gradle builds `app-debug.apk`.
3. CI boots a form-factor-specific API 34 emulator profile (`pixel_6`, `nexus_10`, `pixel_c`).
4. APK is installed and launched.
5. `adb shell screencap -p` writes PNG files to `apps/mobile/artifacts/android-screenshots/`.
6. Android CI captures **4 screenshots per form factor**.

### Artifacts

- `emberchamber-android-screenshots-phone-<run_number>`
- `emberchamber-android-screenshots-tablet-<run_number>`
- `emberchamber-android-screenshots-chromebook-<run_number>`
- `emberchamber-ios-screenshots-<run_number>`

## Related

- Agent guide: [`AGENTS.md`](./AGENTS.md)
- [`../relay`](../../apps/relay): Backend API
- [`../../docs/launch-targets.md`](../../docs/launch-targets.md): Build and distribution targets
- [`../../docs/android-fcm-setup.md`](../../docs/android-fcm-setup.md): Push notification setup
