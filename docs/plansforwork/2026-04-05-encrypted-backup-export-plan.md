# Encrypted backup, export, and import

Date: 2026-04-05

## Problem

EmberChamber's value proposition is device-centered: private keys, DM history, and device-local search stay on the device. This is a strong trust position but it creates a real failure mode: total device loss with no backup means irrecoverable history.

The current account recovery path handles session and identity re-establishment (magic-link bootstrap, trusted-device re-link) but does not handle local history, private keys, or device-local state. Adding more social surfaces (communities, rooms, larger groups) before addressing this makes the risk more visible over time.

## Goal

Allow users to export an encrypted local bundle from one device and import it on a replacement or additional device. The encryption must be under user control — not a relay-held key.

## What the bundle contains

Minimum viable bundle:

- `device_key_bundle`: the local private identity key and prekey material
- `cached_group_messages`: SQLite-backed local message cache
- `local_search_index` (optional): device-local search state
- `conversation_preferences`: pinned, muted, notification preferences

What it does NOT contain:

- relay credentials (session tokens, refresh tokens — these should be re-issued via device link or magic-link on the new device)
- contact labels (these can be re-downloaded from the relay after session restore)

## Encryption model

The bundle is encrypted with a user-derived key using a passphrase-based KDF (Argon2id or PBKDF2 depending on what the runtime exposes):

1. User chooses an export passphrase at export time
2. KDF derives an encryption key from the passphrase
3. Bundle is serialized, encrypted with ChaCha20-Poly1305 or AES-256-GCM
4. Encrypted bundle is saved to a user-chosen local file
5. At import, user supplies the same passphrase; decryption restores the bundle into the new device's local store

The relay never sees the passphrase or the plaintext bundle.

## Platform scope

| Surface | Export    | Import    | Notes                                     |
| ------- | --------- | --------- | ----------------------------------------- |
| Android | ✅ target | ✅ target | Use DocumentPicker for save/open          |
| Web     | 📋 later  | 📋 later  | Local file access is limited but feasible |
| Windows | 📋 later  | 📋 later  | Tauri shell has file system access        |
| Ubuntu  | 📋 later  | 📋 later  | Tauri shell has file system access        |

Start with Android as the primary surface since that is where local SQLite history and key material matter most.

## Mobile implementation

### Export flow

1. User triggers export from Settings → Account → Export device data
2. App shows a passphrase entry field with a strength indicator
3. App serializes the bundle into a structured format (JSON or CBOR)
4. App encrypts the bundle using the KDF-derived key
5. App writes the encrypted file and opens a share/save sheet via `DocumentPicker` or `expo-sharing`
6. App shows a clear confirmation with the filename and a reminder to store the passphrase safely

### Import flow

1. User opens the app on a new device, completes onboarding and session restore (magic-link or device-link)
2. User navigates to Settings → Account → Import device data
3. App opens a file picker for the encrypted bundle file
4. App prompts for the passphrase
5. App decrypts and validates the bundle
6. App writes the content into the local SQLite store and secure storage
7. App restores conversation preferences and refreshes the catalog

## Relay changes

None for the core export/import path. The relay does not need to be involved in bundle encryption, storage, or transfer.

## Key constraints

- Do not use relay-held keys for bundle encryption
- Do not upload encrypted bundles to the relay or R2
- Make the passphrase strength requirement visible and honest
- Make recovery instructions prominent: if the passphrase is lost, the bundle is unrecoverable
- Treat the export file as opaque from the relay's perspective

## Relationship to trusted-device recovery

This feature is complementary to the trusted-device recovery flow, not a replacement. Trusted-device recovery handles the case where at least one device is still active. Export/import handles the total-device-loss case where no active device remains. Both should be present before social surface expansion.

## Verification

- mobile: `npm run type-check --workspace=apps/mobile`
- If any relay changes are added later: `npm run build --workspace=apps/relay` and `npm test --workspace=apps/relay`
