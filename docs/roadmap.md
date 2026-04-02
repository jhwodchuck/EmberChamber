# EmberChamber Roadmap Agreement

This document is the planning source of truth for product direction, phase sequencing, and scope
tradeoffs. It is intentionally more explicit than public marketing copy.

## Summary

EmberChamber will be planned as a discreet, adults-only, invite-gated private messenger for trusted
circles. The hidden initial cohort is swinger groups sharing spicy pictures, but the public product
framing stays privacy-first and does not explicitly market to that niche. The roadmap will first
prove reliable private-group use, then expand during closed beta into larger invite-gated
multi-room communities, and only after that reconsider iPhone and macOS.

## Product Agreement

- Product boundary: adults-only is a permanent product rule.
- Public positioning: discreet privacy-first messaging for trusted circles; no explicit swinger branding in public copy.
- Hidden initial ICP: swinger groups using the app to share spicy media.
- Long-term market: broader adults-only trusted circles, not just swingers.
- Primary tie-break user: group organizer.
- First committed surfaces: Android, Windows, Ubuntu, and web.
- Non-committed near-term surfaces: iPhone and macOS.
- Web role: secondary but real client for onboarding, messaging, invite review, search, settings, and recovery.
- Core near-term product: DMs plus private groups.
- Community evolution: larger invite-gated multi-room communities enter during closed beta, after the small-group core is working.
- Identity model: pseudonymous by default; email remains private and is never the social identity.
- Media posture: global default is standard media behavior; organizers can explicitly enable stronger sensitive-media defaults per group or community.
- Leak posture: soft product deterrence only; do not promise prevention.
- Abuse posture: disclosure-based reporting plus invite/session revocation, without routine content review.
- Discovery and search posture: searchable only within spaces the user has already joined.
- Growth model: organizer or admin controlled in phase 1; member invites can expand later during beta.

## Roadmap Phases

### Phase 0: Product Contract Alignment

- Align `README.md`, `docs/launch-targets.md`, `docs/architecture.md`, web marketing copy, and `AGENTS.md` guides to the agreed product.
- Remove or clearly deprecate claims that imply public channels, public discovery, or iPhone or macOS first-beta commitment.
- Mark legacy API docs as legacy or non-source-of-truth if they still describe public channel or discovery behavior.
- Update all public-facing copy to reflect:
  - adults-only
  - invite-gated
  - discreet privacy-first positioning
  - Android, Windows, Ubuntu, and web in scope
  - iPhone and macOS later
  - web secondary but real

### Phase 1: Closed Beta Foundation

- Ship a reliable end-to-end closed beta for organizer-led private groups.
- Required capability set:
  - explicit 18+ onboarding affirmation
  - invite bootstrap
  - pseudonymous profile setup
  - DM creation and use
  - small private groups
  - organizer or admin invite control only
  - media send and receive on Android, web, Windows, and Ubuntu
  - session review, revoke, and basic recovery flows
  - joined-space-only search
  - standard media default globally
  - per-group switch to sensitive-media defaults
  - soft deterrence controls such as discreet previews, secure app switcher, export friction, and warning copy
  - disclosure-based report flow plus invite or session revocation
- Success criterion:
  - a small invited adult group can join, exchange spicy media, and keep using the product without major confusion or trust failures

### Phase 2: Closed Beta Expansion

- Expand from small groups into invite-gated multi-room communities during closed beta.
- Introduce:
  - community container concept
  - rooms or channels inside invite-gated communities
  - community-scoped search for rooms and members
  - member invites for trusted participants, gated by community policy
  - improved organizer controls for invite freezing, invite scopes, and room access
  - media and UX polish as the next roadmap priority
- Preserve:
  - no public discovery
  - no global member directory
  - no routine central content review
  - web remains secondary but real
- Success criterion:
  - a 100+ invite-gated adults-only community can operate with rooms, referrals, and media sharing without turning into a public social product

### Phase 3: Stable Beta

