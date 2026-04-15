# Roadmap

EmberChamber ships in phases. Each phase has a clear success criterion before moving to the next.

## Phase 0 — Product Contract Alignment ✅

Align all documentation, marketing copy, and agent guides to the agreed product contract:

- Adults-only, invite-gated, discreet privacy-first positioning
- Android, Windows, Ubuntu, and web as committed beta surfaces
- iPhone and macOS deferred
- Web as secondary but capable client
- Remove deprecated centralized-MVP and public-channel assumptions

## Phase 1 — Closed Beta Foundation (Active)

Ship a reliable end-to-end closed beta for organizer-led private groups.

**Required capabilities:**

- [x] Explicit 18+ onboarding affirmation on every surface
- [x] Invite bootstrap (beta invite or group invite)
- [x] Pseudonymous profile setup
- [x] DM creation and relay mailbox delivery
- [x] Small private groups (≤ 12 members)
- [x] Organizer / admin invite control only
- [x] Media send and receive (Android, web, Windows, Ubuntu)
- [x] Session listing, revocation, and basic recovery
- [x] Joined-space-only search (no global discovery)
- [x] Per-group sensitive-media default switch
- [x] Soft deterrence controls (discreet previews, export friction, warning copy)
- [x] Disclosure-based report flow and invite/session revocation
- [ ] Full E2EE group history (in progress — replacing relay-hosted thread text)
- [ ] Client-side attachment encryption on mobile and desktop
- [ ] Passkey enrollment
- [ ] Full trusted-device recovery flow

**Success criterion:** A small invited adult group can join, exchange media, and keep using the product without major confusion or trust failures.

## Phase 2 — Closed Beta Expansion (Next)

Expand from small groups into invite-gated multi-room communities.

**Introduces:**

- Community container concept
- Rooms or channels inside invite-gated communities
- Community-scoped search (members and rooms within a joined community)
- Member invites gated by community policy
- Organizer controls: invite freezing, scoped invites, room access policies
- Media and UX polish as the primary concurrent priority

**Preserves:**

- No public discovery
- No global member directory
- Adults-only invite-gated access

## Later Phases

| Feature                                      | Priority                             |
| -------------------------------------------- | ------------------------------------ |
| iPhone and macOS native apps                 | After first-wave surfaces are stable |
| Voice / video calling                        | Deferred                             |
| Large public-community channels              | Out of scope for closed beta         |
| Auto-update channels                         | Post-Phase 1                         |
| App Store and TestFlight signed distribution | After iPhone decision                |
| Full operator dashboard for report review    | Phase 2+                             |

## Platform Commitment Matrix

| Surface         | First Beta               | Notes                                                            |
| --------------- | ------------------------ | ---------------------------------------------------------------- |
| Android         | ✅ Committed             | Primary mobile surface                                           |
| Windows         | ✅ Committed             | Desktop shell via Tauri                                          |
| Ubuntu / Debian | ✅ Committed             | Desktop shell via Tauri                                          |
| Web             | ✅ Committed (secondary) | Capable secondary client for messaging, onboarding, and settings |
| iPhone          | 🔜 Deferred              | Scaffold in repo; deferred until first-wave is stable            |
| macOS           | 🔜 Deferred              | Builds wire; signed distribution deferred                        |
