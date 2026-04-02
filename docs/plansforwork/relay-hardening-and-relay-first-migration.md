# Relay Hardening And Relay-First Migration Plan

## Implementation Status

- Created on 2026-04-02 as the working plan for the relay-first migration program.
- The repo now contains the first implementation slice of this plan:
  - relay conversation index and metadata search endpoints
  - mailbox cleanup path, idempotency, and backlog caps
  - attachment encryption metadata and encrypted browser DM uploads
  - relay-native web DM, search, and group chat flows
  - manual relay deployment workflow and cleanup queue consumer wiring
- Remaining work still exists, especially around encrypted group rollout across every client, passkey/recovery completion, and fully removing legacy operator assumptions.

## Summary

- Goal: make `apps/relay` the single backend for the beta by hardening the current Worker runtime, removing the web app’s dependency on legacy `apps/api`, and migrating messaging and attachments toward encrypted relay transport without trying to solve passkeys or full recovery in this program.
- Success criteria: `relay.emberchamber.com` remains stable in production; web, mobile, and desktop all use relay for DM/group/invite/session flows; readable group history in D1 is no longer the long-term write path; attachment uploads become client-encrypted for the new path; relay has deployment automation, route-level tests, retention cleanup, and bounded observability.

## Scope

- In scope: `apps/relay`, `packages/protocol`, `crates/relay-protocol`, relay-facing parts of `apps/web`, D1 migrations, Durable Objects, queues, deployment workflow, health/readiness, joined-space metadata search, and compatibility shims for current mobile/desktop group flows.
- Out of scope: new passkey UX, major trusted-device recovery redesign, legacy channel/discover parity, server-side search over message content, and re-encrypting historical plaintext group messages already stored in D1.

## Defaults Chosen

- Program shape: phased full program.
- Auth stance: messaging first; auth gets only regression fixes and operational hardening in this plan.
- Web target: trim web to DM/group/invite/settings/joined-space search; do not rebuild legacy channels or discover.
- Migration stance: additive first, then cutover, then removal; avoid breaking mobile/desktop until replacement APIs are live.
- Real-time stance: mailbox polling remains the initial browser delivery mechanism; no WebSocket or SSE requirement for first cutover.

## Primary Touchpoints

- Relay entrypoint: [apps/relay/src/index.ts](/home/jason/gh/PrivateMesh/apps/relay/src/index.ts)
- Mailbox and coordination DOs: [apps/relay/src/do/device-mailbox.ts](/home/jason/gh/PrivateMesh/apps/relay/src/do/device-mailbox.ts) and [apps/relay/src/do/group-coordinator.ts](/home/jason/gh/PrivateMesh/apps/relay/src/do/group-coordinator.ts)
- Relay config and environments: [apps/relay/wrangler.jsonc](/home/jason/gh/PrivateMesh/apps/relay/wrangler.jsonc)
- Relay schema history: [apps/relay/migrations](/home/jason/gh/PrivateMesh/apps/relay/migrations)
- TS contracts: [packages/protocol/src/index.ts](/home/jason/gh/PrivateMesh/packages/protocol/src/index.ts)
- Rust contracts: [crates/relay-protocol/src](/home/jason/gh/PrivateMesh/crates/relay-protocol/src)
- Web relay client: [apps/web/src/lib/relay.ts](/home/jason/gh/PrivateMesh/apps/web/src/lib/relay.ts)
- Web relay-local workspace: [apps/web/src/lib/relay-workspace.ts](/home/jason/gh/PrivateMesh/apps/web/src/lib/relay-workspace.ts)

## Public API And Type Changes

- Add `ConversationSummary`, `ConversationDetail`, `ConversationHistoryMode`, `ConversationSearchResult`, and `AttachmentEncryptionMode` to both TS and Rust protocol packages; make Rust/TS parity a release gate.
- Add `GET /v1/conversations` to list DMs and groups with metadata only: `id`, `kind`, `title`, `memberAccountIds`, `historyMode`, `updatedAt`, `lastMessageAt`, `lastMessageKind`, and capability flags.
- Add `GET /v1/conversations/:conversationId` for conversation metadata and membership; keep `POST /v1/dm/open` as the DM creation/reuse primitive.
- Add `GET /v1/search?q=` for joined-space metadata search only; return matching group titles and DM peers, never message content.
- Add `GET /v1/groups/:groupId/messages` response field `historyMode`; when encrypted groups ship, old endpoint remains a compatibility alias for `relay_hosted` groups only and returns `409 HISTORY_MODE_UNSUPPORTED` for encrypted groups.
- Extend `POST /v1/attachments/ticket` to accept `encryptionMode`, `ciphertextByteLength`, `ciphertextSha256B64`, `plaintextByteLength`, and `plaintextSha256B64`; return `encryptionMode` in `AttachmentTicket`.
- Keep `/v1/messages/batch`, `/v1/mailbox/sync`, and `/v1/mailbox/ack` as the ciphertext transport; do not add a second DM transport.
- Add `/ready` for binding-aware readiness checks; keep `/health` as a shallow liveness endpoint.

## Data Model And Migration Plan

