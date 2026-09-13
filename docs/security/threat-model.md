# Security — Threat Model

This document separates current implementation from target direction. Use it to avoid making
stronger privacy claims than the repo can currently support.

## Claim Discipline

- Accurate in current source: invite-only email bootstrap, blinded email index, encrypted email-at-rest, device-bound sessions, web passkey enrollment/sign-in, signed attachment tickets, rate limiting, and disclosure-based report submission.
- Not accurate today: every legacy group or room path is end-to-end encrypted, every attachment flow keeps keys exclusively on participant devices, passkeys have native-client parity, or passkey-based trusted-device recovery is complete.

## Security Status By Surface

| Surface                                         | Status      | Current behavior                                                                                                                                                          | Target direction                                                                                                 |
| ----------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Auth bootstrap                                  | Implemented | Magic-link challenges, blinded email index, encrypted email ciphertext, device-bound sessions, plus relay/web WebAuthn enrollment and sign-in.                            | Add native-client passkey parity and stronger recovery without changing the invite-only model.                   |
| Session and device review                       | Partial     | Session listing and self-revocation work. Device-link start/confirm exists. Operators can force-signout all of an account's sessions and issue a recovery handoff.        | Finish passkey-based trusted-device recovery and safety-change handling.                                         |
| Device bundles and encrypted-delivery substrate | Partial     | Relay stores device-bundle rows and exposes mailbox APIs. User-facing migration is incomplete.                                                                            | Mature into the main E2EE DM/group transport path.                                                               |
| Mailbox queue                                   | Partial     | `DeviceMailboxDO` stores ciphertext envelopes until ack or expiry, with cleanup driven by alarms and the cleanup queue.                                                   | Mature the mailbox path into the default transport on every client surface.                                      |
| Group threads                                   | Partial     | New groups are created with `device_encrypted` history, but legacy relay-hosted groups and rooms still leave readable history in D1 `conversation_messages`.              | Retire the remaining relay-hosted compatibility history.                                                         |
| Attachments                                     | Partial     | Current clients encrypt conversation bytes before upload. Device-encrypted conversations keep file keys in encrypted message payloads; relay-hosted threads escrow recoverable keys. Exact plaintext length and hash metadata still reach the relay. | Remove unnecessary plaintext fingerprints, preserve device-only key custody where promised, and verify deployed/installer parity. |
| Web workspace                                   | Improved    | Browser messaging, search, invites, and settings now run on relay APIs with local-first DM history.                                                                       | Finish encrypted-group rollout and remove the remaining retired legacy assumptions from docs and operator flows. |
| Safety tooling                                  | Improved    | Disclosure-based reports are stored and reviewed in an operator console with force-signout, recovery handoff, account suspension, bulk review, and a permanent audit log. | Broaden tested, audited intervention coverage.                                                                   |

## Primary Threats And Current Mitigations

| Threat                         | Current mitigation                                                                                                                                              | Current gap                                                                                                             |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Account takeover               | Email magic links, optional web passkeys, invite-only bootstrap, session revocation, device labels.                                                             | Native passkey parity and stronger recovery flows are not complete.                                                     |
| Metadata abuse                 | Blinded email index, encrypted email-at-rest, no public discovery graph.                                                                                        | Relay sees exact plaintext length/hash metadata for encrypted attachments and any retained relay-hosted history.        |
| Offline delivery leakage       | Ciphertext-only mailbox queue with ack deletion, mailbox backlog caps, and cleanup-driven expiry.                                                               | Delivery guarantees and encrypted-group rollout still need broader cross-client validation.                             |
| Attachment overreach           | Current clients encrypt conversation bytes before upload and use signed short-lived tickets.                                                                    | Relay-hosted threads escrow recoverable keys; download URLs are bearer capabilities; plaintext fingerprints remain.     |
| Spam and raid attempts         | Invite-only access, auth/send rate limiting, small-group caps, block rows, operator report queue, community invite-freeze, bulk review, and account suspension. | Broader operational acceptance testing is still needed.                                                                 |
| Compromised device persistence | Session listing and self-revocation, operator force-signout-all + recovery handoff, manual group-boundary cleanup.                                              | Passkey-based trusted-device recovery still incomplete.                                                                 |
| Group membership drift         | Group epoch tracking in `GroupCoordinatorDO` and membership checks on relay APIs.                                                                               | Legacy relay-hosted group and room history is still not the final design.                                               |
| Hybrid web drift               | Authenticated browser flows now use relay APIs and local-first DM history.                                                                                      | Retired legacy browser surfaces still need docs and operator language to stay aligned with the active product boundary. |

## Before Stronger Privacy Claims

- Retire the remaining server-readable relay-hosted group and room history in D1.
- Remove deterministic plaintext fingerprints from encrypted attachment metadata.
- Extend passkeys to native clients and finish safer device recovery plus clearer safety-change signaling.
- Verify encrypted-group and attachment behavior in production and published installers.
- Add automated cleanup for mailbox envelopes and expired attachment records.

## What Is Still Intentionally Out Of Scope

- Google-auth dependency
- phone-number discovery
- blanket routine moderation visibility into private content
- pure P2P availability without any hosted relay
