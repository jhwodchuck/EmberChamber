# EmberChamber Beta Architecture

This document tracks the active beta runtime in this repo. It separates current implementation
from target direction so the docs do not overstate privacy, platform maturity, or migration status.

## Runtime Map

| Runtime | Repo path | Current status | Notes |
| --- | --- | --- | --- |
| Mobile client | `apps/mobile` | Active | Expo client using relay APIs for bootstrap, adults-only affirmation, sessions, privacy, group invite flows, group threads, and attachment upload/download with local SQLite and SecureStore. |
| Desktop client | `apps/desktop` | Active | Tauri shell with bundled local HTML/JS UI. Talks directly to the relay for auth, adults-only affirmation, groups, invites, sessions, privacy, and attachments. |
| Web app | `apps/web` | Active | Relay-native for onboarding, adults-only affirmation, DMs, groups, community and room management, settings, joined-space search, and invite preview/accept. Legacy channel pages are retired placeholders, not active backend dependencies. |
| Relay runtime | `apps/relay` | Active | Cloudflare Worker with D1, Durable Objects, R2, and queue bindings. |
| Shared contracts | `packages/protocol`, `crates/relay-protocol` | Active | Shared types for sessions, group flows, mailbox envelopes, device bundles, and attachments. |
| Rust core | `crates/core` | Partial | Present in repo and instantiated by desktop bootstrap, but not yet the primary engine behind every client flow. |
| Legacy prototype | `apps/api`, `infra/docker-compose.yml`, `services/*` | Retained | Older centralized Express/Postgres stack plus archived Rust service scaffolds. Not the target beta runtime or the default root Cargo workspace. |

## Relay Storage Planes

| Surface | Current implementation | Direction |
| --- | --- | --- |
| Auth and identity metadata | D1 stores blinded email indexes, encrypted email ciphertext, accounts, adults-only affirmation state, devices, sessions, invites, and reports. | Keep centralized metadata minimal and bounded to bootstrap, routing, and safety workflows. |
| Cipher mailbox queue | `DeviceMailboxDO` stores ciphertext envelopes written through `/v1/messages/batch`, fans them out to connected device WebSockets, enforces backlog caps, and deletes them on ack or expiry. | Mature the mailbox path into the default DM and future encrypted-group transport on every client. |
| Group and community threads | New groups are created with `device_encrypted` history and mailbox delivery. Community containers, room threads, and legacy groups still use D1-backed relay-hosted history and attachment references. | Retire the remaining relay-hosted compatibility history and keep the encrypted path as the default. |
| Attachments | R2 stores uploaded bytes referenced by signed upload/download tickets. The browser DM path now supports client-encrypted uploads, while current mobile and desktop flows still upload raw file bytes. | Move every client to client-side attachment encryption before upload. |
| Client local state | Mobile persists SQLite, SecureStore, and vault metadata. Desktop now persists shell auth state in the system keyring when available, with a restricted local-file fallback. Web persists browser session state. | Push more authoritative history and safety state back onto devices over time. |

## Active Relay Capabilities

- Email magic-link bootstrap with invite-only account creation and optional group-invite bootstrap.
- Adults-only affirmation on bootstrap, with email kept private and non-discoverable.
- Session listing and self-revocation.
- Group creation, membership listing, owner or admin invite minting, invite preview/accept, and member removal.
- Community creation, room creation, restricted-room access, invite freeze policy, room-scoped invites, and community member removal.
- Device-encrypted group creation plus legacy relay-hosted group and room compatibility APIs, plus attachment ticketing.
- Device bundle registration, contact-card resolution, `dm/open`, ciphertext batch send, and mailbox sync/ack plus live mailbox WebSockets as the encrypted-delivery substrate.
- Disclosure-based report submission.

## Present but Not Finished

- Passkey endpoints exist but currently return `501`.
- Device-link start/confirm exists, but the full user-facing recovery and trusted-device flow is not complete.
- Android FCM token registration, encrypted token storage, and `PUSH_QUEUE` delivery are now wired for the mobile client, but production push still depends on deployed Cloudflare secrets plus Apple-side APNS work for iPhone.
- The encrypted mailbox/device-bundle path now powers the browser DM flow and new group creation in the relay runtime, but the repo does not yet expose a fully uniform encrypted-group and encrypted-attachment experience across every client surface.
- Community and room management currently live on the relay plus web companion surface; native parity for those organizer flows still remains later work.

## Current Client Surface Matrix

| Surface | Relay-native today | Still legacy or missing |
| --- | --- | --- |
| Android and iPhone | Bootstrap, adults-only affirmation, sessions, privacy defaults, contact card, device bundle registration, group invite preview/accept, group messaging, attachment upload/download, local cache, and Android-native FCM token registration. | Real production key handling, uniform encrypted attachments, and APNS/iPhone push delivery are still scaffolded rather than complete. |
| Desktop | Bootstrap, adults-only affirmation, sessions, privacy defaults, group creation, group invite management, invite preview/accept, group messaging, and attachment upload/download. | Passkeys, polished recovery, deeper Rust-core integration, and uniform encrypted attachments are incomplete. |
| Web | Public site, invite landing, magic-link bootstrap, profile/privacy settings, relay-native DM/chat, joined-space metadata search, device-encrypted group creation, community and room management, and invite preview/accept. | Uniform encrypted attachments, room-history migration, and passkey/recovery maturity are still incomplete. |

## D1 Schema Summary

- Bootstrap and auth: `beta_invites`, `accounts`, `account_emails`, `auth_challenges`, `devices`, `sessions`, `passkeys`, `device_links`, `device_push_tokens`
- Conversations and membership: `conversations`, `conversation_members`, `conversation_invites`, `conversation_messages`, `blocks`
- Media and safety: `attachments`, `reports`

## Durable Objects and Queues

- `DeviceMailboxDO`: per-device ciphertext queue with backlog caps, connected-client WebSocket fan-out, ack-based deletion, and alarm-driven expiry.
- `GroupCoordinatorDO`: stores current group epoch and member set for relay-side coordination.
- `RateLimitDO`: keyed abuse limiter for auth, invite, and send flows.
- `EMAIL_QUEUE`: used for magic-link dispatch.
- `PUSH_QUEUE`: used for Android wake notifications backed by direct FCM delivery when the worker has the required secrets.
- `CLEANUP_QUEUE`: wired into runtime logic for retention cleanup work.

## Architectural Gaps To Close

- Finish retiring the remaining relay-hosted readable group and room history in favor of the encrypted path.
- Add client-side attachment encryption before upload and document ciphertext retention precisely.
- Wire passkeys, safer recovery/device-link flows, and safety-number style change handling end to end.
- Finish APNS delivery plus more capable background sync and inbox surfacing on mobile for the encrypted mailbox path.
- Finish the remaining removal of legacy `apps/api` dependencies outside retired placeholder routes and docs.
- Add automated cleanup for mailbox envelopes and expired attachment records.
