# @emberchamber/protocol

## Purpose

TypeScript mirror of the canonical Rust relay contracts. This package defines the shared types used by `apps/relay`, `apps/web`, `apps/mobile`, and `apps/desktop` for the relay API contract.

## Module Structure

| Module | Exports |
| ------ | ------- |
| `src/index.ts` | Core types: `CipherEnvelope`, `DeviceKeyBundle`, `ConversationDescriptor`, `AuthSession`, etc. |
| `src/e2ee.ts` | End-to-end encryption helpers (exported through index) |
| `src/device-link.ts` | Device linking types and validators (exported through index) |

## Type Categories

### Identity Types

- `AccountId`, `DeviceId`, `ConversationId`, `SessionId`, `GroupEpoch`

### Auth and Session Types

- `AuthStartRequest`, `AuthCompleteRequest`, `AuthSession`, `MagicLinkChallenge`
- `PrivacySettings`, `MeProfile`, `SessionDescriptor`

### Envelope and Mailbox Types

- `CipherEnvelope`: Encrypted message envelope for relay transport
- `DeviceKeyBundle`, `PrekeyBundle`: Device key registration
- `EnvelopeBatch`, `MailboxAck`, `MailboxCursor`: Mailbox sync operations

### Conversation Types

- `ConversationDescriptor`, `ConversationDetail`, `ConversationSummary`
- `GroupMember`, `GroupThreadMessage`, `ConversationInviteDescriptor`

### Safety Types

- `ReportDisclosure`, `ReportReason`, `SafetyEvent`

## Protocol Parity Rule

This package must stay in **exact parity** with `crates/relay-protocol`. Changes to request/response shapes require matching edits on both the TypeScript and Rust sides.

## Dependencies

None (standalone TypeScript package with no workspace dependencies)

## Verification

```bash
npm run build --workspace=packages/protocol
npm test --workspace=packages/protocol
```

Parity tests use fixture JSON files in `test/parity-fixtures.test.mjs`.

## Related

- [`../../crates/relay-protocol`](../../crates/relay-protocol): Canonical Rust protocol types
- [`../../docs/api/relay-http.md`](../../docs/api/relay-http.md): HTTP API endpoint reference
