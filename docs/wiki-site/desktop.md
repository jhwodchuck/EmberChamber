# Desktop App

`apps/desktop` is the Tauri desktop shell. It bundles a local HTML/JS frontend inside a native binary and talks directly to the relay for all authenticated flows.

## Supported Platforms

| Platform        | Artifact            | Status                                            |
| --------------- | ------------------- | ------------------------------------------------- |
| Windows         | `.exe`, `.msi`      | Active first-beta surface                         |
| Ubuntu / Debian | `.deb`, `.AppImage` | Active first-beta surface                         |
| macOS           | `.app`, `.dmg`      | Builds are wired; signed distribution is deferred |

## Current Capabilities

- Email magic-link bootstrap with explicit 18+ affirmation
- Session listing and self-revocation
- Group creation, invite management, invite preview/accept
- Relay-hosted group threads and attachment upload/download
- System keyring persistence for session auth state (with local-file fallback)
- Privacy settings via relay API

## Running Locally

### Ubuntu / Linux

Install the Tauri system dependencies first:

```bash
npm run install:desktop:ubuntu
```

Then start the dev server:

```bash
npm run dev:desktop
```

### Windows / macOS

Ensure Rust is installed (`rustup install stable`), then:

```bash
npm run dev:desktop
```

The Tauri shell opens with the bundled frontend pointed at the relay.

### Ubuntu Local Test Lane

The full local end-to-end smoke-test lane sets up a local relay, seeds an invite token, and installs the `.deb`:

```bash
npm run ubuntu:ready
```

After completion the desktop app auto-connects to the local relay and pre-fills the test invite token.

## Verifying the Desktop Build

Check that the Tauri shell compiles without errors:

```bash
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
```

Full dev build:

```bash
npm run build:desktop
```

## CI Release Builds

Triggered by version tags. Each platform uses a separate workflow:

| Platform        | Workflow                                |
| --------------- | --------------------------------------- |
| Ubuntu / Debian | `.github/workflows/release-linux.yml`   |
| Windows         | `.github/workflows/release-windows.yml` |
| macOS           | `.github/workflows/release-macos.yml`   |

Artifacts are attached to a GitHub Release.

## Repo Structure

```
apps/desktop/
  src-tauri/     Rust Tauri shell: main.rs, Cargo.toml, tauri.conf.json
  src/           Bundled local frontend (HTML/CSS/JS or framework source)
  shell/         Additional shell utilities
  package.json   Workspace manifest
```

## Diagnostics

```bash
npm run doctor:desktop
```

This runs Tauri's built-in diagnostics to check system dependencies and configuration.
