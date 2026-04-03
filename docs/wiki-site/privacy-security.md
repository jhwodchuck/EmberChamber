# Privacy & Security

EmberChamber is built to store as little as possible on the relay and to keep decrypted history on devices only. This page documents what is and is not true today, so claims stay accurate.

## What Is Accurate Today

- **Invite-only access** — every account requires a valid beta invite. No public sign-up.
- **Email is private** — email addresses are blinded before indexing and stored encrypted-at-rest in D1. Email is never the social identity and is never publicly discoverable.
- **Device-bound sessions** — session tokens are bound to the device that completed the magic-link challenge. Session listing and self-revocation are available from every client.
- **Ciphertext mailbox for DMs** — `DeviceMailboxDO` stores only ciphertext envelopes. The relay never sees DM plaintext. Envelopes are deleted on ack or expiry.
- **Signed attachment tickets** — clients request short-lived, signed upload and download tickets. The relay does not serve blob bytes directly.
- **Rate limiting** — auth, invite, and send paths are protected by `RateLimitDO`.
- **Disclosure-based reporting** — users can submit reports; report records are stored for follow-up.

## What Is Still In Progress

| Feature | Current state | Target |
|---------|--------------|--------|
| Group thread E2EE | Thread text stored server-side in D1 | Replace relay-hosted readable history with end-to-end encrypted group state |
| Attachment encryption | Browser DM path encrypts client-side; mobile and desktop still upload raw bytes | Encrypt all attachments client-side before upload on every surface |
| Passkeys | Relay endpoints exist but return 501 | Wire passkey enrollment and use across all clients |
| Trusted-device recovery | Device-link start/confirm exists; full handoff flow not complete | Finish recovery, safety-number style change signalling |
| Operator safety tooling | Report records stored; no review dashboard | Add operator review queue, audit log, and controlled intervention API |
| Automated cleanup | Cleanup queue wired | Finish mailbox envelope expiry and expired attachment record cleanup |

## Identity Model

- **Pseudonymous by default** — display names and handles are the social identity.
- **Email for auth only** — stored blinded, encrypted, and never shared or discoverable.
- **No phone numbers** — EmberChamber does not use phone-number identity at any layer.
- **No Google auth** — no OAuth2 third-party identity provider dependency.

## What the Relay Stores vs. Does Not Store

| Data | Currently stored | Target |
|------|-----------------|--------|
| Account and session metadata | ✅ D1 | Keep; minimized |
| Ciphertext DM envelopes | ✅ DeviceMailboxDO (until ack) | Keep; delete on ack |
| Group thread text | ✅ D1 `conversation_messages` | Replace with E2EE group state |
| Attachment blobs | ✅ R2 (raw bytes from mobile/desktop; encrypted bytes from web DM) | Move all clients to client-side encryption |
| Decrypted DM history | ❌ Never stored on relay | Devices own their history |
| Public contact discovery graph | ❌ Never | Stay out-of-scope |
| Server-side search over private content | ❌ Never | Stay out-of-scope |

## Threat Model Summary

| Threat | Current mitigation | Gap |
|--------|--------------------|-----|
| Account takeover | Magic-link + invite-only bootstrap, session revocation, device labels | Passkeys and full recovery not yet live |
| Metadata leakage | Blinded email, no public discovery graph | Relay sees group-thread text in current path |
| Attachment overreach | Signed tickets, relay-side metadata | No client-side encryption on mobile/desktop yet |
| Spam and raid | Invite-only, rate limiting, small-group caps, blocks | No operator dashboard or bulk review queue |
| Compromised device | Session listing and self-revocation, manual group cleanup | No force-signout-all operator API |

## Communication Standards

When writing public copy or responding to user questions:

- ✅ "Invite-only, disclosure-based, and mid-migration toward stronger client-side cryptography."
- ✅ "DMs are delivered end-to-end encrypted via a ciphertext mailbox."
- ✅ "Group threads are currently relay-hosted and migrating toward end-to-end encryption."
- ❌ Do not describe current relay-native group threads as fully E2EE.
- ❌ Do not describe the product as anonymous, uncensorable, or law-proof.
- ❌ Do not claim all attachment flows are client-side encrypted (web DM is; mobile and desktop are not yet).
