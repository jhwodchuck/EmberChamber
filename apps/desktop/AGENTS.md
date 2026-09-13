# apps/desktop Agent Guide

## Role

`apps/desktop` is the Tauri-based native desktop shell for macOS, Windows, and Linux packaging. Windows and Linux are the committed first-wave desktop surfaces; macOS remains a later-surface lane until the first wave is stable.

Desktop renders a **static export of `apps/web`'s authenticated workspace**, bundled at build time — not a hand-maintained separate frontend, and not a remote URL wrapper. See "Architecture" below.

## Architecture

Since 2026-07, desktop no longer has its own hand-rolled frontend. `apps/desktop/src-tauri/tauri.conf.json`'s `build.frontendDist` points at `../../web/out` — a static `next build` export of `apps/web` (`NEXT_OUTPUT=desktop`, see `apps/web/next.config.js` and the `build:desktop` script). `beforeBuildCommand`/`beforeDevCommand` build/serve that export automatically, so `apps/desktop`'s own build/dev scripts don't need to change.

This means:
- Desktop UI changes now happen in `apps/web`, not in this directory. Making desktop and web look/behave identically is no longer a manual-parity problem — it's the same code.
- `apps/web`'s dynamic routes (`/app/chat/[id]`, `/app/community/[id]`, `/app/channel/[id]`, `/invite/[[...segments]]`) are split into a thin server `page.tsx` (exports `generateStaticParams`, one placeholder param) plus a `page-client.tsx` ("use client", the real component). Desktop only ever reaches these via in-app client-side navigation, never a cold-start deep link or hard refresh mid-route — that's a known, accepted limitation, not a bug.
- Private key material and the relay session are **not** stored in browser `localStorage` on desktop. `apps/web/src/lib/secure-storage.ts` detects the Tauri IPC bridge (`globalThis.__TAURI_INTERNALS__`) and routes through the existing OS keyring-backed `load_secure_state`/`save_secure_state`/`clear_secure_state` Rust commands (`src-tauri/secure_state.rs`) instead. On the public web build this is a no-op passthrough to `localStorage`, unchanged.
- Desktop's relay URL is baked in at build time (same mechanism as the public web deployment: `NEXT_PUBLIC_RELAY_URL`), **plus** a runtime local-relay auto-detect: `apps/web/src/lib/secure-storage.ts`'s `detectLocalRelayOverride()` probes `http://127.0.0.1:8787/health` once at startup (desktop-only) and calls `apps/web/src/lib/relay.ts`'s `setRelayUrlOverride()` if a local relay answers. This is what lets `npm run ubuntu:ready` and local desktop dev work against a local relay without a rebuild. The previous shell also supported a *manual* relay-override setting (a text field to point at an arbitrary relay); that has not been reintroduced yet.
- `shell/index.html` and `shell/vendor/` (vendored tweetnacl/zxing copies) are removed. `apps/web` already depends on proper npm versions of both.

## Structure

| Path | Purpose |
| ---- | ------- |
| `src-tauri/` | Rust application entry, packaging config, capabilities |
| `src-tauri/main.rs` | Application entry point |
| `src-tauri/lib.rs` | Plugin/command registration; opens the window at `start.html` (the onboarding router), not `index.html` (the marketing homepage) |
| `src-tauri/secure_state.rs` | OS keyring-backed secure state (session + device key bundle), consumed by `apps/web/src/lib/secure-storage.ts` |
| `src-tauri/tauri.conf.json` | Tauri packaging and runtime configuration; `build.frontendDist` points at `apps/web`'s static export |
| `src-tauri/capabilities/` | Tauri command permission manifests |

`src-tauri` already depends on `emberchamber-core`. Shared runtime logic should move into Rust core or shared protocol code rather than being duplicated in `apps/web` or Rust glue.

## Working Rules

- Keep desktop a **bundled local build**, never a live remote URL wrapper — the static export is built and packaged at release time, not fetched from a server at runtime.
- UI, messaging, and workspace changes belong in `apps/web`. Only touch `apps/desktop` for Tauri packaging, native OS integration (keyring, notifications, tray, window chrome), or the `NEXT_OUTPUT=desktop` build wiring itself.
- If desktop starts consuming new relay contracts, keep `../../packages/protocol` and `../../crates/relay-protocol` aligned.
- Prefer `../../crates/core` for nontrivial secure-state or sync behavior.

## Validation

- `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml`
- `npm run build:desktop --workspace=apps/web` to verify the static export builds cleanly on its own (faster iteration than a full Tauri build)
- `npm run verify --workspace=apps/desktop` for shell runtime, packaging, or relay-bootstrap changes
- `npm run doctor --workspace=apps/desktop` when changing packaging or local toolchain assumptions without needing a full build
- When relay adoption, auth bootstrap, messaging, or Linux packaging changes, capture Ubuntu smoke evidence from `docs/ubuntu-install-and-test.md` when the environment is available

## Known Gaps From The 2026-07 Migration

- No automated screenshot/visual-regression coverage specific to the packaged desktop window (native chrome, OS compositor). The web screenshot suite covers the shared UI; see `docs/ci-screenshots.md`.
- No manual relay-override UI (the old shell had a settings field to point at an arbitrary relay; only build-time + local-auto-detect exist now).
- Native desktop notifications and tray behavior are not yet implemented on top of the new frontend.
- HiDPI/Linux packaging polish carried over from the old shell has not been re-audited against the new frontend.
