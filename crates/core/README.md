# emberchamber-core

## Purpose

Cross-platform local-first sync and secure state engine. This crate defines durable client state types, epoch management, outbox handling, and media vault primitives used by the desktop shell and future client surfaces.

## Responsibilities

- `DeviceProfile`: Persisted device identity and label
- `ConversationState`: Epoch tracking and acknowledged envelope management for each conversation
- `ClientState`: Root aggregate for local-first sync state (conversations, outbox, media vault, contact labels)
- `PersistedOutboxEntry`: Durable outbound message queue with staleness detection
- `MediaVaultEntry`: Downloaded attachment metadata for local vault management
- `ContactLabel`: Local contact labeling for pseudonymous identity

This crate is **protocol-durable**, not protocol-flexible. Types are defined here (not re-exported from `emberchamber-relay-protocol`) so relay-protocol changes cannot silently alter the persistence shape.

## Boundary Rules

- Types in this crate must not embed `emberchamber-relay-protocol` types directly
- Conversion functions (`from_cipher_envelope`, `to_cipher_envelope`) handle the relay-core boundary
- Serialization format must remain stable for local-first persistence

## Dependencies

- [`emberchamber-domain`](../domain): Shared domain types (`AccountId`, `ConversationId`, `DeviceId`)
- [`emberchamber-relay-protocol`](../relay-protocol): Protocol types for envelope conversion

## Verification

```bash
cargo test -p emberchamber-core
```

## Related

- [`../relay-protocol`](../relay-protocol): Canonical Rust relay contracts
- [`../../packages/protocol`](../../packages/protocol): TypeScript mirror of protocol types
- [`../../docs/architecture.md`](../../docs/architecture.md): Architecture context
