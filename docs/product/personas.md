# Product — Beta Personas and Flows

## Personas

| Persona | What they need |
| --- | --- |
| **Trusted-circle organizer** | Runs a small private group, shares invite tokens, removes abusive members, keeps the circle closed. |
| **Privacy-first member** | Wants encrypted DMs and groups without exposing phone number, Google identity, or public profile. |
| **Desktop-heavy operator** | Uses Windows or Ubuntu as a daily client and wants the same trust model as mobile. |
| **Android-first early adopter** | Uses the primary beta client, expects reliable offline delivery and sane recovery. |
| **Safety reviewer** | Handles disclosure-based abuse reports without routine access to private message content. |

## Core beta flows

### Beta onboarding
1. Receive a beta invite token.
2. Start email magic-link auth.
3. Complete the magic link on Android or desktop.
4. Generate device keys locally and upload the public bundle.
5. Optionally enroll a passkey later.

### DM flow
1. Resolve a contact card or deep-link invite.
2. Open or reuse a DM conversation.
3. Encrypt one envelope per recipient device.
4. Relay queues ciphertext until the recipient acks it.
5. Message history remains local on each device.

### Small-group flow
1. Create a group capped at 12 members.
2. Mint group invites from an owner/admin device.
3. Send pairwise encrypted envelopes to member devices.
4. Rotate conversation epoch when membership changes.
5. Keep reports disclosure-based rather than routinely inspect content.

## Beta out of scope

- public channels
- public discovery
- phone-number social graph
- large community moderation stacks
- voice and video calling
- web as a primary chat runtime
