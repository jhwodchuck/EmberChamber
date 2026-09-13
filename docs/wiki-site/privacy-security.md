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

| Feature                 | Current state                                                                                   | Target                                                                      |
| ----------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Group thread E2EE       | Thread text stored server-side in D1                                                            | Replace relay-hosted readable history with end-to-end encrypted group state |
| Attachment privacy      | Current clients encrypt conversation bytes before upload; relay-hosted threads escrow recoverable file keys, and encrypted-upload metadata includes exact plaintext length and hash | Remove plaintext fingerprints, preserve device-only key custody where promised, and verify deployed/installer parity |
| Passkeys                | Relay/web enrollment and sign-in are implemented in current source                              | Add native-client UX, deployment proof, and authenticator E2E coverage      |
| Trusted-device recovery | Device-link start/confirm exists; full handoff flow not complete                                | Finish recovery, safety-number style change signalling                      |
| Operator safety tooling | Operator review queue, audit log, suspension, recovery handoff, and bulk review are implemented | Broaden tested, audited intervention coverage                               |
| Automated cleanup       | Cleanup queue wired                                                                             | Finish mailbox envelope expiry and expired attachment record cleanup        |

## Identity Model

- **Pseudonymous by default** — display names and handles are the social identity.
- **Email for auth only** — stored blinded, encrypted, and never shared or discoverable.
- **No phone numbers** — EmberChamber does not use phone-number identity at any layer.
- **No Google auth** — no OAuth2 third-party identity provider dependency.

## What the Relay Stores vs. Does Not Store

| Data                                    | Currently stored                                                   | Target                                     |
| --------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------ |
| Account and session metadata            | ✅ D1                                                              | Keep; minimized                            |
| Ciphertext DM envelopes                 | ✅ DeviceMailboxDO (until ack)                                     | Keep; delete on ack                        |
| Group thread text                       | ✅ D1 `conversation_messages`                                      | Replace with E2EE group state              |
| Attachment blobs                        | ✅ R2 ciphertext for conversation attachments                    | Remove unnecessary plaintext fingerprints and verify deployed/installer parity |
| Decrypted DM history                    | ❌ Never stored on relay                                           | Devices own their history                  |
| Public contact discovery graph          | ❌ Never                                                           | Stay out-of-scope                          |
| Server-side search over private content | ❌ Never                                                           | Stay out-of-scope                          |

## Threat Model Summary

| Threat               | Current mitigation                                                                        | Gap                                                    |
| -------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Account takeover     | Magic-link + optional web passkey bootstrap, session revocation, device labels            | Native passkey parity and full recovery are incomplete |
| Metadata leakage     | Blinded email, no public discovery graph                                                  | Relay sees group-thread text in current path           |
| Attachment overreach | Client-encrypted bytes and signed tickets                                                 | Relay-hosted threads escrow keys; exact plaintext length/hash metadata remains |
| Spam and raid        | Invite-only, rate limiting, small-group caps, blocks, operator dashboard, and bulk review | Broader operational acceptance testing is needed       |
| Compromised device   | Session listing/self-revocation, operator force-signout-all, and recovery handoff         | Trusted-device recovery remains incomplete             |

## Communication Standards

When writing public copy or responding to user questions:

- ✅ "Invite-only, disclosure-based, and mid-migration toward stronger client-side cryptography."
- ✅ "DMs are delivered end-to-end encrypted via a ciphertext mailbox."
- ✅ "Group threads are currently relay-hosted and migrating toward end-to-end encryption."
- ❌ Do not describe current relay-native group threads as fully E2EE.
- ❌ Do not describe the product as anonymous, uncensorable, or law-proof.
- ❌ Do not describe relay-hosted attachment flows as end-to-end protected from the relay, even though current clients encrypt bytes before upload.
