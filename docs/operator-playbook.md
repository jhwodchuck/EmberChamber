# EmberChamber Operator Playbook

## Purpose

This playbook covers how to operate the current invite-only beta. It is limited to actions the repo
supports today and calls out where engineering or direct database access is still required.

## Tool Reality

| Need                                                                             | Current path                                                                          | Notes                                                                                                       |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Review or revoke your own sessions                                               | Web, mobile, or desktop settings backed by relay `/v1/sessions`                       | Self-service only.                                                                                          |
| Create or revoke group invites                                                   | Relay group surfaces for owners/admins, or members if `allowMemberInvites` is enabled | There is no global invite-freeze UI.                                                                        |
| Remove a group member                                                            | Relay group surface for owners/admins                                                 | Bumps relay-side group epoch.                                                                               |
| Submit a disclosure-based report                                                 | Relay `/v1/reports`                                                                   | Reviewed in the operator console (`/app/admin`) by operator accounts.                                       |
| Review and action reports                                                        | Operator console `/app/admin` (operator accounts)                                     | Queue with status transitions (open → reviewing → actioned → dismissed); every action is audited.          |
| Force-signout all of another user's sessions and issue an account-recovery link  | Operator console `/app/admin/account`, backed by `/v1/admin/accounts/:id/recovery-handoff` | Revokes every active session and mints a single-use magic link on the same account identity.           |
| Read the operator audit log                                                      | Operator console `/app/admin/audit`, backed by `/v1/admin/audit-log`                  | Permanent record of operator and break-glass actions.                                                      |
| Issue bootstrap beta invite tokens                                               | Manual today                                                                          | Use direct D1 access to `beta_invites` or the configured dev token in development. There is no operator UI. |
| Suspend an account or bulk-review reports                                         | Partially: force-signout + recovery handoff exist; account suspension and bulk review do not | Suspension still requires engineering or direct infrastructure/database intervention.                |

## Operator Console

The operator console lives at `/app/admin` in the web app and is visible only to accounts with the
`is_operator` flag. It backs onto operator-session-gated relay endpoints (distinct from the
shared-secret `/v1/admin/*` break-glass endpoints).

### Seeding the first operator

Operator status is not self-service. Bootstrap it with the shared admin secret
(`EMBERCHAMBER_ADMIN_SECRET`), which is the scriptable form of editing D1 directly:

```bash
# accountId is the target account's UUID (look it up via the console once a
# first operator exists, or from D1 during initial bootstrap).
curl -fsS -X POST https://relay.emberchamber.com/v1/admin/grant-operator \
  -H "authorization: Bearer $EMBERCHAMBER_ADMIN_SECRET" \
  -H "content-type: application/json" \
  -d '{"accountId":"<uuid>","isOperator":true}'
```

The equivalent raw D1 path is `UPDATE accounts SET is_operator = 1 WHERE id = '<uuid>'`. The grant
is recorded in the audit log.

### Report queue

`/app/admin` lists reports newest-first with a status filter. Open a report to see its
disclosure payload and evidence message IDs, then mark it **reviewing**, **actioned**, or
**dismissed** with an optional resolution note. Each transition writes an audit row and stamps the
acting operator.

### Account recovery handoff (lost all devices)

`/app/admin/account` looks up an account by ID or email (matched via the blind index — plaintext
email is never shown). The **recovery handoff** action force-signs-out every active session and
mints a single-use magic link that re-bootstraps a fresh device on the *same* account identity.
Deliver that link to the verified account holder out-of-band; it expires in 24 hours. This is the
supported answer to "I lost all my devices."

### Audit log

`/app/admin/audit` is a read-only, paginated view of every operator and break-glass action
(session revocation, recovery handoff, report transitions, policy changes, member removals,
operator grants). Use it to confirm what action was taken, by whom, and when.

## Invite Defaults

- Treat every group invite as deliberate access, not as a growth loop.
- Keep `maxUses` at 12 or lower by default.
- Keep `expiresInHours` at 72 or lower by default.
- Leave `allowMemberInvites` off unless the group owner explicitly opens it up.
- Ask hosts to set a join rule before the first invite is shared.
- Revoke leaked invites individually as soon as the boundary changes.

## Compromised Device Response

