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
| Submit a disclosure-based report                                                 | Relay `/v1/reports`                                                                   | Stored for follow-up, but there is no operator inbox or dashboard yet.                                      |
| Issue bootstrap beta invite tokens                                               | Manual today                                                                          | Use direct D1 access to `beta_invites` or the configured dev token in development. There is no operator UI. |
| Suspend an account, revoke all sessions for another user, or bulk-review reports | Not implemented in the relay runtime                                                  | Requires engineering or direct infrastructure/database intervention.                                        |

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
4. If all devices are lost, force a fresh magic-link bootstrap and treat the account as a new device identity. There is no full trusted-device recovery handoff yet.
5. Record the incident manually with account ID, group ID, affected session IDs, and any `reportId` that was created.

## Leaked Invite Or Boundary Change

1. Revoke every known leaked invite for the group.
2. Create a fresh invite with tighter expiry and use-count limits.
3. Remove members if the boundary has already been crossed.
4. Document the incident manually. The schema has an invite-freeze flag, but there is no relay endpoint or UI to set it today.

## Disclosure-Based Report Handling

- Require minimal evidence only. Do not ask for unrelated chat history.
- Ask reporters to include the group or account involved plus the specific message IDs, attachment IDs, or invite path they are disclosing.
- Preserve and reference the returned `reportId`.
- Because there is no operator dashboard yet, triage notes and escalation state must live out of band today.

## Immediate Harm Escalation

- Prioritize `non_consensual_intimate_media`, `coercion_or_extortion`, `underage_risk`, `csam`, and credible impersonation/extortion reports.
- The relay runtime cannot currently suspend an account or revoke another user’s sessions through an operator API.
- For urgent cases, escalate to engineering or direct infrastructure access and document exactly what manual action was taken.

## Communication Defaults

- Do not describe the current relay-native group thread or attachment flow as fully E2EE.
- Do describe the beta as invite-only, disclosure-based, with new device-encrypted groups and a few legacy compatibility paths still being retired.
- Keep public language discreet and privacy-first.

## Android Release Signing

Every Play Store update must be signed with the same keystore. Losing it means Google will not
allow any future updates to the app under the same package name.

| Property       | Value                                               |
| -------------- | --------------------------------------------------- |
| Keystore file  | `apps/mobile/secrets/emberchamber-release.keystore` |
| Store password | `ember-release-store`                               |
| Key alias      | `emberchamber`                                      |
| Key password   | same as store password (`ember-release-store`)      |

The keystore file is gitignored and must never be committed to the repo. The credentials are
stored as GitHub Actions secrets (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEY_ALIAS`,
`ANDROID_STORE_PASSWORD`, `ANDROID_KEY_PASSWORD`, `ANDROID_GOOGLE_SERVICES_JSON`) so the CI
workflows can sign builds and include the Firebase Android app config without exposing the raw
files.

**Back up the keystore.** Copy `apps/mobile/secrets/emberchamber-release.keystore` to a
secure location outside the repo (password manager, encrypted cloud backup). If it is lost
you cannot update the app on the Play Store and a new listing must be created from scratch.

To re-register the secrets after a machine reset:

```bash
cd apps/relay  # or root — just needs wrangler/gh auth
base64 -w 0 apps/mobile/secrets/emberchamber-release.keystore \
  | gh secret set ANDROID_KEYSTORE_BASE64
gh secret set ANDROID_KEY_ALIAS    --body "emberchamber"
gh secret set ANDROID_STORE_PASSWORD --body "ember-release-store"
gh secret set ANDROID_KEY_PASSWORD   --body "ember-release-store"
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
