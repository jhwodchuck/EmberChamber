# Product — Personas and Core Flows

## Personas

| Persona | Description |
|---------|-------------|
| **Community owner / moderator** | Creates and manages a private group or channel; configures invite links, roles, and anti-raid controls. |
| **Privacy-conscious member** | Joins via invite, uses E2EE DMs, configures read receipts and presence preferences. |
| **Creator / broadcaster** | Runs a channel for announcements; wants reach within the community without public discovery. |
| **Independent operator** | Runs a PrivateMesh node for their organisation; enrolls with the CA and manages their own infrastructure. |
| **Trust-and-safety reviewer** | Reviews flagged content in hosted spaces under role-gated, audited tools. |

## Core flows

### Onboarding
1. Choose username (globally unique via `directory-ca`).
2. Authenticate via passkey or email magic link.
3. Set display name, avatar, device label.
4. Configure privacy defaults (read receipts, presence, DM-from-strangers).
5. Optional: enroll TOTP.

### DM flow
1. Resolve global username → home operator via directory.
2. Fetch recipient device keys.
3. Send per-device encrypted envelopes.
4. Sync across sender's own devices.
5. Optional: report with explicitly selected message excerpts.

### Group / channel flow
1. Create community hosted on one operator.
2. Generate invite link; members join.
3. Post messages; moderate with owner/admin/mod tools.
4. Search via PostgreSQL FTS.
5. Export audit trail.

## MVP out of scope
- Public directory / discovery
- Voice / video calls
- Open (unenrolled) federation
- Phone-number social graph
- Anonymous accounts
- Small-group E2EE (groups stay server-managed in MVP)
