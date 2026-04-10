# System Architecture

EmberChamber is a local-first, invite-only private messenger built on a minimal hosted relay.  
Clients own their history; the relay handles routing, identity bootstrap, and attachment ticketing.

## High-Level Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  Expo Mobile (Android)  ·  Tauri Desktop  ·  Next.js Web    │
└────────────────┬────────────────────────────────────────────┘
                 │  HTTPS / WebSocket
┌────────────────▼────────────────────────────────────────────┐
│              Cloudflare Workers Relay (apps/relay)           │
│                                                              │
│  Worker API ──► DeviceMailboxDO  (per-device ciphertext)     │
│             ──► GroupCoordinatorDO (membership/epoch)        │
│             ──► RateLimitDO       (per-key abuse limiter)    │
│             ──► D1                (metadata, accounts,       │
│                                    invites, group threads)   │
│             ──► R2                (attachment blobs)         │
│             ──► EMAIL_QUEUE       (magic-link dispatch)      │
│             ──► PUSH_QUEUE        (Android FCM wake)         │
│             ──► CLEANUP_QUEUE     (mailbox/attachment GC)    │
└────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Shared Secure Core                         │
│  crates/core  (Rust — local-first sync & secure state)       │
│  crates/relay-protocol  ◄────►  packages/protocol           │
│  (canonical contracts, Rust)      (TypeScript mirror)        │
└─────────────────────────────────────────────────────────────┘
```

## Runtime Components

### `apps/relay` — Cloudflare Worker

The relay is the only hosted component. It runs on Cloudflare's edge using:

| Binding                | Purpose                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| **D1**                 | Metadata: accounts, devices, sessions, invites, group membership, group thread text (until migrated), reports |
| **DeviceMailboxDO**    | Per-device ciphertext queue: stores envelopes until ack, fans out to WebSockets, enforces backlog caps        |
| **GroupCoordinatorDO** | Per-group epoch tracking and membership state                                                                 |
| **RateLimitDO**        | Keyed rate limiter for auth, invite, and send paths                                                           |
| **R2**                 | Attachment blobs, accessed via signed short-lived tickets                                                     |
| **EMAIL_QUEUE**        | Dispatches magic-link emails via Resend                                                                       |
| **PUSH_QUEUE**         | Dispatches Android FCM wake notifications                                                                     |
| **CLEANUP_QUEUE**      | Drives mailbox envelope expiry and attachment metadata cleanup                                                |

### `apps/web` — Next.js

The web app is a capable secondary client. It handles onboarding, DMs, device-encrypted group
creation, legacy compatibility history, joined-space search, invite preview or accept, and
settings — all on relay APIs.

### `apps/mobile` — Expo (Android-first)

The mobile client is the primary daily-use surface. It uses local SQLite and SecureStore for device history. Android FCM push tokens are registered directly with the relay.

### `apps/desktop` — Tauri

The desktop shell is a bundled Tauri binary with a local HTML/JS frontend. Session auth state is persisted in the system keyring when available.

### `crates/core` — Rust Secure Core

Shared local-first sync and secure-state logic. Instantiated by desktop bootstrap today; full integration across every client is in progress.

### `crates/relay-protocol` / `packages/protocol`

Canonical contract definitions — envelope shapes, session tokens, group invite payloads, device bundles. The Rust crate and TypeScript package are kept in sync.

## Auth Model

1. `POST /v1/auth/start` — client submits an invite token + blinded email; relay validates the invite and sends a magic-link email via Resend.
2. `POST /v1/auth/complete` — client exchanges the magic-link token for a device-bound session pair.
3. Session tokens are bound to the device that completed the challenge. Session listing and self-revocation are available from every client surface.
4. Passkey endpoints exist in the relay (`/v1/auth/passkey/*`) but currently return 501.

Email is stored blinded and encrypted. It is never the social identity and is never publicly discoverable.

## Messaging Model

### Direct Messages

DM delivery uses the encrypted mailbox path:

1. Sender fetches the recipient's device bundle (public keys) via `/v1/contacts/card`.
2. Sender encrypts the message envelope client-side and sends via `POST /v1/messages/batch`.
3. The relay writes the ciphertext envelope to the recipient's `DeviceMailboxDO`.
4. The relay fans out to any connected WebSocket. Offline delivery holds in the mailbox until the device connects and acks.
5. On ack, the relay deletes the envelope. No plaintext is ever stored.

### Groups (current)

Group thread text is currently stored server-side in D1 (`conversation_messages`). This is the active relay-native group path that all clients use today. Migration to end-to-end encrypted group history is in progress.

### Attachments

Clients request a signed upload ticket from the relay, upload the blob directly to R2, and share the ticket with recipients. The browser DM path encrypts attachments client-side before upload. Mobile and desktop client-side encryption is in progress.

## D1 Schema Summary

| Table group      | Tables                                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Bootstrap & auth | `beta_invites`, `accounts`, `account_emails`, `auth_challenges`, `devices`, `sessions`, `passkeys`, `device_links`, `device_push_tokens` |
| Conversations    | `conversations`, `conversation_members`, `conversation_invites`, `conversation_messages`, `blocks`                                       |
| Media & safety   | `attachments`, `reports`                                                                                                                 |

## What the Relay Does Not Store (target)

- Decrypted DM history
- Server-side search indexes over private message content
- Public contact discovery graphs
