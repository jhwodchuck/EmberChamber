# EmberChamber Repo Grounding

This council kit is tailored to the current EmberChamber repo shape.
Review the product that exists in this repo now, not an older prototype and not an aspirational future state.

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
- `services/*`: archived Rust service scaffolds with standalone manifests, not part of the root Cargo workspace

## Product constraints

Preserve the current beta direction:

- invite-only access
- adults-only access with self-attested 18+ affirmation
- email magic-link bootstrap with passkeys later
- E2EE direct messages and new device-encrypted small groups
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

- migration from legacy relay-hosted group threads to the current device-encrypted group path
- attachment encryption and signed-upload parity across every client surface
- passkey, recovery, device-link, and safety-change handling maturity
- APNS and mobile background delivery maturity
- remaining cleanup of legacy `apps/api` assumptions
- cleanup and retention behavior for mailbox envelopes and expired attachment records

## Current implementation truths worth checking

- New DMs and new device-encrypted groups are expected to use the encrypted mailbox and device-bundle path across web, Android, and desktop.
- Legacy relay-hosted groups may still exist and must be described as migration state, not flattened into the primary privacy story.
- Public trust, privacy, and support copy must match current implementation boundaries, especially around relay visibility, group history, and attachment handling.
- Release state can drift by platform. Do not assume one universal latest build tag unless the artifacts actually line up.
- Web is a real secondary client surface, but it should not silently become the assumed primary client in copy or flow design.

## Reviewer hotspots by product flow

- invite -> adults-only affirmation -> magic-link bootstrap
- first DM, first group, and attachment send
- session, device, recovery, and passkey settings
- download and per-platform release guidance
- safety/reporting/disclosure flow and operator boundary language

## Toolchain signals

- Root `package.json` declares `packageManager: npm@10.9.7`
- Root workspace scripts and CI use `npm`
- `docs/wiki-site` remains the standalone `pnpm` surface
- Root Cargo work is centered on `crates/core` and `crates/relay-protocol`; `services/*` are archived legacy scaffolds
- CI exists for relay, web, desktop, and mobile verification plus screenshot capture

Reviewers should treat the active-vs-legacy boundary, mixed tooling surfaces, and public-claim precision as real repo risks.
