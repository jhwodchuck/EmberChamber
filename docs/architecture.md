# EmberChamber Beta Architecture

This document tracks the active beta runtime in this repo. It separates current implementation
from target direction so the docs do not overstate privacy, platform maturity, or migration status.

## Runtime Map

| Runtime | Repo path | Current status | Notes |
| --- | --- | --- | --- |
| Mobile client | `apps/mobile` | Active | Expo client using relay APIs for bootstrap, adults-only affirmation, sessions, privacy, group invite flows, group threads, and attachment upload/download with local SQLite and SecureStore. |
| Desktop client | `apps/desktop` | Active | Tauri shell with bundled local HTML/JS UI. Talks directly to the relay for auth, adults-only affirmation, groups, invites, sessions, privacy, and attachments. |
| Web app | `apps/web` | Active | Relay-native for onboarding, adults-only affirmation, DMs, groups, settings, joined-space search, and invite preview/accept. Legacy channel pages are retired placeholders, not active backend dependencies. |
| Relay runtime | `apps/relay` | Active | Cloudflare Worker with D1, Durable Objects, R2, and queue bindings. |
| Shared contracts | `packages/protocol`, `crates/relay-protocol` | Active | Shared types for sessions, group flows, mailbox envelopes, device bundles, and attachments. |
| Rust core | `crates/core` | Partial | Present in repo and instantiated by desktop bootstrap, but not yet the primary engine behind every client flow. |
| Legacy prototype | `apps/api`, `infra/docker-compose.yml`, `services/*` | Retained | Older centralized Express/Postgres stack plus earlier Rust service scaffolds. Not the target beta runtime. |

## Relay Storage Planes

| Surface | Current implementation | Direction |
| --- | --- | --- |
| Auth and identity metadata | D1 stores blinded email indexes, encrypted email ciphertext, accounts, adults-only affirmation state, devices, sessions, invites, and reports. | Keep centralized metadata minimal and bounded to bootstrap, routing, and safety workflows. |
| Cipher mailbox queue | `DeviceMailboxDO` stores ciphertext envelopes written through `/v1/messages/batch`, enforces backlog caps, and deletes them on ack or expiry. | Mature the mailbox path into the default DM and future encrypted-group transport on every client. |
| Group threads | D1 `conversation_messages` stores group thread text in `body_text` plus attachment references. | Replace relay-hosted readable group history with a stronger end-to-end model. |
| Attachments | R2 stores uploaded bytes referenced by signed upload/download tickets. The browser DM path now supports client-encrypted uploads, while current mobile and desktop flows still upload raw file bytes. | Move every client to client-side attachment encryption before upload. |
| Client local state | Mobile persists SQLite, SecureStore, and vault metadata. Desktop persists local shell state. Web persists browser session state. | Push more authoritative history and safety state back onto devices over time. |

## Active Relay Capabilities

- Email magic-link bootstrap with invite-only account creation and optional group-invite bootstrap.
- Adults-only affirmation on bootstrap, with email kept private and non-discoverable.
- Session listing and self-revocation.
- Group creation, membership listing, owner or admin invite minting, invite preview/accept, and member removal.
- Relay-hosted group thread read/write APIs plus attachment ticketing.
- Device bundle registration, contact-card resolution, `dm/open`, ciphertext batch send, and mailbox sync/ack as the encrypted-delivery substrate.
- Disclosure-based report submission.

## Present but Not Finished

- Passkey endpoints exist but currently return `501`.
- Device-link start/confirm exists, but the full user-facing recovery and trusted-device flow is not complete.
- `PUSH_QUEUE` is provisioned in config but not yet consumed by worker code.
- The encrypted mailbox/device-bundle path now powers the browser DM flow, but the repo does not yet expose a fully migrated encrypted-group experience on top of it across every client surface.

## Current Client Surface Matrix

| Surface | Relay-native today | Still legacy or missing |
| --- | --- | --- |
| Android and iPhone | Bootstrap, adults-only affirmation, sessions, privacy defaults, contact card, device bundle registration, group invite preview/accept, group threads, attachment upload/download, local cache. | Real production key handling and final E2EE UX are still scaffolded rather than complete. |
| Desktop | Bootstrap, adults-only affirmation, sessions, privacy defaults, group creation, group invite management, invite preview/accept, group threads, attachment upload/download. | Passkeys, polished recovery, and deeper Rust-core integration are incomplete. |
| Web | Public site, invite landing, magic-link bootstrap, profile/privacy settings, relay-native DM/chat, joined-space metadata search, group creation, relay-hosted group threads, and invite preview/accept. | Encrypted-group rollout, universal encrypted attachments, and passkey/recovery maturity are still incomplete. |

## D1 Schema Summary

- Bootstrap and auth: `beta_invites`, `accounts`, `account_emails`, `auth_challenges`, `devices`, `sessions`, `passkeys`, `device_links`
- Conversations and membership: `conversations`, `conversation_members`, `conversation_invites`, `conversation_messages`, `blocks`
- Media and safety: `attachments`, `reports`

## Durable Objects and Queues

- `DeviceMailboxDO`: per-device ciphertext queue with backlog caps, ack-based deletion, and alarm-driven expiry.
- `GroupCoordinatorDO`: stores current group epoch and member set for relay-side coordination.
- `RateLimitDO`: keyed abuse limiter for auth, invite, and send flows.
- `EMAIL_QUEUE`: used for magic-link dispatch.
- `PUSH_QUEUE`: declared but not yet wired into runtime logic.
- `CLEANUP_QUEUE`: wired into runtime logic for retention cleanup work.

## Architectural Gaps To Close

- Finish the migration from relay-hosted readable group threads to an end-to-end encrypted group-history model.
- Add client-side attachment encryption before upload and document ciphertext retention precisely.
- Wire passkeys, safer recovery/device-link flows, and safety-number style change handling end to end.
- Finish the remaining removal of legacy `apps/api` dependencies outside retired placeholder routes and docs.
- Add automated cleanup for mailbox envelopes and expired attachment records.