- Create a migration adding `conversations.history_mode TEXT NOT NULL DEFAULT 'relay_hosted'`, `conversations.last_message_at TEXT`, and `conversations.last_message_kind TEXT`; set existing DMs to `device_encrypted` and existing groups to `relay_hosted`.
- Create a migration adding attachment encryption metadata columns and soft-delete fields; keep plaintext attachment rows readable for existing clients until cutover completes.
- Do not migrate old plaintext group messages into encrypted history; treat `conversation_messages` as legacy history for existing groups and a deprecated write path.
- Introduce one-way encrypted group cutover: new encrypted groups use mailbox fanout plus local history only; legacy groups stay relay-hosted until clients are migrated, then become read-only and eventually archival.
- Add retention bookkeeping for expired auth challenges, device links, invites, mailbox envelopes, and orphaned attachments; cleanup is queue-driven with DO alarms only where per-object wakeups are cleaner than global scans.

## Milestones

1. Baseline hardening: add `staging` env to Wrangler, add `/ready`, structured privacy-safe request logging, correlation IDs, route-level error code coverage, and a dedicated relay deploy workflow that runs protocol build, relay tests, D1 migrations, Worker deploy, and post-deploy health checks.
2. Contract hardening: normalize TS/Rust protocol parity, add the new conversation and attachment encryption types, document all relay error codes in `docs/api/relay-http.md`, and make protocol build plus Rust tests mandatory before relay deploy.
3. Mailbox reliability: cap mailbox backlog per device, enforce idempotency on `clientMessageId`, expire envelopes automatically, wire `CLEANUP_QUEUE`, and expose operational counters for enqueued, acked, expired, rejected, and blocked deliveries.
4. Attachment security: support encrypted blob uploads as the default for new DM and encrypted-group sends, verify size and checksum at upload time, persist encryption metadata only, and schedule purge of expired attachment blobs and rows.
5. Relay-native DM completeness: add conversation list/detail and metadata search endpoints, make browser DM UX rely on relay metadata plus mailbox sync instead of legacy `apps/api`, and persist browser local message history in client storage rather than on the relay.
6. Web cutover: migrate `/app`, `/app/new-dm`, `/app/chat/[id]`, `/app/new-group`, `/app/settings`, and `/app/search` to relay-only flows; remove or redirect `/app/new-channel`, `/app/channel/[id]`, and `/app/discover`; delete authenticated legacy API usage from `apps/web/src/lib/api.ts`.
7. Encrypted group rollout: add encrypted group creation behind a server flag, reuse mailbox transport for group fanout, stop writing new message bodies to `conversation_messages` for encrypted groups, and leave legacy groups on compatibility endpoints until all clients support the new mode.
8. Removal and closeout: remove remaining web dependency on `apps/api` for authenticated messaging, deprecate plaintext attachment issuance for new sends, mark relay-hosted group history as legacy-only, and publish operator-facing runbooks for deploy, rollback, queue lag, and cleanup failures.

## Testing And Acceptance

- Add Cloudflare Worker integration tests that exercise D1, Durable Objects, and bindings inside the Workers runtime; use Cloudflare’s Vitest integration as the default test harness.
- Add route tests for auth start/complete, session refresh/revoke, DM open, conversation list/detail, mailbox enqueue/sync/ack, blocked-user rejection, stale epoch rejection, invite preview/accept, attachment ticketing, and report submission.
- Add retention tests proving expired envelopes disappear, expired attachments are purged from both D1 and R2, and duplicate `clientMessageId` sends are idempotent.
- Add cross-client compatibility tests proving existing mobile/desktop group endpoints keep working during migration and encrypted-group clients fail closed against legacy-only routes.
- Acceptance gate for web cutover: a new user can authenticate, open a DM, send and receive encrypted messages, join a group, upload an encrypted attachment, search joined spaces, review sessions, and do all of it without `apps/api`.
- Acceptance gate for encrypted groups: new encrypted groups never write readable message bodies to D1, attachments are encrypted before upload, and members removed at epoch `N+1` cannot decrypt or receive messages for that group after rotation.

## Rollout And Operations

- Ship in order: staging validation, production shadow release for additive endpoints, browser DM cutover, encrypted attachment default for new sends, encrypted-group opt-in, legacy route retirement.
- Add dashboards or log-derived monitors for `/ready` failures, D1 query failures, queue backlog, mailbox backlog by device, attachment purge failures, and 4xx/5xx rates by endpoint.
- Add rollback rules: API additions are safe to leave deployed; cutovers must be guarded by env flags; encrypted-group creation remains off in production until all three clients pass compatibility tests.
- Keep logging privacy-safe: never log plaintext emails, message bodies, ciphertext payloads, raw attachment URLs, or full invite tokens.

## Assumptions

- Existing `relay.emberchamber.com` deployment remains the production target and Cloudflare Worker architecture is retained.
- Mobile and desktop continue using current `/v1/groups/*` flows until conversation index and encrypted-group support land.
- Browser message history is local-first; the relay is not expected to serve historical DM plaintext.
- Joined-space search means account labels and conversation metadata only.
- Passkeys and deeper recovery remain future work after this relay program unless a blocking production bug forces narrow auth changes.

## External References

- Cloudflare recommends the Workers Vitest integration for route and binding tests: https://developers.cloudflare.com/workers/testing/ and https://developers.cloudflare.com/workers/testing/vitest-integration/
- Queue consumers should be implemented with a Worker `queue()` handler: https://developers.cloudflare.com/queues/get-started/ and https://developers.cloudflare.com/queues/reference/how-queues-works/
- Durable Object alarms are appropriate for per-object scheduled cleanup: https://developers.cloudflare.com/durable-objects/api/alarms/
