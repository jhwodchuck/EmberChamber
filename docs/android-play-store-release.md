# Android Play Store Release

This document is the current Android release lane for `apps/mobile`.

## Scope

- Invite-only Android client
- Email magic-link sign-in
- Adults-only 18+ affirmation
- Relay-hosted group threads
- Photo attachment upload and download
- Local session, privacy-default, and recent-thread cache on device

Do not claim the Android client already has the final end-to-end encrypted group-history or
attachment model. That rollout is still in progress across the repo.

## Public URLs

- Privacy policy: `https://emberchamber.com/privacy`
- Beta terms: `https://emberchamber.com/beta-terms`
- Trust and safety: `https://emberchamber.com/trust-and-safety`

## Store Assets

- App icon: [`brand/play_store/icon_512.png`](/home/jason/gh/PrivateMesh/brand/play_store/icon_512.png)
- Feature graphic: [`brand/play_store/feature_graphic_1024.jpg`](/home/jason/gh/PrivateMesh/brand/play_store/feature_graphic_1024.jpg)

## Local Verification

Run the Android-specific checks before uploading:

```bash
npm run type-check --workspace=apps/mobile
cd apps/mobile
npx expo-doctor
npm run prebuild
cd android
./gradlew assembleRelease bundleRelease
```

The signed outputs land in:

- `apps/mobile/android/app/build/outputs/apk/release/`
- `apps/mobile/android/app/build/outputs/bundle/release/`

## Release Workflow

GitHub Actions builds the signed release APK and release AAB from
[`.github/workflows/release-android.yml`](/home/jason/gh/PrivateMesh/.github/workflows/release-android.yml).

The workflow expects the release keystore secrets described in
[`docs/operator-playbook.md`](/home/jason/gh/PrivateMesh/docs/operator-playbook.md).

## Listing Guidance

- Position the app as invite-only messaging for trusted circles.
- Keep privacy language accurate: private email bootstrap, device-bound sessions, and current relay-hosted group flows.
- Do not describe the current Android group flow as fully end-to-end encrypted.
