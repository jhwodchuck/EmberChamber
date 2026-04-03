# Android Play Store Release

This document is the current Android release and Play deployment lane for `apps/mobile`.

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

## Release Workflows

GitHub Actions builds the signed release APK and release AAB from
[`.github/workflows/release-android.yml`](/home/jason/gh/PrivateMesh/.github/workflows/release-android.yml).

The workflow expects the release keystore secrets described in
[`docs/operator-playbook.md`](/home/jason/gh/PrivateMesh/docs/operator-playbook.md).

GitHub Actions can also upload a signed AAB to Google Play through
[`.github/workflows/deploy-play-store.yml`](/home/jason/gh/PrivateMesh/.github/workflows/deploy-play-store.yml).
That workflow is manual by design: the operator chooses the exact `ref`, track, rollout, and
release status instead of silently pushing every Android tag into Play Console.

The Play deployment workflow additionally expects the `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` GitHub
Actions secret described in [`docs/operator-playbook.md`](/home/jason/gh/PrivateMesh/docs/operator-playbook.md).

Run it from GitHub Actions or from the CLI, for example:

```bash
gh workflow run "Deploy - Android to Play Store" \
  --ref main \
  -f ref=v0.1.0-beta.8 \
  -f track=internal \
  -f release_status=completed \
  -f in_app_update_priority=2 \
  -f changes_not_sent_for_review=false \
  -f validate_only=false
```

Google Play still expects the app listing to exist first. The initial Play Console app creation and
first upload may still need to be done manually before API-based updates work reliably.

## Listing Guidance

- Position the app as invite-only messaging for trusted circles.
- Keep privacy language accurate: private email bootstrap, device-bound sessions, and current relay-hosted group flows.
- Do not describe the current Android group flow as fully end-to-end encrypted.
