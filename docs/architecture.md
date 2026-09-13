# EmberChamber Beta Architecture

This document tracks the active beta runtime in this repo. It separates current implementation
from target direction so the docs do not overstate privacy, platform maturity, or migration status.

## Runtime Map

| Runtime          | Repo path                                    | Current status | Notes                                                                                                                                                                                                                                       |
| ---------------- | -------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile client    | `apps/mobile`                                | Active         | Expo client using relay APIs for bootstrap, age-gated affirmation, sessions, privacy, group invite flows, group threads, and attachment upload/download with local SQLite and SecureStore.                                                |
| Desktop client   | `apps/desktop`                               | Active         | Tauri shell rendering a static export of `apps/web`'s authenticated workspace (bundled at build time; see `apps/desktop/AGENTS.md`). Session/device keys route through the OS keyring instead of localStorage.                              |
| Web app          | `apps/web`                                   | Active         | Relay-native for onboarding, age-gated affirmation, DMs, groups, community and room management, settings, joined-space search, and invite preview/accept. Legacy channel pages are retired placeholders, not active backend dependencies. |
| Relay runtime    | `apps/relay`                                 | Active         | Cloudflare Worker with D1, Durable Objects, R2, and queue bindings.                                                                                                                                                                         |
| Shared contracts | `packages/protocol`, `crates/relay-protocol` | Active         | Shared types for sessions, group flows, mailbox envelopes, device bundles, and attachments.                                                                                                                                                 |
| Rust core        | `crates/core`                                | Partial        | Present in repo and instantiated by desktop bootstrap, but not yet the primary engine behind every client flow.                                                                                                                             |

## Relay Storage Planes

| Surface                     | Current implementation                                                                                                                                                                                          | Direction                                                                                           |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Auth and identity metadata  | D1 stores blinded email indexes, encrypted email ciphertext, accounts, age-gated affirmation state, devices, sessions, invites, and reports.                                                                  | Keep centralized metadata minimal and bounded to bootstrap, routing, and safety workflows.          |
| Cipher mailbox queue        | `DeviceMailboxDO` stores ciphertext envelopes written through `/v1/messages/batch`, fans them out to connected device WebSockets, enforces backlog caps, and deletes them on ack or expiry.                     | Mature the mailbox path into the default DM and future encrypted-group transport on every client.   |
| Group and community threads | New groups are created with `device_encrypted` history and mailbox delivery. Community containers, room threads, and legacy groups still use D1-backed relay-hosted history and attachment references.          | Retire the remaining relay-hosted compatibility history and keep the encrypted path as the default. |
| Attachments                 | Current web, mobile, and desktop source encrypts conversation attachment bytes before upload. R2 stores the uploaded ciphertext. Device-encrypted conversations carry file keys inside encrypted message payloads; relay-hosted rooms and legacy groups give the relay recoverable key material. The relay also receives exact plaintext length and a deterministic plaintext hash today. | Remove unnecessary plaintext fingerprints, verify production and installer parity, and keep end-to-end key custody distinct from relay-hosted attachment delivery. |
| Client local state          | Mobile persists SQLite, SecureStore, and vault metadata. Desktop now persists shell auth state in the system keyring when available, with a restricted local-file fallback. Web persists browser session state. | Push more authoritative history and safety state back onto devices over time.                       |

## Active Relay Capabilities

- Email magic-link bootstrap with invite-only account creation and optional group-invite bootstrap.
- WebAuthn/FIDO2 passkey registration, discoverable authentication, credential listing/removal,
  expiring challenges, and signature-counter updates. The web workspace provides enrollment and
  sign-in UI; native-client passkey UX is not implemented.
- Age-gated affirmation on bootstrap, with email kept private and non-discoverable.
- Session listing and self-revocation.
- Group creation, membership listing, owner or admin invite minting, invite preview/accept, and member removal.
- Community creation, room creation, restricted-room access, invite freeze policy, room-scoped invites, and community member removal.
- Device-encrypted group creation plus legacy relay-hosted group and room compatibility APIs, plus attachment ticketing.
- Device bundle registration, contact-card resolution, `dm/open`, ciphertext batch send, and mailbox sync/ack plus live mailbox WebSockets as the encrypted-delivery substrate.
- Disclosure-based report submission.

## Present but Not Finished

