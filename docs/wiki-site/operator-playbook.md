# Operator Playbook

Operational procedures for the invite-only EmberChamber beta. Actions are limited to what the relay runtime currently supports; gaps are called out explicitly.

## Tool Reality

| Need                                                 | Current path                                                          | Notes                                          |
| ---------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------- |
| Review or revoke your own sessions                   | Web / mobile / desktop Settings → Sessions                            | Self-service only                              |
| Create or revoke group invites                       | Group surface (owner/admin), or members if `allowMemberInvites` is on | No global freeze UI                            |
| Remove a group member                                | Group surface (owner/admin)                                           | Bumps group epoch                              |
| Submit a disclosure-based report                     | Relay `POST /v1/reports`                                              | Reviewed in the operator console (`/app/admin`) |
| Review and action reports                            | Operator console `/app/admin` (operator accounts)                     | Status queue; every action is audited          |
| Force-signout another user & issue a recovery link   | Operator console `/app/admin/account`                                 | `/v1/admin/accounts/:id/recovery-handoff`      |
| Read the operator audit log                          | Operator console `/app/admin/audit`                                   | Permanent record of operator actions           |
| Issue a beta invite token                            | Manual D1 command (see below)                                         | No operator UI yet                             |
| Suspend an account (block re-auth)                   | **Not implemented**                                                   | Force-signout exists; full suspension does not |

## Operator Console

`/app/admin` in the web app, visible only to accounts with the `is_operator` flag:

- **Reports** (`/app/admin`) — status queue (open → reviewing → actioned → dismissed) with disclosure payloads; each transition is audited.
- **Account actions** (`/app/admin/account`) — look up an account, force-signout all sessions, and issue an account-recovery link (single-use magic link re-bootstrapping a fresh device on the same identity; expires in 24h).
- **Audit log** (`/app/admin/audit`) — read-only record of all operator and break-glass actions.

Seed the first operator with the shared admin secret (no self-service):

```bash
curl -fsS -X POST https://relay.emberchamber.com/v1/admin/grant-operator \
  -H "authorization: Bearer $EMBERCHAMBER_ADMIN_SECRET" \
  -H "content-type: application/json" \
  -d '{"accountId":"<uuid>","isOperator":true}'
```

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
4. If all devices are lost, run an **account recovery handoff** from `/app/admin/account` — it force-signs-out every session and issues a single-use magic link on the same account identity. (Passkey-based trusted-device recovery is still deferred.)
5. Session revocations and the handoff are captured in the audit log; add account ID, group ID, and any `reportId` for context.

## Leaked Invite or Boundary Change

1. Revoke every known leaked invite for the group immediately.
2. Create a fresh invite with tighter expiry and use-count limits.
3. Remove members if the boundary has already been crossed.
4. For communities, toggle invite-freeze from community settings (web/mobile) to pause new joins while you re-issue invites. The freeze is audited.

## Disclosure-Based Report Handling

- Require minimal evidence. Do not ask for unrelated chat history.
- Ask reporters to include the group or account involved plus specific message IDs, attachment IDs, or the invite path.
- Preserve the returned `reportId`.
- Triage in the operator console: move the report through reviewing → actioned/dismissed and record the outcome in the resolution note.

## Immediate Harm Escalation

Prioritize these report categories for engineering escalation:

- `non_consensual_intimate_media`
- `coercion_or_extortion`
- `underage_risk`
- `csam`
- Credible impersonation or extortion

Operators can **force-signout all of an account's sessions** (and revoke push tokens) via the recovery-handoff action in `/app/admin/account`. Full account *suspension* (blocking re-auth) is still not implemented — escalate those to engineering. Routine operator actions are captured in the audit log.

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

| Secret                             | Purpose                           |
| ---------------------------------- | --------------------------------- |
| `ANDROID_KEYSTORE_BASE64`          | Base64-encoded release keystore   |
| `ANDROID_KEY_ALIAS`                | Key alias (`emberchamber`)        |
| `ANDROID_STORE_PASSWORD`           | Keystore password                 |
| `ANDROID_KEY_PASSWORD`             | Key password                      |
| `ANDROID_GOOGLE_SERVICES_JSON`     | Firebase Android config           |
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
