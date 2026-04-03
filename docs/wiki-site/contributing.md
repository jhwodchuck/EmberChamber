# Contributing

Thank you for helping build EmberChamber. This guide covers the key rules for contributing to the active beta runtime.

## Active Paths

Default to these paths for new work:

| Work type | Path |
|-----------|------|
| Relay auth, invites, mailbox, groups, attachments | `apps/relay` |
| Web UI, onboarding, invite landing, browser messaging | `apps/web` |
| Android and iPhone client | `apps/mobile` |
| Desktop shell and packaging | `apps/desktop`, `apps/desktop/src-tauri` |
| Shared secure-state logic | `crates/core` |
| Relay contract changes | `crates/relay-protocol` + `packages/protocol` (both) |

Legacy paths (`apps/api`, `infra/docker-compose.yml`, `services/*`) are not the target for new work. Only touch them if explicitly asked or if they block active builds.

## Before Opening a PR

Run the smallest relevant checks for the paths you changed:

```bash
# Protocol contracts
npm run build --workspace=packages/protocol

# Relay
npm run build --workspace=apps/relay
npm run test  --workspace=apps/relay

# Web
npm run lint  --workspace=apps/web
npm run build --workspace=apps/web

# Mobile
npm run type-check --workspace=apps/mobile

# Desktop shell
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml

# Rust core and relay-protocol
cargo test -p emberchamber-core -p emberchamber-relay-protocol
```

If you change protocol payload shapes or auth/session types, verify **both** the TypeScript and Rust sides.

## Product Constraints

Preserve the current beta direction. Do not reintroduce deprecated assumptions:

| ✅ Keep | ❌ Do not reintroduce |
|--------|----------------------|
| Invite-only access | Public sign-up |
| Adults-only 18+ affirmation | Removal of age gate |
| Email magic-link bootstrap | Phone-number identity |
| E2EE DMs via device mailbox | Server-readable DM history |
| Small groups ≤ 12 members (Phase 1) | Unlimited public groups in Phase 1 |
| Organizer/admin invite control | Free-for-all member invites in Phase 1 |
| Local-first device history | Server-side search over private messages |
| Pseudonymous identity | Google OAuth or phone-number identity |
| Disclosure-based reporting | Routine content moderation visibility into private messages |

## Code Style

- TypeScript everywhere in `apps/` and `packages/`.
- `prettier --write` is wired to `npm run format` at the repo root.
- ESLint config lives in `packages/config/eslint.js`.
- Rust: standard `rustfmt` formatting; run `cargo fmt` before pushing.

## Commit Messages

Use conventional commit prefixes where applicable:

```
feat: add encrypted attachment support to desktop
fix: handle mailbox ack timeout in DeviceMailboxDO
chore: bump vitepress in docs/wiki-site
docs: update relay API endpoint table
```

## Secrets and Credentials

- Never commit secrets, API keys, or keystore files to the repo.
- `.env` files are gitignored. Use `.env.example` as a template.
- The Android release keystore is gitignored. Manage it via GitHub Actions secrets.
- Cloudflare Worker secrets are managed via `wrangler secret put`.

## Wiki

This wiki lives in `docs/wiki-site/`. To add or edit a page:

1. Edit or create a `.md` file in `docs/wiki-site/`.
2. Update the sidebar in `docs/wiki-site/.vitepress/config.js` if adding a new page.
3. Preview locally with `npm run dev:wiki`.
4. Open a PR. The `deploy-wiki.yml` workflow publishes to GitHub Pages on merge to `main`.