1. Ask the user which device label is still trusted.
2. Have them revoke unfamiliar or stale sessions from a remaining trusted client.
3. If a sensitive group may have been exposed, ask the group owner or admin to revoke active invites and remove members as needed.
4. If all devices are lost, run an **account recovery handoff** from `/app/admin/account`. It force-signs-out every session and issues a single-use magic link that re-bootstraps a new device on the same account identity. (Passkey-based trusted-device recovery is still deferred.)
5. The recovery handoff and any session revocations are captured in the audit log; add account ID, group ID, and any `reportId` for context.

## Leaked Invite Or Boundary Change

1. Revoke every known leaked invite for the group.
2. Create a fresh invite with tighter expiry and use-count limits.
3. Remove members if the boundary has already been crossed.
4. For communities, toggle the invite-freeze policy from the community settings (web and mobile) to pause all new joins while you re-issue invites. The freeze is recorded in the audit log.

## Disclosure-Based Report Handling

- Require minimal evidence only. Do not ask for unrelated chat history.
- Ask reporters to include the group or account involved plus the specific message IDs, attachment IDs, or invite path they are disclosing.
- Preserve and reference the returned `reportId`.
- Triage in the operator console (`/app/admin`): move the report through reviewing → actioned/dismissed and capture the outcome in the resolution note. Escalation state now lives in the report status rather than out of band.

## Immediate Harm Escalation

- Prioritize `non_consensual_intimate_media`, `coercion_or_extortion`, `underage_risk`, `csam`, and credible impersonation/extortion reports.
- Operators can immediately **force-signout all of an account's sessions** via the recovery-handoff action in `/app/admin/account` (it also revokes push tokens). Full account *suspension* (blocking re-auth) is still not implemented and requires engineering/infrastructure intervention.
- For cases needing suspension or data preservation beyond session revocation, escalate to engineering and document exactly what manual action was taken. Routine operator actions are already captured in the audit log.

## Communication Defaults

- Do not describe the current relay-native group thread or attachment flow as fully E2EE.
- Do describe the beta as invite-only, disclosure-based, with new device-encrypted groups and a few legacy compatibility paths still being retired.
- Keep public language discreet and privacy-first.

## iOS / macOS Build Prerequisites

### iOS (Expo EAS)

Building an iOS binary requires an Apple Developer Program membership and EAS credentials. No Apple
credentials are committed to the repo — set them up on the machine that will trigger the build.

1. **Apple Developer account** — enroll at `developer.apple.com`. The Team ID appears on your
   membership certificate and must replace the `TEAMID` placeholder in
   `apps/web/public/.well-known/apple-app-site-association` before App Store submission.
2. **EAS CLI** — `npm install -g eas-cli`, then `eas login`.
3. **EAS credentials** — from `apps/mobile/`, run `eas credentials` and follow the prompts to
   create or import a Distribution Certificate and Provisioning Profile.
4. **Build**:
   ```bash
   cd apps/mobile
   eas build --platform ios --profile production
   ```
   Use `--profile preview` for internal TestFlight distribution or `--profile development` for a
   dev client build.
5. **Submit to App Store** — after EAS builds the `.ipa`:
   ```bash
   eas submit --platform ios --latest
   ```
   This requires `APPLE_ID` and `ASC_APP_ID` environment variables (or entry in `eas.json`
   `submit.production`).

Universal links (`/invite/*`, `/auth/complete`) are driven by the
`apps/web/public/.well-known/apple-app-site-association` file already present in the web deploy.
The `associatedDomains` entitlement is wired in `app.json`.

Push notifications on iOS require a separate APN auth key or certificate. Add it to EAS via
`eas credentials` → iOS → Push Notifications. The relay FCM path does not cover APNs — a separate
`EMBERCHAMBER_APN_KEY` worker secret will be needed when iOS push is activated.

### macOS (Tauri)

The Tauri bundle config (`apps/desktop/src-tauri/tauri.conf.json`) already has `"targets": "all"`
and `macOS.minimumSystemVersion: "13.0"`. Building a notarized macOS app additionally requires:

1. **Xcode** — install from the App Store on a macOS machine (required for code-signing tools).
2. **Apple Developer account** — same as iOS above.
3. **Signing identity** — create a "Developer ID Application" certificate in Keychain Access or via
   `tauri signer generate` (the Tauri docs cover this in detail).
4. **Notarization credentials** — set `APPLE_ID`, `APPLE_PASSWORD` (app-specific password), and
   `APPLE_TEAM_ID` environment variables before running the Tauri build.
