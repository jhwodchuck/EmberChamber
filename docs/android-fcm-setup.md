# Android Firebase / FCM Setup

This is the repo-specific setup path for Android push preparation in `apps/mobile`.

## What File Goes Where

- Firebase app config file: `apps/mobile/secrets/google-services.json`
- Play release automation key: `apps/mobile/secrets/google-play-service-account.json`

These are different files for different jobs.

- `google-services.json` is the Android app registration file downloaded from Firebase Console.
- `google-play-service-account.json` is a Google Cloud service account key used for Play Store deployment automation.

Do not replace one with the other.

## Current Android App Identifier

The Android package name in this repo is:

- `com.emberchamber.mobile`

Register that exact package name in Firebase.

## Firebase Console Setup

1. Open Firebase Console and create a new Firebase project or attach Firebase to an existing Google Cloud project.
2. In that Firebase project, add an Android app.
3. Enter the Android package name:
   - `com.emberchamber.mobile`
4. Download `google-services.json`.
5. Place the file here:
   - `apps/mobile/secrets/google-services.json`

`apps/mobile/secrets/` is already gitignored in this repo.

## Repo Wiring

This repo now auto-adds the Expo Android `googleServicesFile` config only when the file exists.

- Config wrapper: [`app.config.js`](../apps/mobile/app.config.js)
- Base Expo config: [`app.json`](../apps/mobile/app.json)

That means the repo stays buildable before the Firebase file exists, and starts using it as soon as you add it.

## Verify The File

Run:

```bash
npm run verify:google-services --workspace=apps/mobile
```

This checks that:

- the file exists
- it parses
- it contains `com.emberchamber.mobile`

## Important Credential Distinction

The backend already has repo support for direct FCM delivery from `apps/relay`. That means the relay needs a Google service account with Firebase Messaging permissions.

That backend credential is not the same thing as `google-services.json`.

If you want to reuse an existing Google service account, grant it the appropriate Firebase Messaging role in Google Cloud. The existing Play deployment service account may be reusable only if you intentionally grant it the needed Firebase Messaging permissions.

For this repo, the current candidate is:

- `emberchamber-play-store-deploy@emberchamber.iam.gserviceaccount.com`

Grant that principal the `Firebase Cloud Messaging API Admin` role on project `emberchamber` if you want the relay to send FCM directly with the existing key file.

## Relay Secrets

The relay expects two server-side secrets for Android push:

- `EMBERCHAMBER_PUSH_TOKEN_SECRET`
- `EMBERCHAMBER_FCM_SERVICE_ACCOUNT_JSON`

`EMBERCHAMBER_PUSH_TOKEN_SECRET` encrypts stored device push tokens in D1.

`EMBERCHAMBER_FCM_SERVICE_ACCOUNT_JSON` should contain the full JSON content of the service account key that is allowed to send FCM for project `emberchamber`.

### Set The Secrets With Wrangler

Production:

```bash
cd apps/relay
openssl rand -base64 32 | npx wrangler secret put EMBERCHAMBER_PUSH_TOKEN_SECRET --env production
npx wrangler secret put EMBERCHAMBER_FCM_SERVICE_ACCOUNT_JSON --env production < ../mobile/secrets/google-play-service-account.json
```

Staging:

```bash
cd apps/relay
openssl rand -base64 32 | npx wrangler secret put EMBERCHAMBER_PUSH_TOKEN_SECRET --env staging
npx wrangler secret put EMBERCHAMBER_FCM_SERVICE_ACCOUNT_JSON --env staging < ../mobile/secrets/google-play-service-account.json
```

Local dev already has a non-production fallback `EMBERCHAMBER_PUSH_TOKEN_SECRET` in
[`wrangler.jsonc`](../apps/relay/wrangler.jsonc). Local FCM delivery still needs a valid
service-account JSON if you want to send real pushes from a local relay instance.

## What The Repo Now Does

- `apps/mobile` requests Android notification permission, obtains the native FCM token, and registers it with the relay.
- `apps/mobile` listens for token rotation and re-registers automatically.
- `apps/mobile` clears the relay-side push token on sign-out.
- `apps/relay` stores the device token encrypted, queues wake notifications for relay-hosted group messages and mailbox deliveries, and sends FCM notifications directly from the worker queue consumer when the service-account secret is configured.

## Official References

- Firebase Android setup: https://firebase.google.com/docs/android/setup
- FCM HTTP v1 auth and sending: https://firebase.google.com/docs/cloud-messaging/send/v1-api
- Expo FCM credentials: https://docs.expo.dev/push-notifications/fcm-credentials/
- Expo notifications setup: https://docs.expo.dev/push-notifications/push-notifications-setup
