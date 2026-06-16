# Release Checklist

Pre-release gate for any tagged artifact across active surfaces. Run the sections relevant to what changed. If all surfaces were touched, run the full checklist in order.

## Automated gates (run first)

```bash
# Protocol parity (Rust + TypeScript must agree)
npm test --workspace=packages/protocol
cargo test -p emberchamber-relay-protocol

# Relay
npm run build --workspace=apps/relay
npm test --workspace=apps/relay

# Web
npm run lint --workspace=apps/web
npm run build --workspace=apps/web

# Mobile type-check (builds protocol+shared+ui first)
npm run type-check --workspace=apps/mobile

# Desktop Rust surface
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml

# Repo contracts
npm run check:repo-contracts
```

All commands must exit zero. Do not tag or publish if any gate fails.

## Web smoke test

1. Relay is running locally (`npm run dev`).
2. Navigate to `/app` — conversation rail loads or shows the empty state.
3. Open a DM or group — messages load; trust badge in header reflects the correct mode (secure/hosted).
4. Send a message — it appears in the thread.
5. Send a message while offline — the send-error banner appears and the Retry link works.
6. Open `/app/new-dm` — search returns shared contacts; searching a nonexistent name shows the no-results panel.
7. Open `/app/search` — relay search returns results; a network error shows the error callout.
8. Open `/app/settings` — profile and privacy sections load; revoking a test session removes it.
9. Open `/app/discover` — invite explorer accepts a real invite link and renders the preview.
10. Open a device-encrypted conversation — the local session boundary notice appears at the top of the message list.
11. Verify no JS console errors on any of the above routes.

## Android smoke test

Preconditions: signed release APK from `release-android.yml` or local Expo build.

1. Install the APK on a fresh device or emulator.
2. Paste a valid beta invite link — preview renders with issuer, space, and scope.
3. Accept the invite, enter an email, confirm 18+, tap Send magic link.
4. Complete magic-link sign-in — lands in the conversation overview.
5. Open a group — send a text message and a photo attachment.
6. Go offline — send a message, confirm the failed-send bubble and retry affordance.
7. Check Settings → Sessions — current session is listed with a revoke option.
8. Check Settings → Privacy — defaults are populated and saveable.
9. Force-close and reopen — session persists; SecureStore roundtrip is clean.

## Windows smoke test

Preconditions: `.exe` or `.msi` from `release-windows.yml`.

1. Install and launch — auth screen renders with the EmberChamber shell.
2. Paste a beta invite or use the local relay lane if no hosted invite is available.
3. Complete magic-link sign-in.
4. Send a message in a group.
5. Upload a photo attachment — confirm it appears in the thread.
6. Open diagnostics — relay URL is correct; session list renders.
7. Sign out — returns to the auth screen with no persisted session.

## Ubuntu / Debian smoke test

The full lane is documented in [`ubuntu-install-and-test.md`](ubuntu-install-and-test.md). At minimum:

1. `npm run ubuntu:ready` — completes without error.
2. Launch `emberchamber-desktop`.
3. Run all 7 steps from the smoke test checklist in that doc.

For a release build, install the `.deb` artifact from the CI run, not the local bundle.

## Protocol change gate (when relay contracts changed)

If any file in `crates/relay-protocol/` or `packages/protocol/` was modified:

1. `npm test --workspace=packages/protocol` — parity-fixtures and double-ratchet tests pass.
2. `cargo test -p emberchamber-relay-protocol` — Rust side passes.
3. Confirm the relay, web, mobile, and desktop clients all updated their protocol imports.
4. Deploy the relay first, then clients (relay is the server; clients are the readers).

## GitHub Release

1. Confirm all automated gates passed on the release branch.
2. Create a tag (`git tag vX.Y.Z`) and push it — CI will build and upload artifacts.
3. Verify the release page has: Android APK and AAB, Windows `.exe` and `.msi`, Linux `.deb` and `.AppImage`.
4. Check artifact filesizes are in the expected range (large drops or gains indicate a bundling regression).
5. Pin the release notes: list breaking changes first, then new features, then known limitations.

## Deferred surfaces (do not hold release)

- iPhone: simulator artifact exists but TestFlight lane is not committed.
- macOS: build lane exists but signed distribution is deferred.

## Rollback

- Relay: Cloudflare Workers supports instant revert via the dashboard or `wrangler rollback`.
- Web: Vercel supports instant promotion of the previous deployment.
- Android: unpublish the release in Play Console or revert the GitHub Release tag; the previous APK remains available.
- Desktop: users can install the previous release artifact from GitHub Releases manually; auto-update is not yet wired.