- WebAuthn is implemented for the relay and web workspace, but native-client passkey UX and a
  successful authenticator end-to-end test are still missing.
- Operator-assisted recovery is implemented: operators can force-signout all of an account's sessions and mint a single-use recovery magic link (same account identity) from the operator console (`/app/admin`), which also backs disclosure-report review, account suspension, bulk report review, and a permanent operator audit log.
- Device-link start/confirm exists, but passkey-based peer-to-peer trusted-device recovery is not complete.
- Android FCM token registration, encrypted token storage, and `PUSH_QUEUE` delivery are now wired for the mobile client, but production push still depends on deployed Cloudflare secrets plus Apple-side APNS work for iPhone.
- The encrypted mailbox/device-bundle path now powers direct messages and new group creation across the active client source. Production and published-installer parity still need separate verification.
- Community and room management currently live on the relay plus web companion surface; native parity for those organizer flows still remains later work.

## Current Client Surface Matrix

| Surface            | Relay-native today                                                                                                                                                                                                                                                  | Still legacy or missing                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Android and iPhone | Bootstrap, age-gated affirmation, sessions, privacy defaults, contact card, device bundle registration, group invite preview/accept, group messaging, client-encrypted conversation attachment upload/download, local cache, and Android-native FCM token registration. | Production key handling, APNS/iPhone push delivery, and native community, room, and passkey UX still require work. |
| Desktop            | Bootstrap, age-gated affirmation, sessions, privacy defaults, group creation, group invite management, invite preview/accept, group messaging, client-encrypted conversation attachment upload/download, and the bundled web passkey UI. | Packaged-webview passkey acceptance, polished recovery, deeper Rust-core integration, and production installer parity require verification. |
| Web                | Public site, invite landing, magic-link and passkey bootstrap, passkey enrollment/removal, profile/privacy settings, relay-native DM/chat, joined-space metadata search, device-encrypted group creation, client-encrypted conversation attachments, community and room management, and invite preview/accept. | Relay-hosted room migration, native passkey parity, production deployment parity, and recovery maturity remain incomplete. |

## D1 Schema Summary

- Bootstrap and auth: `beta_invites`, `accounts`, `account_emails`, `auth_challenges`, `devices`, `sessions`, `passkeys`, `device_links`, `device_push_tokens`
- Conversations and membership: `conversations`, `conversation_members`, `conversation_invites`, `conversation_messages`, `blocks`
- Media and safety: `attachments`, `reports` (with review lifecycle columns), `operator_audit_log`

## Durable Objects and Queues

- `DeviceMailboxDO`: per-device ciphertext queue with backlog caps, connected-client WebSocket fan-out, ack-based deletion, and alarm-driven expiry.
- `GroupCoordinatorDO`: stores current group epoch and member set for relay-side coordination.
- `RateLimitDO`: keyed abuse limiter for auth, invite, and send flows.
- `EMAIL_QUEUE`: used for magic-link dispatch.
- `PUSH_QUEUE`: used for Android wake notifications backed by direct FCM delivery when the worker has the required secrets.
- `CLEANUP_QUEUE`: wired into runtime logic for retention cleanup work.

## Architectural Gaps To Close

- Operators can now retire (freeze) and purge any remaining pre-migration relay-hosted **group**
  history via `/v1/admin/conversations/:id/{retire,purge}-legacy-history` (see
  `docs/operator-playbook.md`). Communities and rooms are relay-hosted by permanent product
  design, not a legacy leftover, and are intentionally out of scope for this retirement path.
- `POST /v1/attachments/ticket` rejects conversation-scoped requests unless the client declares
  `device_encrypted` and supplies ciphertext metadata. Current first-party clients perform the
  encryption; the relay cannot independently prove that opaque uploaded bytes are ciphertext.
  Plaintext remains available for profile media such as avatar uploads, which carry no
  `conversationId`.
- Encrypted attachment tickets currently include exact plaintext length and a deterministic
  plaintext hash. That metadata permits cross-upload correlation and should be removed or reduced;
  ciphertext length and hash are sufficient for upload-integrity checks.
- Extend passkey UX beyond web, add authenticator end-to-end coverage, and finish safer
  recovery/device-link flows plus safety-number style change handling.
- Finish APNS delivery plus more capable background sync and inbox surfacing on mobile for the encrypted mailbox path.
- Add automated cleanup for mailbox envelopes and expired attachment records.
