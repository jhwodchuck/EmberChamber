# @emberchamber/desktop

## Purpose

Tauri-based native desktop shell for Windows, Linux, and macOS packaging. Windows and Linux are the committed first-wave desktop surfaces; macOS remains a later-surface lane until the first wave is stable.

This is a **bundled local build**, not a remote URL wrapper. Since 2026-07 the frontend is a static export of `apps/web`'s authenticated workspace, built at compile time and bundled with the installer exactly like the previous hand-rolled shell was — see [`AGENTS.md`](./AGENTS.md) for the full architecture writeup.

## Structure

| Path | Purpose |
| ---- | ------- |
| `src-tauri/` | Rust application entry, packaging config, capabilities |
| `src-tauri/main.rs` | Application entry point |
| `src-tauri/lib.rs` | Plugin and command registration; window opens at `apps/web`'s `/start` route |
| `src-tauri/secure_state.rs` | OS keyring-backed secure state, consumed by `apps/web/src/lib/secure-storage.ts` |
| `src-tauri/tauri.conf.json` | Tauri packaging/runtime config; `build.frontendDist` → `../../web/out` |
| `src-tauri/capabilities/` | Tauri command permission manifests |

The actual UI lives in [`../web`](../web) — see its README for its own structure.

## Responsibilities

- **Auth bootstrap**: Magic-link and passkey relay integration, same code as the web workspace
- **Relay-first messaging**: Auth, eligibility confirmation, sessions, privacy, group invite flows, group messaging, attachment upload/download
- **Secure local state**: Session and device key bundle storage in the system keyring (Keychain/Credential Manager/Secret Service via `keyring-rs`), with an encrypted-file fallback — see `src-tauri/secure_state.rs`
- **Packaging**: `.msi`/`.exe` (Windows), `.deb`/`.AppImage` (Ubuntu), `.dmg`/`.app` (macOS)

## Dependencies

- `src-tauri`:
  - `emberchamber-core` for secure-state and sync logic
  - `tauri` shell framework
  - `tauri-plugin-updater` for auto-update
  - `keyring` for platform-native credential storage
- Frontend: `apps/web`'s static export (`NEXT_OUTPUT=desktop`) — see [`../web/package.json`](../web/package.json)'s `build:desktop` script

## Environment

The desktop build bakes `NEXT_PUBLIC_RELAY_URL`/`NEXT_PUBLIC_WEB_URL` into the static export at
build time (same mechanism the public web deployment uses). Release builds set these to the
production relay/web origins (see `.github/workflows/reusable-release-desktop.yml`). At runtime,
desktop additionally auto-detects a local relay at `http://127.0.0.1:8787` (used by
`npm run ubuntu:ready` and local dev) without needing a rebuild — see
`apps/web/src/lib/secure-storage.ts`'s `detectLocalRelayOverride()`.

## Development

```bash
# First-time setup from repo root
npm run bootstrap

# Start dev shell (runs apps/web's Next dev server under the Tauri window for HMR)
npm run dev --workspace=apps/desktop

# Or run full dev stack
npm run dev
```

## Verification

```bash
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
npm run build:desktop --workspace=apps/web   # verify the static export alone, faster iteration
npm run verify --workspace=apps/desktop
npm run doctor --workspace=apps/desktop
```

## Packaging

```bash
# Build all targets (builds the apps/web static export first, via tauri.conf.json beforeBuildCommand)
npm run build --workspace=apps/desktop

# Platform-specific builds defined in .github/workflows:
# - release-windows.yml: .msi and .exe
# - release-linux.yml: .deb and AppImage
# - release-macos.yml: .dmg and .app
```

## Local Ubuntu Testing

```bash
npm run ubuntu:ready
```

This seeds the local relay, installs prerequisites, and builds/packages the Ubuntu desktop app for smoke testing. See [`docs/ubuntu-install-and-test.md`](../../docs/ubuntu-install-and-test.md) for details.

## Related

- Agent guide: [`AGENTS.md`](./AGENTS.md)
- [`../web`](../web): the frontend desktop now renders
- [`../relay`](../../apps/relay): Backend API for auth, mailbox, groups, attachments
- [`../../crates/core`](../../crates/core): Shared Rust secure-state types
- [`../../docs/launch-targets.md`](../../docs/launch-targets.md): Build and distribution targets
- [`../../docs/ubuntu-install-and-test.md`](../../docs/ubuntu-install-and-test.md): Ubuntu smoke-test guide
