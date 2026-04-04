# EmberChamber Repo Grounding

This council kit is tailored to the current EmberChamber repo shape.

## Active beta runtime

Default to these paths unless the task explicitly calls for legacy cleanup:

- `apps/relay`: Cloudflare Worker relay and control plane
- `apps/web`: Next.js public site and authenticated web workspace
- `apps/mobile`: Expo Android-first client with iPhone scaffolding still present
- `apps/desktop`: Tauri desktop shell with bundled local frontend
- `crates/core`: shared Rust secure-state scaffold
- `crates/relay-protocol`: canonical Rust relay contracts
- `packages/protocol`: TypeScript mirror of relay contracts

## Legacy or non-default paths

These remain in the repo but should not be treated as the default beta runtime:

- `apps/api`: legacy Express/Postgres prototype
- `infra/docker-compose.yml`: legacy centralized stack
- `services/*`: older Rust service scaffolds still in the Cargo workspace

## Product constraints

Preserve the current beta direction:

- invite-only access
- adults-only access with self-attested 18+ affirmation
- email magic-link bootstrap with passkeys later
- E2EE direct messages and small groups
- organizer/admin invite control in phase 1
- local-first history on device
- web as a capable secondary surface, not the preferred primary client

Avoid reintroducing deprecated assumptions unless explicitly requested:

- centralized Telegram-like MVP behavior
- public-discovery-first growth loops
- server-side search over private message content
- phone-number identity
- anonymous, uncensorable, or law-proof positioning

## Architectural gaps likely to matter in reviews

Treat these as high-interest areas:

- migration from relay-hosted readable group threads to stronger end-to-end encrypted group history
- client-side attachment encryption across every surface
- passkey, recovery, device-link, and safety-change handling maturity
- APNS and mobile background delivery maturity
- remaining cleanup of legacy `apps/api` assumptions
- cleanup and retention behavior for mailbox envelopes and expired attachment records

## Toolchain signals

- Root `package.json` declares `packageManager: pnpm@10.33.0`
- Many root scripts and CI flows still use `npm`
- Root Cargo workspace still includes `services/*` legacy members
- CI exists for relay/web/desktop and mobile verification plus screenshot capture

Reviewers should treat the active-vs-legacy boundary and mixed npm/pnpm signal as real AI-coder DX concerns.
