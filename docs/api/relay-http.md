# Relay HTTP API

This is the active beta HTTP surface implemented by `apps/relay`. It is an implementation-aligned
endpoint map for the current Cloudflare Worker runtime, not a full OpenAPI file.

## Base URLs

- Local development: `http://127.0.0.1:8787`
- Production: `https://relay.emberchamber.com`

## Auth Model

- Access tokens are returned by `/v1/auth/complete` and sent as `Authorization: Bearer <token>`.
- Refresh tokens are exchanged through `/v1/auth/refresh`.
- Sessions currently last 30 days unless revoked.
- Magic-link challenges currently expire after 10 minutes.
- Passkey endpoints exist, but the relay currently responds with `501`.

## Public And Bootstrap Endpoints

| Method | Path | Purpose | Notes |
| --- | --- | --- | --- |
| `GET` | `/health` | Worker health check | Returns runtime status and timestamp. |
| `GET` | `/ready` | Binding-aware readiness check | Verifies D1 plus required bindings and secrets. |
| `GET` | `/auth/complete` | Redirect helper | Redirects email-link clicks into the public web origin. |
| `POST` | `/v1/auth/start` | Start magic-link auth | Accepts email plus either a beta invite token or a qualifying group invite for new accounts. |
| `POST` | `/v1/auth/complete` | Finish magic-link auth | Creates or resumes account, device, and session. |
| `POST` | `/v1/auth/refresh` | Refresh access token | Uses refresh token stored in the session row. |
| `POST` | `/v1/passkeys/register/options` | Passkey scaffold | Currently returns `501`. |
| `POST` | `/v1/passkeys/register/verify` | Passkey scaffold | Currently returns `501`. |
| `POST` | `/v1/passkeys/auth/options` | Passkey scaffold | Currently returns `501`. |
| `POST` | `/v1/passkeys/auth/verify` | Passkey scaffold | Currently returns `501`. |
| `GET` | `/v1/groups/:groupId/invites/:token/preview` | Preview group invite | Public preview used before sign-in or acceptance. |

## Authenticated Account And Device Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/v1/me` | Current account profile |
| `PATCH` | `/v1/me` | Update display name and bio |
| `GET` | `/v1/me/privacy` | Read privacy defaults |
| `PATCH` | `/v1/me/privacy` | Update privacy defaults |
| `GET` | `/v1/sessions` | List active sessions for the current account |
| `DELETE` | `/v1/sessions/:sessionId` | Revoke one session for the current account |
| `POST` | `/v1/devices/register` | Upload device-bundle material |
| `POST` | `/v1/devices/link/start` | Start device-link flow |
| `POST` | `/v1/devices/link/confirm` | Confirm device-link flow |
| `POST` | `/v1/contacts/card/resolve` | Resolve a contact-card payload |
| `GET` | `/v1/me/contact-card` | Get the current account contact card |
| `GET` | `/v1/accounts/:accountId/device-bundles` | Fetch bundle material for the current account or a shared-contact account |

## Authenticated Conversation, Search, And Group Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/v1/dm/open` | Open or reuse a DM descriptor |
| `GET` | `/v1/conversations` | List joined DMs and groups with metadata only |
| `GET` | `/v1/conversations/:conversationId` | Read one conversation descriptor plus membership |
| `GET` | `/v1/search?q=` | Search joined-space metadata and shared contacts |
| `GET` | `/v1/groups` | List group memberships |
| `POST` | `/v1/groups` | Create a group | New groups are created with `historyMode = device_encrypted`. |
| `GET` | `/v1/groups/:groupId/messages` | Read relay-hosted group thread messages | Compatibility path only. Returns `409 HISTORY_MODE_UNSUPPORTED` for encrypted groups. |
| `POST` | `/v1/groups/:groupId/messages` | Write a relay-hosted group thread message | Only valid for `relay_hosted` group history. |
| `GET` | `/v1/groups/:groupId/invites` | List invite records for a group |
| `POST` | `/v1/groups/:groupId/invites` | Create a group invite |
| `POST` | `/v1/groups/:groupId/invites/:token/accept` | Accept a group invite |
| `DELETE` | `/v1/groups/:groupId/invites/:inviteId` | Revoke a group invite |
| `POST` | `/v1/groups/:groupId/members/:accountId/remove` | Remove a group member |

## Cipher Mailbox And Attachment Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/v1/messages/batch` | Submit ciphertext envelopes to the mailbox path |
| `GET` | `/v1/mailbox/sync` | Read pending mailbox envelopes for the current device |
| `POST` | `/v1/mailbox/ack` | Ack and delete mailbox envelopes |
| `POST` | `/v1/attachments/ticket` | Mint signed upload/download URLs plus attachment metadata | Accepts plaintext or client-encrypted metadata and returns `encryptionMode`. |
| `GET` | `/v1/attachments/:attachmentId/access` | Mint a fresh member-scoped download URL |
| `PUT` | `/v1/attachments/upload/:attachmentId` | Upload attachment bytes | Verifies byte length and checksum for the declared encryption mode. |
| `GET` | `/v1/attachments/download/:attachmentId` | Download attachment bytes |

## Safety Endpoint

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/v1/reports` | Submit a disclosure-based abuse report |

## Current Caveats

- New groups are created as `device_encrypted`; only legacy relay-hosted group and room compatibility paths still store readable text in D1 `conversation_messages`.
- Current mobile and desktop clients still upload raw bytes to R2; the new browser DM attachment path encrypts before upload, but that is not yet universal across every client.
- `CLEANUP_QUEUE` is now consumed by the worker for retention work. `PUSH_QUEUE` is still provisioned but not yet consumed.
- The browser now uses relay APIs for authenticated messaging, search, invite, and settings flows. Legacy channel routes remain intentionally retired placeholders, not the target beta direction.
- Browser DM history is local-first. The relay indexes conversation metadata and transports ciphertext envelopes, but it does not serve plaintext DM history back to the browser.

## Legacy Reference

For the older centralized prototype stack, see [`openapi.yaml`](openapi.yaml).
