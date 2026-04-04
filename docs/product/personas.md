# Product — Beta Personas And Current Flows

This document describes the current beta experience in the repo, not just the intended end state.

## Personas

| Persona | Current need |
| --- | --- |
| **Trusted-circle organizer** | Creates a small private group, sets join rules, mints or revokes invites, and removes members when the boundary changes. |
| **Privacy-conscious member** | Wants invite-only access without phone-number identity, keeps email private, and expects readable session/privacy controls. |
| **Android-first beta tester** | Uses the most complete relay-native client and expects local storage, attachment sending, and sane first-session setup. |
| **Desktop-heavy host** | Uses Windows, macOS, or Linux daily and wants the same relay-native bootstrap and group-management path without loading a hosted web wrapper. |
| **Safety reviewer** | Handles disclosure-based reports and boundary incidents even though there is no full operator dashboard yet. |
| **Web companion user** | Uses the browser for onboarding, settings, and invite review while the fully migrated web workspace is still in progress. |

## Current Beta Flows

### Bootstrap and first session

1. Receive either a beta invite token or a full group invite URL.
2. Start email magic-link auth on web, mobile, or desktop.
3. Complete the magic link and create a device-bound relay session.
4. Register device-bundle material if the client supports it.
5. Review sessions and privacy defaults on the client you just bootstrapped.

Passkeys remain future work. The endpoints exist, but the relay does not complete a passkey flow yet.

### Trusted-circle setup

1. Create a group capped at 12 members.
2. Save join rules and decide whether members can mint invites.
3. Mint one or more shareable invites.
4. Preview the invite before accepting it on another account or device.
5. Owners and admins can revoke invites and remove members.

### Group thread and attachment flow today

1. New groups in the active relay runtime are created with `device_encrypted` history and mailbox delivery.
2. Legacy relay-hosted group and room compatibility endpoints still exist, and only those paths write readable text into `conversation_messages`.
3. Attachments upload to R2 through signed tickets; browser encrypted-conversation flows can upload ciphertext first, while native attachment rollout is still uneven.
4. Clients can keep local copies and local vault metadata.
5. This is the working beta flow, but it is not yet a fully uniform encrypted-group and encrypted-attachment experience across every surface.

### Encrypted-delivery substrate in progress

- The relay already exposes device bundles, contact cards, `dm/open`, `messages/batch`, and mailbox sync/ack endpoints.
- Those APIs are the basis for a fuller E2EE DM and group-delivery model.
- The repo does not yet provide a fully migrated user-facing experience on top of that substrate across every client surface.

## Not The Current Beta Direction

- public discovery-first growth
- phone-number identity and address-book matching
- voice and video calling
- store-published signed release channels
- web as the only or preferred primary client
- large moderation and operator suites
- treating legacy public channels and search as the target beta product
