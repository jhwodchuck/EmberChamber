# Ubuntu Install And Test Guide

This guide is for contributors, testers, and maintainers using Ubuntu or another Debian-compatible Linux distro to install or verify the desktop shell.

## Five-Minute Local Path

If you want the fastest deterministic Ubuntu smoke-test lane on this repo, use:

```bash
npm run ubuntu:ready
```

That command:

- applies local relay migrations
- seeds a reusable real local beta invite token
- starts the local relay in a detached `screen` session named `ember-relay`
- tags that relay as the only localhost target the desktop app will auto-adopt
- builds the desktop package
- installs the latest desktop `.deb`

After it finishes:

1. Launch `emberchamber-desktop`.
2. Let the app adopt the local relay automatically.
3. Keep the prefilled `ubuntu-local-test-invite` token or paste a real group invite URL.
4. Enter any email-shaped value and confirm 18+.
5. Send magic link.
6. The completion token should appear in-app.
7. Complete sign-in, create a group, and send the first message.

## Current State

As of April 2, 2026, the latest public prerelease is `v0.1.0-beta.2`.

That release includes:

- `EmberChamber_0.1.0_amd64.deb`
- `EmberChamber_0.1.0_amd64.AppImage`

The Ubuntu desktop shell currently supports:

- email bootstrap and magic-link completion
- group and beta invite handling
- session review
- privacy settings
- relay-hosted group threads
- attachment upload and download, including photo send
- native desktop session persistence through the system keyring when available, with a restricted local-file fallback if the keyring is unavailable

Ubuntu is currently the most practical desktop release-verification lane in this repo because the Linux build workflow is live and public `.deb` and `.AppImage` assets already exist.

## Install Path

Public desktop builds are published through GitHub Releases:

- Latest releases: <https://github.com/jhwodchuck/EmberChamber/releases>

Recommended order:

1. Use the `.deb` first on Ubuntu or Debian.
2. Use the AppImage when you need a portable fallback or the `.deb` install path is blocked.

### `.deb` path

```bash
sudo dpkg -i EmberChamber_0.1.0_amd64.deb
sudo apt-get install -f
```

### `AppImage` path

```bash
chmod +x EmberChamber_0.1.0_amd64.AppImage
./EmberChamber_0.1.0_amd64.AppImage
```

## Local Build Path

The Linux release workflow currently installs these system packages:

```bash
sudo apt-get update
sudo apt-get install -y --no-install-recommends \
  libwebkit2gtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf \
  libssl-dev \
  pkg-config
```

From the repo root:

```bash
npm install
npm run doctor:desktop
npm run dev:desktop
```

To produce local desktop bundles:

```bash
npm run build:desktop
```

To run only the local relay in detached mode:

```bash
npm run relay:local:screen
```

To reseed the reusable local beta invite token explicitly:

```bash
npm run invite:local:test
```

To stop it later:

```bash
npm run relay:local:stop
```

Expected Linux bundle output:

- `target/release/bundle/deb/*.deb`
- `target/release/bundle/appimage/*.AppImage`

## Smoke Test Checklist

Run this checklist after installing a public build or creating a local bundle:

1. Launch the app and confirm the Ubuntu desktop MVP auth screen renders.
2. Paste a real group invite URL or use the reusable local beta invite token.
3. Complete the magic-link flow in-app.
4. Confirm the account lands in a usable overview or group thread.
5. Send the first photo from the desktop composer.
6. Review sessions and privacy settings from the same install.

## Known Limitations

- Desktop artifacts are not yet code-signed.
- Group threads in the current relay-native `/v1/groups/*` flow still store readable text in D1.
- Current attachment uploads are raw blobs in R2 rather than the final end-to-end encrypted attachment model.
- Linux desktop privacy defaults are better grounded now, but operating-system capture outside the app is still not fully preventable.
- iPhone and macOS remain later-surface work rather than first-beta commitments.
- Production first-run still depends on a valid invite plus real magic-link delivery, so the deterministic five-minute path today is the local relay lane rather than the hosted beta.

## Bug Report Inputs

When filing a Ubuntu desktop issue, include:

- Ubuntu version
- install path used: `.deb`, AppImage, or local build
- app version or Git tag
- relay URL if not using the default
- exact failing step
- screenshot or screen recording if available
- approximate UTC time of failure
