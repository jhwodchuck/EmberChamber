# Security — Threat Model

See the [MVP Plan](../../README.md) for the full security, privacy, and trust/safety design.

## Threat categories

| Threat | Mitigation |
|--------|-----------|
| Account takeover | Passkeys (WebAuthn), device verification, step-up auth |
| Spam / raids | Reputation scoring, new-account sandboxing, invite trust levels, anti-raid toggles |
| Malicious attachments | MIME allowlist, executable block, malware scan on hosted spaces |
| Rogue / compromised operator | Signed relay envelopes, certificate revocation, relay traffic freeze |
| Insider abuse | Least-privilege access, audited moderator workflows, immutable audit log |
| Metadata scraping | Hashed IP/UA in long-lived tables, short TTL for presence/typing |
| Relay replay / forgery | Ed25519 signatures on relay envelopes, idempotency keys, certificate pinning |
| Lawful-process overreach | Honest product claims, transparent policies, no operator-readable E2EE escrow |

## Privacy model

- **DMs**: client-encrypted end to end. Operators see only routing and device metadata.
- **Groups / channels**: server-managed in MVP. Operators can access content under role-gated, audited tools.
- **Logs**: never log DM plaintext, attachment plaintext, or decrypted report evidence.

## Key management

- Session tokens: device-bound, Redis-backed revocation fan-out.
- Relay signing keys: KMS-backed in production, sealed-secret injection for Kubernetes.
- Operator certificates: issued by `directory-ca`, revocable in real time.
- Encrypted backup: user-controlled; no operator-readable escrow.
