# emberchamber-relay-protocol

## Purpose

Canonical Rust relay envelope types, signing, and protocol definitions. This crate mirrors the TypeScript protocol types in `packages/protocol` and is the source of truth for the Cloudflare Worker relay contract.

## Module Structure

| Module | Types/Functions |
| ------ | --------------- |
| `auth` | `AuthStartRequest`, `AuthCompleteRequest`, `AuthSession`, `MagicLinkChallenge`, `PrivacySettings`, `MeProfile`, `SessionDescriptor`, `PasskeyCredentialRef` |
| `envelope` | `CipherEnvelope`, `DeviceKeyBundle`, `PrekeyBundle`, `RelayEnvelope`, `RelayReceipt` |
| `mailbox` | `EnvelopeBatch`, `MailboxAck`, `MailboxCursor`, `MailboxStats` |
| `conversation` | `ConversationDescriptor`, `ConversationDetail`, `ConversationSummary`, `GroupMember`, `ConversationInviteDescriptor`, `SafetyEvent`, `GroupEpoch`, `RoomAccessPolicy` |
| `device_link` | `DeviceLinkStartRequest`, `DeviceLinkQrPayload`, `DeviceLinkState`, etc. |
| `moderation` | `ReportDisclosure`, `ReportReason` |

## Protocol Mirror Rule

This crate must stay in **exact parity** with `packages/protocol`. Protocol changes require matching edits on both sides.

## Dependencies

- [`emberchamber-domain`](../domain): Domain types (`AccountId`, `ConversationId`, etc.)

## Verification

```bash
cargo test -p emberchamber-relay-protocol
```

Protocol parity tests live in `tests/protocol_parity.rs`.

## Related

- [`../../packages/protocol`](../../packages/protocol): TypeScript protocol mirror
- [`../core`](../core): Local-first durable types that must not embed protocol types
- [`../../docs/api/relay-http.md`](../../docs/api/relay-http.md): HTTP API reference
