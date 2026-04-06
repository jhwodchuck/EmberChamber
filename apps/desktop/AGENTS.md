# apps/desktop Agent Guide

## Role

`apps/desktop` is the Tauri-based native desktop shell for macOS, Windows, and Linux packaging. Windows and Linux are the committed first-wave desktop surfaces; macOS remains a later-surface lane until the first wave is stable.

Desktop is a bundled local shell. Do not turn it back into a remote URL wrapper.

## Structure

- `shell/index.html`: bundled local frontend loaded by Tauri
- `src-tauri`: Rust application entry, packaging config, and capabilities
- `src-tauri/tauri.conf.json`: Tauri packaging and runtime configuration

`src-tauri` already depends on `emberchamber-core`. Shared runtime logic should move into Rust core or shared protocol code rather than being duplicated in shell code.

## Working Rules

- Keep the shell self-contained and compatible with local bundling
- Preserve current launch targets and packaging expectations for macOS, Windows, and Linux
- If desktop starts consuming new relay contracts, keep `../../packages/protocol` and `../../crates/relay-protocol` aligned
- Prefer `../../crates/core` for nontrivial secure-state or sync behavior

## Validation

- `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml`
- `npm run verify --workspace=apps/desktop` for shell runtime, packaging, or relay-bootstrap changes
- `npm run doctor --workspace=apps/desktop` when changing packaging or local toolchain assumptions without needing a full build
- When relay adoption, auth bootstrap, messaging, or Linux packaging changes, capture Ubuntu smoke evidence from `docs/ubuntu-install-and-test.md` when the environment is available
