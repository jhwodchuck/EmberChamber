# Security — Threat Model

See [`docs/architecture.md`](../architecture.md) for the system overview and [`README.md`](../../README.md) for the current beta scope.

## Primary threats in the beta design

| Threat | Current mitigation direction |
| --- | --- |
| Account takeover | Email magic-link bootstrap, optional passkeys later, device-bound sessions, recovery-triggered safety changes |
| Relay metadata abuse | Blinded email index, encrypted email-at-rest, minimal operational metadata, no public discovery |
| Offline delivery leakage | Ciphertext-only mailbox storage in Durable Objects, short retention, device-local history |
| Attachment overreach | Client-side encryption before upload, signed short-lived upload/download tickets, no plaintext media pipeline |
| Spam and raid attempts | Invite-only beta access, auth and send rate limiting, blocks, small-group caps |
| Compromised device relink | Device-link approvals, session revocation, safety-number change events after recovery |
| Group membership drift | Conversation epochs enforced on send, membership coordination in `GroupCoordinatorDO` |
| Excessive central trust | Local-first message history, relay as delivery plane only, no server-side search over private content |

## Current trust boundaries

- **Private messages**: intended to be end-to-end encrypted with ciphertext relay storage only.
- **Groups**: intended to be small, private, encrypted groups using pairwise device fanout.
- **Email**: private bootstrap and recovery identifier only, not public identity.
- **Logs**: should remain content-free apart from explicit report disclosures selected by the reporter.

## What is intentionally not in the trust model

- no Google auth dependency
- no phone-number directory
- no blanket server visibility into decrypted content
- no promise of pure P2P availability without a hosted relay