- Harden the adults-only trusted-circles product after community mechanics work.
- Focus on:
  - reliability across Android, web, Windows, and Ubuntu
  - organizer clarity and invite controls
  - support and recovery playbooks
  - privacy default tuning
  - operational reporting and revocation tooling
  - documentation and public-copy consistency
- Explicit non-goal in this phase:
  - iPhone or macOS launch
- Exit criterion:
  - the product is stable enough to broaden from the initial swinger cohort to wider adults-only trusted circles

### Phase 4: Post-Stable-Beta Reassessment

- Reassess iPhone and macOS only after stable beta criteria are met.
- Reassess whether passkeys, stronger auth depth, and additional client platforms are worth the cost once the core adults-only trusted-circles product is proven.

## Required Public API, Interface, And Type Changes

- Auth and bootstrap types:
  - add explicit `ageConfirmed18` or equivalent adults-only affirmation to onboarding
- Account and profile types:
  - make pseudonymous display name or handle the expected identity fields
  - keep email private and non-discoverable
- Conversation model:
  - phase 1 keeps `direct_message` and `group`
  - phase 2 adds invite-gated `community` plus scoped `room` or equivalent internal type
- Invite model:
  - phase 1 supports organizer or admin invite authority only
  - phase 2 adds policy-controlled member invites and community-scoped referral permissions
- Search model:
  - enforce search visibility only inside joined spaces
  - no public or global user or room discovery
- Media and privacy settings:
  - global media default becomes `standard`
  - group or community setting controls whether media defaults upgrade to `sensitive`
  - keep `notificationPreviewMode`, `secureAppSwitcher`, `allowSensitiveExport`, and related deterrence controls
- Reporting and moderation interfaces:
  - disclosure-based report payloads remain the standard
  - invite freeze, session revoke, and member removal must be first-class flows

## Repo And Implementation Workstreams

- Docs and product contract:
  - update root docs and public copy first so the repo stops sending mixed signals
- Web app:
  - keep onboarding, messaging, settings, recovery, and joined-space search real
  - de-emphasize or repurpose any public channel or discover semantics
- Relay:
  - keep the invite-gated D1 and DO model
  - add adults-only affirmation handling and later community, room, and referral primitives
- Mobile and desktop:
  - prioritize media flow, reliability, and organizer clarity over platform expansion
- Legacy boundaries:
  - keep `apps/api`, `infra/docker-compose.yml`, and `services/*` out of roadmap-critical work unless needed for cleanup or explicit legacy maintenance

## Test Cases And Scenarios

- A new adult user with an invite completes onboarding, affirms 18+, chooses a pseudonymous identity, and lands in a usable DM or group flow.
- An organizer creates a standard-default group and later creates a sensitive-default group; both behave as configured.
- Android, web, Windows, and Ubuntu can all send and receive media inside the same invite-gated space.
- Email stays private and is not exposed in search, profiles, or group surfaces.
- Organizers or admins can invite in phase 1; ordinary members cannot.
- Member invites can be enabled later during beta and stay scoped by community policy.
- Search returns only rooms, threads, and people from joined spaces.
- The reporting flow accepts disclosed evidence, supports invite or session revocation, and does not require routine content inspection.
- Leak-deterrence settings create friction without claiming perfect screenshot or export prevention.
- A 100+ invite-gated community can create rooms, search within the joined community, and operate without public discovery.

## Metrics And Acceptance Signals

- invite-to-first-message completion rate
- media send success rate
- session and recovery confusion rate
- organizer task completion rate for invite management
- report-to-revocation turnaround time
- community referral acceptance rate
- support volume tied to privacy and default confusion

## Assumptions And Defaults

- Adults-only uses self-attested 18+ gating, not heavy identity verification.
- Public copy stays discreet even though the first cohort is swinger-heavy.
- Standard media is the global default; stronger protections are explicit organizer choices.
- Small groups come first, but large invite-gated communities still enter during closed beta.
- Public channels and public discovery are not part of this roadmap.
- iPhone and macOS are deliberately deferred until after stable beta.
