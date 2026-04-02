# EmberChamber Agent Guide

## Purpose

This repo is maintained primarily by AI agents. Keep repo guidance concrete, local, and up to date when the active runtime changes.

Read these docs before making broad product or architecture changes:

- `README.md`
- `docs/architecture.md`
- `docs/launch-targets.md`
- `docs/operator-playbook.md` for privacy, safety, abuse, and moderation language

## Active Beta Runtime

Default to these paths unless the user explicitly asks for legacy work:

- `apps/relay`: Cloudflare Worker relay and control plane
- `apps/web`: Next.js public site and secondary web workspace
- `apps/mobile`: Expo Android-first client with iPhone scaffolding still in repo
- `apps/desktop`: Tauri desktop shell with bundled local frontend
- `crates/core`: shared Rust secure-state scaffold
- `crates/relay-protocol`: canonical Rust relay contracts
- `packages/protocol`: TypeScript mirror of relay contracts

## Legacy Paths

These remain in the repo, but they are not the default place for new beta work:

- `apps/api`: legacy Express and Postgres prototype
- `infra/docker-compose.yml`: legacy centralized stack
- `services/*`: older Rust service scaffolds still in the Cargo workspace

Only change legacy paths when the user explicitly asks for them or when they block current builds.

## Routing Work

- Web UI, onboarding, invite landing, and browser messaging usually belong in `apps/web`
- Relay auth, invites, mailbox flows, group membership, and attachment handling belong in `apps/relay`
- Android and iPhone work belongs in `apps/mobile`
- Desktop shell and packaging work belongs in `apps/desktop` and `apps/desktop/src-tauri`
- Shared secure-state logic belongs in `crates/core`
- Relay contract changes usually require matching edits in `crates/relay-protocol` and `packages/protocol`

## Product Constraints

Preserve the current beta direction:

- invite-only access
- adults-only access with self-attested 18+ affirmation
- email magic-link bootstrap, with passkeys later
- E2EE direct messages and small groups
- organizer or admin invite control in phase 1
- local-first history on device
- web as a capable secondary surface, not the preferred primary client

Do not reintroduce deprecated product assumptions unless the user asks:

- centralized Telegram-like MVP behavior
- public-discovery-first growth loops
- server-side search over private message content
- phone-number identity
- anonymous, uncensorable, or law-proof positioning

## Verification Defaults

Run the smallest relevant checks for the paths you touch:

- protocol contracts: `npm run build --workspace=packages/protocol`
- relay: `npm run build --workspace=apps/relay` and `npm test --workspace=apps/relay`
- web: `npm run lint --workspace=apps/web` and `npm run build --workspace=apps/web`
- mobile: `npm run type-check --workspace=apps/mobile`
- desktop shell: `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml`
- shared Rust core and protocol: `cargo test -p emberchamber-core -p emberchamber-relay-protocol`

If you change protocol payloads or auth/session shapes, verify both the TypeScript and Rust sides.
