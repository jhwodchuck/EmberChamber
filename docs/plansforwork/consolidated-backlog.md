# Consolidated Backlog of Pending Plans

This document consolidates unstarted or deferred feature plans to keep the workspace organized and clean.

---

## 1. Self-Serve Invite Validation and Magic-Link Resend

**Date:** 2026-04-05  
**Status:** Pending / Not Started

### Problem

The current support page routes three common onboarding failures through manual email:
- expired or over-used invite codes
- missing magic-link emails
- login problems after registration

The product is invite-gated and email-bootstrap-based, which means these are the most common support requests in the early beta. Routing them all through a 1–2 business day manual email loop adds real friction and support cost.

### Goal

Add a minimal self-serve flow that handles the three most frequent cases without any engineering intervention or support email.

### Flows to Build

#### 1. Invite code check
User enters their invite code. The relay looks it up and returns:
- valid and unused: show confirmation, proceed to register
- valid but exhausted: show "this invite has no uses remaining — ask whoever shared it to send a fresh one"
- valid but expired: show "this invite expired on [date] — ask whoever shared it for a new one"
- not found: show "this code was not found — check for typos or ask for a new one"

This replaces the current answer "ask whoever sent yours to confirm it's still active, then email us."

#### 2. Magic-link resend
User enters their email. If the email matches a registered account, the relay queues a new magic-link email. Response is always the same generic message whether the account exists or not (prevents account enumeration).

This replaces the current answer "check your spam folder, if it's not there email support and we'll resend manually."

#### 3. Account / device bootstrap state
User with an existing session can check:
- which devices are linked to their account
- when each session was last active
- whether their device bundle is registered

This is already partially covered by the session listing in settings, but a dedicated support-facing path makes recovery more legible.

### Relay Changes

#### Invite check endpoint
```http
POST /v1/invite/check
Body: { code: string }
Response: { status: "valid" | "exhausted" | "expired" | "not_found", expiresAt?: string, usesRemaining?: number }
```
This endpoint does not consume the invite, it only reads the current state. Rate-limit aggressively.

#### Magic-link resend endpoint
This is a variant of the existing magic-link flow. The relay already sends magic-link emails — the change is exposing a self-serve resend path that does not require the invite token or registration form.
```http
POST /v1/auth/resend-magic-link
Body: { email: string }
Response: { sent: boolean }  // always true regardless of whether the account exists
```
Rate-limit per IP and per email.

### Web Changes

#### New route: `/support/invite`
Simple form: one text input for invite code, a "Check invite" button, and a clear status message. No auth required.

#### New route: `/support/resend`
Simple form: one email input, a "Resend sign-in link" button, and a confirmation message. No auth required.

#### Support page update
Replace the current quickAnswers for invite and magic-link problems with direct links to `/support/invite` and `/support/resend` instead of routing to email.

### Mobile Changes

Link to the web self-serve pages from the onboarding error states, or mirror the invite check flow natively in the onboarding screen if that is a better UX.

### Product Constraints

- Do not expose account existence through error messages (generic responses for resend)
- Rate-limit all unauthenticated self-serve endpoints
- Keep the relay-side invite model read-only for this check — do not allow self-serve invite extension or reactivation

---

## 2. Encrypted Backup, Export, and Import

**Date:** 2026-04-05  
**Status:** Pending / Not Started

### Problem

EmberChamber's value proposition is device-centered: private keys, DM history, and device-local search stay on the device. This is a strong trust position but it creates a real failure mode: total device loss with no backup means irrecoverable history.

The current account recovery path handles session and identity re-establishment (magic-link bootstrap, trusted-device re-link) but does not handle local history, private keys, or device-local state. Adding more social surfaces (communities, rooms, larger groups) before addressing this makes the risk more visible over time.

### Goal

Allow users to export an encrypted local bundle from one device and import it on a replacement or additional device. The encryption must be under user control — not a relay-held key.

### What the bundle contains

Minimum viable bundle:
- `device_key_bundle`: the local private identity key and prekey material
- `cached_group_messages`: SQLite-backed local message cache
- `local_search_index` (optional): device-local search state
- `conversation_preferences`: pinned, muted, notification preferences

What it does NOT contain:
- relay credentials (session tokens, refresh tokens — these should be re-issued via device link or magic-link on the new device)
- contact labels (these can be re-downloaded from the relay after session restore)

### Encryption Model

The bundle is encrypted with a user-derived key using a passphrase-based KDF (Argon2id or PBKDF2 depending on what the runtime exposes):
1. User chooses an export passphrase at export time
2. KDF derives an encryption key from the passphrase
3. Bundle is serialized, encrypted with ChaCha20-Poly1305 or AES-256-GCM
4. Encrypted bundle is saved to a user-chosen local file
5. At import, user supplies the same passphrase; decryption restores the bundle into the new device's local store

The relay never sees the passphrase or the plaintext bundle.

### Platform Scope

| Surface | Export    | Import    | Notes                                     |
| ------- | --------- | --------- | ----------------------------------------- |
| Android | ✅ target | ✅ target | Use DocumentPicker for save/open          |
| Web     | 📋 later  | 📋 later  | Local file access is limited but feasible |
| Windows | 📋 later  | 📋 later  | Tauri shell has file system access        |
| Ubuntu  | 📋 later  | 📋 later  | Tauri shell has file system access        |

Start with Android as the primary surface since that is where local SQLite history and key material matter most.

### Mobile Implementation

#### Export flow
1. User triggers export from Settings → Account → Export device data
2. App shows a passphrase entry field with a strength indicator
3. App serializes the bundle into a structured format (JSON or CBOR)
4. App encrypts the bundle using the KDF-derived key
5. App writes the encrypted file and opens a share/save sheet via `DocumentPicker` or `expo-sharing`
6. App shows a clear confirmation with the filename and a reminder to store the passphrase safely

#### Import flow
1. User opens the app on a new device, completes onboarding and session restore (magic-link or device-link)
2. User navigates to Settings → Account → Import device data
3. App opens a file picker for the encrypted bundle file
4. App prompts for the passphrase
5. App decrypts and validates the bundle
6. App writes the content into the local SQLite store and secure storage
7. App restores conversation preferences and refreshes the catalog

### Relay Changes

None for the core export/import path. The relay does not need to be involved in bundle encryption, storage, or transfer.

### Key Constraints

- Do not use relay-held keys for bundle encryption
- Do not upload encrypted bundles to the relay or R2
- Make the passphrase strength requirement visible and honest
- Make recovery instructions prominent: if the passphrase is lost, the bundle is unrecoverable
- Treat the export file as opaque from the relay's perspective

### Relationship to trusted-device recovery

This feature is complementary to the trusted-device recovery flow, not a replacement. Trusted-device recovery handles the case where at least one device is still active. Export/import handles the total-device-loss case where no active device remains. Both should be present before social surface expansion.
