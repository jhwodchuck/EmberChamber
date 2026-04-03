# Operator Playbook

Operational procedures for the invite-only EmberChamber beta. Actions are limited to what the relay runtime currently supports; gaps are called out explicitly.

## Tool Reality

| Need | Current path | Notes |
|------|-------------|-------|
| Review or revoke your own sessions | Web / mobile / desktop Settings → Sessions | Self-service only |
| Create or revoke group invites | Group surface (owner/admin), or members if `allowMemberInvites` is on | No global freeze UI |
| Remove a group member | Group surface (owner/admin) | Bumps group epoch |
| Submit a disclosure-based report | Relay `POST /v1/reports` | Stored; no operator dashboard yet |
| Issue a beta invite token | Manual D1 command (see below) | No operator UI yet |
| Suspend an account or revoke another user's sessions | **Not implemented** | Requires engineering or direct DB intervention |

## Invite Defaults

Always mint invites with conservative limits:

- `maxUses` ≤ 12
- `expiresInHours` ≤ 72
- `allowMemberInvites` off unless the group owner explicitly enables it

## Minting a Beta Invite Token

```bash
cd apps/relay
TOKEN="your-invite-token"
HASH=$(printf 'invite:%s' "$TOKEN" | sha256sum | awk '{print $1}')
npx wrangler d1 execute emberchamber-relay-prod-db --env production --remote \
  --command "INSERT INTO beta_invites \
    (token_hash, created_at, expires_at, max_uses, use_count, created_by, revoked_at) \
    VALUES ('$HASH', datetime('now'), NULL, 10, 0, 'operator', NULL);"
```

## Compromised Device Response

1. Identify which device label is still trusted with the user.
2. Have them revoke unfamiliar or stale sessions from a trusted client.
3. If a sensitive group may have been exposed, ask the owner/admin to revoke active invites and remove affected members.
4. If all devices are lost, force a fresh magic-link bootstrap and treat the account as a new device identity. Full trusted-device recovery handoff is not yet complete.
5. Document manually: account ID, group ID, affected session IDs, any `reportId`.

## Leaked Invite or Boundary Change

1. Revoke every known leaked invite for the group immediately.
2. Create a fresh invite with tighter expiry and use-count limits.
3. Remove members if the boundary has already been crossed.
4. Document manually. (An invite-freeze flag exists in the schema but has no relay endpoint or UI today.)

## Disclosure-Based Report Handling

- Require minimal evidence. Do not ask for unrelated chat history.
- Ask reporters to include the group or account involved plus specific message IDs, attachment IDs, or the invite path.
- Preserve the returned `reportId`.
- Triage notes must live out of band until an operator dashboard is built.

## Immediate Harm Escalation

Prioritize these report categories for engineering escalation:
- `non_consensual_intimate_media`
- `coercion_or_extortion`
- `underage_risk`
- `csam`
- Credible impersonation or extortion

The relay **cannot** currently suspend an account or revoke another user's sessions via an API. For urgent cases, escalate to direct infrastructure / database access and document every manual action taken.

## Communication Standards

- ✅ Describe the beta as: invite-only, disclosure-based, mid-migration toward stronger E2EE.
- ✅ DMs: ciphertext mailbox delivery — the relay does not see plaintext.
- ✅ Groups: relay-hosted today, migrating toward end-to-end encryption.
- ❌ Do not describe current group threads as fully E2EE.
- ❌ Do not describe the product as anonymous, uncensorable, or law-proof.
- ❌ Do not use public-discovery language.

## Cloudflare Worker Secret Rotation

```bash
cd apps/relay
npx wrangler secret put RESEND_API_KEY      # magic-link email
npx wrangler secret put JWT_SECRET          # session signing
npx wrangler secret put ENCRYPTION_KEY      # email-at-rest encryption
```

## Android Release Signing (CI)

Signing credentials are stored as GitHub Actions secrets — never committed to the repo:

| Secret | Purpose |
|--------|---------|
| `ANDROID_KEYSTORE_BASE64` | Base64-encoded release keystore |
| `ANDROID_KEY_ALIAS` | Key alias (`emberchamber`) |
| `ANDROID_STORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_PASSWORD` | Key password |
| `ANDROID_GOOGLE_SERVICES_JSON` | Firebase Android config |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Play Store deployment credentials |

**Back up the keystore.** If it is lost, no further updates can be published under the same Play Store listing.

To re-register the keystore after a machine reset:

```bash
base64 -w 0 apps/mobile/secrets/emberchamber-release.keystore \
  | gh secret set ANDROID_KEYSTORE_BASE64
gh secret set ANDROID_KEY_ALIAS       --body "emberchamber"
gh secret set ANDROID_STORE_PASSWORD  --body "<password>"
gh secret set ANDROID_KEY_PASSWORD    --body "<password>"
```
