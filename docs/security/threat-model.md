# Security — Threat Model

This document separates current implementation from target direction. Use it to avoid making
stronger privacy claims than the repo can currently support.

## Claim Discipline

- Accurate today: invite-only email bootstrap, blinded email index, encrypted email-at-rest, device-bound sessions, signed attachment tickets, rate limiting, and disclosure-based report submission.
- Not accurate today: current relay-native group threads are end-to-end encrypted across every client, every attachment flow is client-side encrypted before upload, or passkeys are live.

## Security Status By Surface

| Surface | Status | Current behavior | Target direction |
| --- | --- | --- | --- |
| Auth bootstrap | Implemented | Magic-link challenges, blinded email index, encrypted email ciphertext, device-bound sessions. | Add passkeys and stronger recovery without changing the invite-only model. |
| Session and device review | Partial | Session listing and self-revocation work. Device-link start/confirm exists. | Finish trusted-device recovery and safety-change handling. |
| Device bundles and encrypted-delivery substrate | Partial | Relay stores device-bundle rows and exposes mailbox APIs. User-facing migration is incomplete. | Mature into the main E2EE DM/group transport path. |
| Mailbox queue | Partial | `DeviceMailboxDO` stores ciphertext envelopes until ack or expiry, with cleanup driven by alarms and the cleanup queue. | Mature the mailbox path into the default transport on every client surface. |
| Group threads | Partial | Group thread text is stored server-side in D1 `conversation_messages`. | Replace relay-hosted readable history with end-to-end encrypted group state. |
| Attachments | Partial | Clients request signed tickets; the browser DM path now encrypts before upload, while current mobile and desktop flows still upload raw bytes to R2. | Encrypt attachments client-side before upload on every client. |
| Web workspace | Improved | Browser messaging, search, invites, and settings now run on relay APIs with local-first DM history. | Finish encrypted-group rollout and remove the remaining retired legacy assumptions from docs and operator flows. |
| Safety tooling | Partial | Disclosure-based reports are stored. | Add operator review, audit, and controlled intervention tooling. |

## Primary Threats And Current Mitigations

| Threat | Current mitigation | Current gap |
| --- | --- | --- |
| Account takeover | Email magic links, invite-only bootstrap, session revocation, device labels. | Passkeys and stronger recovery flows are not live yet. |
| Metadata abuse | Blinded email index, encrypted email-at-rest, no public discovery graph. | Relay still sees group-thread text and raw attachment blobs in current relay-native flows. |
| Offline delivery leakage | Ciphertext-only mailbox queue with ack deletion, mailbox backlog caps, and cleanup-driven expiry. | Delivery guarantees and encrypted-group rollout still need broader cross-client validation. |
| Attachment overreach | Signed short-lived upload/download tickets and relay-side attachment metadata. | No client-side attachment encryption in current mobile or desktop clients. |
| Spam and raid attempts | Invite-only access, auth/send rate limiting, small-group caps, block rows. | No operator dashboard, bulk review queue, or global invite-freeze surface. |
| Compromised device persistence | Session listing and self-revocation, manual group-boundary cleanup. | No operator force-signout-all API and incomplete trusted-device recovery. |
| Group membership drift | Group epoch tracking in `GroupCoordinatorDO` and membership checks on relay APIs. | Relay-hosted group threads are not yet the final E2EE design. |
| Hybrid web drift | Authenticated browser flows now use relay APIs and local-first DM history. | Retired legacy browser surfaces still need docs and operator language to stay aligned with the active product boundary. |

## Before Stronger Privacy Claims

- Move group-thread history off server-readable D1 text.
- Encrypt attachments client-side before upload to R2.
- Finish passkeys, safer device recovery, and clearer safety-change signaling.
- Finish the remaining encrypted-group and encrypted-attachment rollout across mobile and desktop.
- Add automated cleanup for mailbox envelopes and expired attachment records.

## What Is Still Intentionally Out Of Scope

- Google-auth dependency
- phone-number discovery
- blanket routine moderation visibility into private content
- pure P2P availability without any hosted relay
