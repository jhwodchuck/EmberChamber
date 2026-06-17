# Phase 2 Completion Plan — Mobile Parity & Test Coverage

**Date:** 2026-06-15
**Completed:** 2026-06-16
**Status:** Done

This plan closes the two outstanding gaps that keep Phase 2 (Closed Beta Expansion) from being
truly done. See the authoritative status block in [`../roadmap.md`](../roadmap.md): the relay
backend and web client for communities/rooms are implemented; the Android client has no
community/room surface, and there is no test coverage for communities/rooms on either the relay or
the protocol parity suite.

Two independent workstreams. **B (tests) should land first or in parallel** — it locks the contract
the relay already exposes, so the mobile client (A) builds against a verified surface. No relay
wire-contract changes are needed for either; the backend is already complete, so there is **no
`packages/protocol` payload change** and thus no new Rust/TS parity *fields* — only new parity
*fixtures* asserting the existing community/room shapes.

## Workstream B — Test coverage (do first)

### B1. Relay integration tests

Extend `apps/relay/test/routes.test.ts` (or add `apps/relay/test/communities.test.ts`) using the
same `unstable_dev` + `bootstrapAccount` harness already in `routes.test.ts`.

Cover the endpoints already shipped in `apps/relay/src/handlers/conversations.ts` and
`apps/relay/src/services/invites.ts`:

- `POST /v1/communities` → asserts `kind:"community"`, a default room is created, and the 150-member
  cap rejects oversized initial member lists.
- `PATCH /v1/communities/:id/policies` → `allowMemberInvites` + `inviteFreezeEnabled` round-trip.
- Member invite gating: member-created invite **rejected** when `allowMemberInvites=false`,
  **accepted** when true.
- Room-scoped invite (`scope:"room"`) → accept lands the joiner in the room.
- `inviteFreezeEnabled=true` → accept fails with `INVITES_FROZEN`.
- Organizer controls: room-access revoke returns `Only organizers can revoke room access` for
  non-organizers; `removeCommunityMember` drops the member from all member-rooms.
- Community-scoped search (`?communityId=`) returns only joined-community results and 404s
  (`COMMUNITY_NOT_FOUND`) for non-members.

### B2. Protocol parity fixtures

Extend `packages/protocol/test/fixtures/protocol-parity.json` + the assertions in
`packages/protocol/test/parity-fixtures.test.mjs`, and the mirror Rust parity test for
`crates/relay-protocol/src/conversation.rs`. Add fixtures for the `Community`/`Room`
`ConversationSummary`/`ConversationDetail` shapes (`rooms`, `allow_member_invites`,
`invite_freeze_enabled`, `scoped_community_id`, room invite preview) so the Rust↔TS contract for
communities cannot drift silently.

### Verify B

- `npm test --workspace=apps/relay`
- **Both** `npm test --workspace=packages/protocol` *and* `cargo test -p emberchamber-relay-protocol`
  (parity discipline from `CLAUDE.md`).

## Workstream A — Mobile (Android) community/room surface

The Expo client has no community surface; `apps/mobile/src/lib/relayClient.ts` only has generic
`fetchRelayJson`/`relayFetch` helpers. Web's
`apps/web/src/app/app/community/[id]/page.tsx` is the behavioral spec to port (CSS→RN, per the
polish-roadmap translation principle).

### A1. Data layer

Add community methods to `relayClient.ts` mirroring web's `relayConversationApi`:
`getConversation(id)`, `updateCommunityPolicies`, `createRoom`, `createInvite`, `addRoomMember`,
`removeRoomMember`, `removeCommunityMember`, and `listConversations({ communityId })`. Reuse the
protocol `ConversationDetail` types — no new types.

### A2. Surfacing communities in the list

In `ChatListScreen.tsx`, render `kind:"community"` entries distinctly and route taps to a new
community screen. The app uses a hand-rolled tab switch in `MainScreen.tsx` (not react-navigation),
so wire it the same way — no nav-stack migration, consistent with the android-polish-roadmap's
opt-in stance.

### A3. `CommunityScreen.tsx` (+ `communityScreen.styles.ts`)

Capability-gated like web (`capabilities.canManagePolicies / canManageRooms / canGrantRoomAccess /
canManageMembers / canCreateInvites`):

- Header: title, member/room counts, invite-policy badge.
- Rooms list → open room thread in `ConversationScreen` (rooms are conversations; `/app/chat/:roomId`
  analog).
- Organizer-only: policy toggles, create-room form, room-access grant/revoke, mint invite (community
  + room scope), member removal.
- Read-only members view for non-organizers.

### A4. Community-scoped search

Pass `communityId` into the existing mobile search path so scoped search works on Android.

### Verify A

- `npm run verify --workspace=apps/mobile` (expo-doctor + type-check).
- Manual emulator run: create community → create room → mint room invite → join from a second
  account → scoped search → freeze invites.
- Keep root `overrides` intact (no new React-pulling deps).

## Sequencing & parallelization

1. **B1 + B2** first — verify the shipped backend and lock the contract.
2. **A1** (depends on the now-verified API), then **A2/A3/A4**, which can split across agents if they
   own disjoint files (per the android-polish-roadmap parallelization note).
3. On completion, flip the Phase 2 "Outstanding" items to done in [`../roadmap.md`](../roadmap.md)
   and reassess Phase 3.

## Out of scope

Any relay/protocol payload change, voice messages, react-navigation migration, iPhone/macOS.
