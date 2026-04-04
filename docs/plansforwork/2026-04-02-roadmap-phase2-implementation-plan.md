# Roadmap Phase 2 Implementation Plan

## Summary

This plan captures the concrete repo work for the first usable phase 2 pass on April 2, 2026.

The product-direction source of truth remains
[`docs/roadmap.md`](../roadmap.md). This file describes the active
implementation slice that turns the roadmap's closed-beta expansion language into working relay and
web behavior.

## Goals

- Add invite-gated `community` and `room` conversation primitives to the active relay runtime.
- Keep joined-space search scoped to communities and rooms the account already belongs to.
- Allow policy-controlled member invites for communities without reintroducing public discovery.
- Give organizers explicit room-access controls and invite-freeze controls on the web.
- Keep groups and direct messages working while phase 2 surfaces come online.

## Scope

In scope:

- relay schema additions for community parents, room access policy, and scoped invites
- relay conversation loading for `community` and `room`
- relay endpoints for:
  - create community
  - update community invite policy
  - create room
  - grant and remove restricted-room access
  - scoped conversation invites
  - generic relay-hosted conversation messages
  - community-scoped search
- web relay client support for communities, rooms, scoped invites, and generic relay-hosted
  messages
- web routes for:
  - new community creation
  - community management
  - community-scoped search and invite acceptance
- workspace routing so communities no longer fall into the group-only chat path

Out of scope:

- native Android, desktop, or Expo UI for community management
- passkeys or stronger account bootstrap
- attachment end-to-end encryption improvements
- public discovery, public channels, or a global member directory
- final operator tooling for invite auditing and moderation dashboards
- legacy `apps/api` channel and discover cleanup

## Workstreams

### 1. Relay Conversation Model

- Add `community` and `room` as first-class conversation kinds.
- Use `parent_conversation_id` to model rooms under a community.
- Keep rooms relay-hosted and keep communities as containers rather than chat transcripts.
- Add `room_access_policy` so rooms can be inherited by all community members or explicitly
  restricted.

### 2. Membership And Invite Semantics

- Keep community membership at the root conversation.
- Inherit all-members room access from the community.
- Let organizers create room-restricted memberships for private rooms.
- Extend invites so a root community invite can optionally target a room.
- Let communities enable member-created invites by policy instead of making them globally active.

### 3. Web Control Surface

- Add `/app/new-community` for community creation.
- Add `/app/community/[id]` for organizer controls:
  - invite policy
  - invite freeze
  - room creation
  - room member access
  - scoped invite minting
- Route rooms to the existing chat surface and communities to the new management surface.
- Keep search relay-native and optionally scoped to a joined community.

## Acceptance Criteria

- A signed-in organizer can create a community and its default room from the web app.
- A signed-in organizer can create additional rooms and mark them `all_members` or `restricted`.
- A signed-in organizer can grant and remove restricted-room access for community members.
- Search can be scoped to one joined community and still only returns joined-space metadata.
- Invite preview and invite acceptance work for both group and community invites.
- Community invites can target either the whole community or one room.
- The web workspace no longer routes communities through the group-only chat path.

## Verification

Checks run for this pass:

- `npm run build --workspace=packages/protocol`
- `npm run build --workspace=apps/relay`
- `npm test --workspace=apps/relay`
- `npm run lint --workspace=apps/web`
- `npm run build --workspace=apps/web`
- `cargo check -p emberchamber-relay-protocol`

## Expected Follow-Up Work

- add invite listing that can safely re-share existing invite links without exposing unhashed token
  material
- add native community and room controls for Android and desktop
- add community analytics, invite audit trails, and stronger operator tooling
- move remaining browser routes off legacy assumptions like `/app/channel/[id]`
- decide whether community roles need finer-grained moderation and room-management permissions
