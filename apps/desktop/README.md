# @emberchamber/desktop

## Purpose

Tauri-based native desktop shell for Windows, Linux, and macOS packaging. Windows and Linux are the committed first-wave desktop surfaces; macOS remains a later-surface lane until the first wave is stable.

This is a **bundled local shell**, not a remote URL wrapper. The frontend lives in `shell/index.html` and is bundled at build time.

## Structure

| Path | Purpose |
| ---- | ------- |
| `shell/` | Bundled local frontend (HTML, JS, vendor) |
| `shell/index.html` | Main UI shell |
| `shell/vendor/` | Minified dependencies (tweetnacl, zxing-browser) |
| `src-tauri/` | Rust application entry, packaging config, capabilities |
| `src-tauri/main.rs` | Application entry point |
| `src-tauri/lib.rs` | Plugin and command registration |
| `src-tauri/secure_state.rs` | Secure state integration with `emberchamber-core` |
| `src-tauri/tauri.conf.json` | Tauri packaging and runtime configuration |
| `src-tauri/capabilities/` | Tauri command permission manifests |

## Responsibilities

- **Auth bootstrap**: Magic-link relay integration via Rust HTTP commands
- **Relay-first messaging**: Auth, adults-only affirmation, sessions, privacy, group invite flows, group messaging, attachment upload/download
- **Secure local state**: Session storage in system keyring (Keychain/keyring-rs) with file fallback
- **Packaging**: `.msi`/`.exe` (Windows), `.deb`/`.AppImage` (Ubuntu), `.dmg`/`.app` (macOS)

## Dependencies

- [`src-tauri` dependencies]:
  - `emberchamber-core` for secure-state and sync logic
  - `tauri` shell framework
  - `tauri-plugin-updater` for auto-update
  - `keyring` for platform-native credential storage

- [`shell` vendor]:
  - `tweetnacl.min.js` for cryptographic operations
  - `zxing-browser.min.js` for QR code scanning

## Environment

The shell reads relay configuration from `shell/config.js` at build time. Local development uses:

- `RELAY_URL`: Relay base URL (defaults to local)
- `WEB_URL`: Canonical public web origin

## Development

```bash
# First-time setup from repo root
npm run bootstrap

# Start dev shell
npm run dev --workspace=apps/desktop

# Or run full dev stack
npm run dev
```

## Verification

```bash
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
npm run verify --workspace=apps/desktop
npm run doctor --workspace=apps/desktop
```

## Packaging

```bash
# Build all targets
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

This seeds the local relay, installs prerequisites, and builds/packages the Ubuntu desktop app for smoke testing. See [`docs/ubuntu-install-and-test.md`](../docs/ubuntu-install-and-test.md) for details.

## Related

- Agent guide: [`AGENTS.md`](./AGENTS.md)
- [`../relay`](../../apps/relay): Backend API for auth, mailbox, groups, attachments
- [`../../crates/core`](../../crates/core): Shared Rust secure-state types
- [`../../docs/launch-targets.md`](../../docs/launch-targets.md): Build and distribution targets
- [`../../docs/ubuntu-install-and-test.md`](../../docs/ubuntu-install-and-test.md): Ubuntu smoke-test guide