5. **Build**:
   ```bash
   cd apps/desktop
   npm run tauri build -- --target aarch64-apple-darwin  # or x86_64-apple-darwin
   ```
   The signed `.dmg` and `.app.tar.gz` land under `apps/desktop/src-tauri/target/release/bundle/`.

Notarization can be automated in CI with a macOS GitHub Actions runner using the same environment
variables. A CI macOS lane is planned but not yet wired; refer to the Tauri notarization guide in
their official documentation.

## Android Release Signing

Every Play Store update must be signed with the same keystore. Losing it means Google will not
allow any future updates to the app under the same package name.

| Property       | Value                                               |
| -------------- | --------------------------------------------------- |
| Keystore file  | `apps/mobile/secrets/emberchamber-release.keystore` |
| Store password | Stored only in `ANDROID_STORE_PASSWORD`             |
| Key alias      | Stored only in `ANDROID_KEY_ALIAS`                  |
| Key password   | Stored only in `ANDROID_KEY_PASSWORD`               |

The keystore file is gitignored and must never be committed to the repo. The credentials are
stored as GitHub Actions secrets (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEY_ALIAS`,
`ANDROID_STORE_PASSWORD`, `ANDROID_KEY_PASSWORD`, `ANDROID_GOOGLE_SERVICES_JSON`) so the CI
workflows can sign builds and include the Firebase Android app config without exposing the raw
files.

Rotate any release-signing password that has appeared in docs, chat, logs, or shell history
before the next Play Store release. Treat documented signing values as compromised even if the
keystore file itself was never committed.

**Back up the keystore.** Copy `apps/mobile/secrets/emberchamber-release.keystore` to a
secure location outside the repo (password manager, encrypted cloud backup). If it is lost
you cannot update the app on the Play Store and a new listing must be created from scratch.

To re-register the secrets after a machine reset:

```bash
cd apps/relay  # or root — just needs wrangler/gh auth
base64 -w 0 apps/mobile/secrets/emberchamber-release.keystore \
  | gh secret set ANDROID_KEYSTORE_BASE64
gh secret set ANDROID_KEY_ALIAS
gh secret set ANDROID_STORE_PASSWORD
gh secret set ANDROID_KEY_PASSWORD
gh secret set ANDROID_GOOGLE_SERVICES_JSON < apps/mobile/secrets/google-services.json
```

## Google Play Deployment Credentials

Play deployment uses a separate GitHub Actions secret:

| Secret                             | Purpose                                                                                                    |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Raw JSON key for the Google Cloud service account allowed to manage releases for `com.emberchamber.mobile` |

Set it up once:

1. In Google Play Console, note the linked Google Cloud project for the app.
2. In that Google Cloud project, enable the Google Play Developer API.
3. Create a service account JSON key for the release automation account.
4. In Google Play Console `Users and permissions`, invite that service account email and grant the release permissions needed for the target tracks.
5. Store the raw JSON as a GitHub Actions secret:

```bash
gh secret set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON < path/to/google-play-service-account.json
```

The GitHub Actions workflow
[`deploy-play-store.yml`](../.github/workflows/deploy-play-store.yml)
builds a signed AAB and uploads it to the chosen Play track.

Keep the Play API key separate from the Android signing keystore. They solve different problems:
the keystore proves the app update is yours, while the service account is what authorizes the
GitHub Actions runner to talk to Google Play.

Firebase is not the Play deployment path. Firebase is only needed for Android push configuration
and runtime messaging. The Play upload lane still goes through Google Play Console permissions plus
the Play Developer API service account.

Google Play may still require the listing to exist and the first upload to be created manually
before API-only updates work smoothly.

To mint a beta invite token for a new user when there is no operator UI:

```bash
# From apps/relay/
TOKEN="your-invite-token"
HASH=$(printf 'invite:%s' "$TOKEN" | sha256sum | awk '{print $1}')
npx wrangler d1 execute emberchamber-relay-prod-db --env production --remote \
  --command "INSERT INTO beta_invites \
    (token_hash, created_at, expires_at, max_uses, use_count, created_by, revoked_at) \
    VALUES ('$HASH', datetime('now'), NULL, 10, 0, 'operator', NULL);"
```

- Do not frame the product as anonymous, uncensorable, or law-proof.

## Android Push (FCM)

Android push is wired end-to-end in both the mobile client and the relay. The two production secrets that must be set before push delivers reliably are:

| Secret                                  | Purpose                                                                                                         |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `EMBERCHAMBER_FCM_SERVICE_ACCOUNT_JSON` | Raw JSON service account key downloaded from Firebase Console for the `com.emberchamber.mobile` project.        |
| `EMBERCHAMBER_PUSH_TOKEN_SECRET`        | A strong random secret used to encrypt push tokens stored in D1. Use a value distinct from the dev placeholder. |

To set them on the production worker:

```bash
cd apps/relay
# Paste or pipe the full Firebase service account JSON when prompted:
npx wrangler secret put EMBERCHAMBER_FCM_SERVICE_ACCOUNT_JSON --env production

# Generate and set a strong push token encryption secret:
npx wrangler secret put EMBERCHAMBER_PUSH_TOKEN_SECRET --env production
# then redeploy:
npx wrangler deploy --env production
```

The Firebase service account JSON comes from Firebase Console → Project settings → Service accounts → Generate new private key. It must belong to the Firebase project that has `com.emberchamber.mobile` registered as an Android app. The `google-services.json` placed in `apps/mobile/secrets/` is a separate Android app config file — do not confuse the two.

The relay will skip FCM sends silently when `EMBERCHAMBER_FCM_SERVICE_ACCOUNT_JSON` is absent, so missing the secret does not crash the relay but push notifications will not be delivered.

### Verify push is configured

After setting the secrets and redeploying, confirm the relay reports push as ready:

```bash
curl -s https://relay.emberchamber.com/ready | jq '{pushConfigured, features}'
```

A correctly configured relay returns:

```json
{
  "pushConfigured": true,
  "features": {
    "pushTokenSecret": true,
    "fcmServiceAccountJson": true
  }
}
```

If either flag is `false`, push notifications will be silently skipped. The deploy workflow (`deploy-relay.yml`) also emits a GitHub Actions warning annotation when `pushConfigured` is `false` so the gap is visible in the Actions run summary without blocking the deploy.

See [`docs/android-fcm-setup.md`](../docs/android-fcm-setup.md) for the Firebase Console registration steps.

## Email Delivery (Resend)

Magic-link emails are sent via the [Resend](https://resend.com) API. The relay enqueues a
`magic_link` message to `emberchamber-email-prod`, then consumes it and calls the Resend API.

`RESEND_API_KEY` is stored as a Cloudflare Worker secret on the production worker. To rotate it:

```bash
cd apps/relay
npx wrangler secret put RESEND_API_KEY --env production
# paste the new key at the prompt, then redeploy:
npx wrangler deploy --env production
```

If the key is lost or needs to be set on a new machine:

1. Log in to [resend.com](https://resend.com), generate a new API key.
2. Run the `wrangler secret put` command above.
3. Redeploy to activate the new binding.

The sender address is `noreply@signup.emberchamber.com` (set via `EMBERCHAMBER_EMAIL_FROM` in
`wrangler.jsonc`). The `signup.emberchamber.com` domain is verified in Resend.

## Relay Deploy

1. Use the manual GitHub Actions workflow [deploy-relay.yml](../.github/workflows/deploy-relay.yml).
2. Choose `production` for the live worker or `staging` only after staging Cloudflare resources and IDs have been provisioned in [`apps/relay/wrangler.jsonc`](../apps/relay/wrangler.jsonc).
3. Let the workflow run protocol build, Rust relay-contract tests, relay build, relay tests, D1 migrations, Worker deploy, and post-deploy `/health` plus `/ready` checks.
4. Do not bypass migrations or skip the health checks when the relay schema has changed.

## Relay Rollback

1. Roll forward first when the issue is an additive schema or config bug that can be fixed safely.
2. If the current deploy must be backed out, redeploy the previous known-good Worker version before changing D1 data manually.
3. Do not delete D1 rows or attachment blobs as a first response. Stabilize traffic, then investigate retention and membership state.
4. If a deploy introduced bad browser behavior only, prefer disabling the feature behind config or shipping a web fix instead of reverting relay schema changes.

## Queue Lag And Cleanup Failures

1. Check `/ready` first. If it fails, treat the issue as infrastructure, not application-only.
2. Review cleanup queue backlog, D1 error rate, and mailbox backlog before restarting clients or asking users to retry blindly.
3. If attachment cleanup fails, stop short of deleting live blobs manually unless you have confirmed the attachment row is expired or soft-deleted.
4. If mailbox cleanup fails, verify message expiry behavior before force-clearing Durable Object state. Dropping live envelopes is a data-loss event for recipients.
