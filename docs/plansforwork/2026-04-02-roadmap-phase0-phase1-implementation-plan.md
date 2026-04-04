# Roadmap Phase 0 And Phase 1 Implementation Plan

## Summary

This plan covers the repo work needed to implement the agreed EmberChamber roadmap pass on April 2,
2026.

It is not the product-direction source of truth. That remains [`docs/roadmap.md`](../roadmap.md).
This file is the execution plan for the concrete repo work needed to align the active beta runtime
with that roadmap.

The focus of this plan:

- complete phase 0 product-contract alignment across repo docs and public copy
- land the concrete phase 1 defaults that are small enough to implement in the current pass
- avoid pretending phase 2 community and room work is already built

## Goals

- Make the active repo tell one consistent product story.
- Enforce adults-only onboarding with explicit self-attested 18+ confirmation.
- Keep invite creation under organizer or admin control in phase 1.
- Change global media defaults to standard, with stronger protections enabled per group.
- Keep web secondary but real while de-emphasizing public-channel and discovery-era semantics.
- Mark legacy API docs and legacy paths clearly enough that agents do not route new work there by accident.

## Scope

In scope:

- relay auth and group defaults
- shared relay contract types
- web onboarding and workspace copy
- mobile onboarding copy and bootstrap contract
- desktop shell bootstrap and group-creation defaults
- root docs, architecture docs, launch-target docs, and agent guides
- legacy API doc labeling

Out of scope:

- full phase 2 community or room primitives
- removing every remaining legacy `apps/api` dependency
- final E2EE group-history migration
- client-side attachment encryption
- passkey completion
- iPhone or macOS launch work
- operator dashboards or advanced moderation tooling

## Workstreams

### 1. Product Contract Alignment

- Update `README.md`, `docs/architecture.md`, `docs/launch-targets.md`, web marketing copy, and agent guides.
- Keep public framing discreet and privacy-first.
- Make Android, Windows, Ubuntu, and web the committed first-wave surfaces.
- Mark iPhone and macOS as later-surface work, not first-beta commitments.
- Mark legacy OpenAPI material as legacy and non-source-of-truth for the active relay runtime.

### 2. Adults-Only Bootstrap

- Add `ageConfirmed18` to relay bootstrap request contracts.
- Require explicit 18+ affirmation in relay request validation.
- Persist the adults-only affirmation in the relay metadata model.
- Add the same onboarding field to web, mobile, and desktop bootstrap flows.

### 3. Phase 1 Invite Rules

- Keep invite creation and invite viewing to owners or admins in relay-native group flows.
- Remove phase-1 product copy that implies member-created invites are active or preferred.
- Keep later-beta member-invite expansion documented only as future work.

### 4. Media Default Reset

- Change new group defaults from sensitive-media-on to standard-by-default.
- Keep stronger protections as an explicit organizer choice per group.
- Update desktop, mobile, web, and doc copy so the default matches the runtime.

### 5. Web Surface De-Emphasis

- Keep onboarding, messaging, search, invite review, settings, and recovery real on web.
- Remove or de-emphasize active “new channel” semantics from the main web workspace.
- Replace channel-creation entry points with later-beta placeholders where appropriate.
- Keep legacy channel routes labeled as legacy rather than pretending they are the main plan.

## Acceptance Criteria

- Repo docs no longer claim iPhone or macOS are committed first-beta launch surfaces.
- Bootstrap requires a clear adults-only affirmation on the active relay path.
- New relay-native groups default to standard media handling unless organizers opt into stronger protections.
- Relay-native invites are owner or admin controlled in phase 1.
- Main web workspace copy no longer presents public-channel-style creation as an active beta priority.
- `docs/api/openapi.yaml` is visibly labeled as legacy.
- `docs/plansforwork` contains a plan file for this roadmap implementation pass.

## Verification

Target checks for this pass:

- `npm run build --workspace=packages/protocol`
- `npm run build --workspace=apps/relay`
- `npm test --workspace=apps/relay`
- `npm run lint --workspace=apps/web`
- `npm run type-check --workspace=apps/mobile`
- `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml`
- `cargo check -p emberchamber-relay-protocol`

## Expected Follow-Up Work

- move the browser further off legacy `apps/api`
- introduce community and room primitives for closed beta expansion
- finish passkeys and safer recovery flows
- encrypt attachments client-side before upload
- replace relay-hosted readable group history with the intended E2EE model
- add operator tooling for reports, invite freezes, and broader revocation flows
