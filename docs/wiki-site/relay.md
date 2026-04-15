# Relay

`apps/relay` is the only hosted component in EmberChamber. It is a Cloudflare Worker that handles auth, routing, attachment ticketing, and the encrypted mailbox delivery substrate.

## Stack

| Layer            | Technology                           |
| ---------------- | ------------------------------------ |
| Runtime          | Cloudflare Workers                   |
| Metadata         | Cloudflare D1 (SQLite edge database) |
| Blob storage     | Cloudflare R2                        |
| Stateful objects | Cloudflare Durable Objects           |
| Message queues   | Cloudflare Queues                    |
| Email delivery   | Resend API (via EMAIL_QUEUE)         |

## Running Locally

```bash
# Apply local D1 migrations first
cd apps/relay
npx wrangler d1 migrations apply emberchamber-relay-dev --local

# Start the dev server
npm run dev --workspace=apps/relay
# or from repo root:
npm run dev
```

The relay dev server runs on `http://localhost:8787`.

## Running the Full Local Stack

```bash
# From repo root — starts both the relay and web app
npm run relay:local
# or with a persistent screen session
npm run relay:local:screen
# stop it
npm run relay:local:stop
```

## Configuration

The relay reads environment variables from `apps/relay/.dev.vars` for local development and from Cloudflare Worker secrets for production.

Key variables:

| Variable         | Purpose                              |
| ---------------- | ------------------------------------ |
| `RESEND_API_KEY` | Magic-link email delivery via Resend |
| `JWT_SECRET`     | Signs and verifies session tokens    |
| `ENCRYPTION_KEY` | Encrypts email-at-rest in D1         |

Production secrets are managed via Wrangler:

```bash
cd apps/relay
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put JWT_SECRET
npx wrangler secret put ENCRYPTION_KEY
```

## Deploying to Cloudflare

```bash
cd apps/relay
npx wrangler deploy --env production
```

Migrations run automatically as part of the Cloudflare CI deploy workflow (`.github/workflows/deploy-relay.yml`).

## Durable Objects

### `DeviceMailboxDO`

One instance per device. Stores ciphertext envelopes for offline delivery.

- Envelopes are written via `POST /v1/messages/batch`.
- Connected device WebSockets receive fan-out in real time.
- Unacked envelopes are capped by a backlog limit; older envelopes are evicted.
- Acked envelopes are deleted immediately. Alarm-driven cleanup handles expiry.

### `GroupCoordinatorDO`

One instance per group. Tracks the current group epoch and member set for relay-side coordination. Used to validate membership and to bump the epoch when members are removed.

### `RateLimitDO`

Keyed per IP or account. Applies rate limits to auth start, invite redemption, and message send paths.

## Key API Endpoints

| Method   | Path                              | Purpose                                            |
| -------- | --------------------------------- | -------------------------------------------------- |
| `POST`   | `/v1/auth/start`                  | Begin magic-link auth challenge                    |
| `POST`   | `/v1/auth/complete`               | Exchange magic-link for session tokens             |
| `GET`    | `/v1/sessions`                    | List active sessions for the authenticated account |
| `DELETE` | `/v1/sessions/:id`                | Revoke a session                                   |
| `POST`   | `/v1/invites/preview`             | Preview a beta or group invite                     |
| `POST`   | `/v1/invites/accept`              | Accept an invite during onboarding                 |
| `GET`    | `/v1/contacts/card`               | Fetch a contact's device bundle (public keys)      |
| `POST`   | `/v1/messages/batch`              | Send ciphertext envelopes to device mailboxes      |
| `GET`    | `/v1/mailbox/sync`                | Pull pending envelopes for the current device      |
| `POST`   | `/v1/mailbox/ack`                 | Acknowledge and delete delivered envelopes         |
| `GET`    | `/v1/mailbox/ws`                  | WebSocket for live mailbox fan-out                 |
| `POST`   | `/v1/groups`                      | Create a new group                                 |
| `GET`    | `/v1/groups/:id/members`          | List group members                                 |
| `POST`   | `/v1/groups/:id/invites`          | Mint a group invite (owner/admin)                  |
| `POST`   | `/v1/attachments/upload-ticket`   | Get a signed R2 upload ticket                      |
| `POST`   | `/v1/attachments/download-ticket` | Get a signed R2 download ticket                    |
| `POST`   | `/v1/reports`                     | Submit a disclosure-based report                   |

## Tests

```bash
npm run test --workspace=apps/relay
# or from repo root
npm test
```

Tests live in `apps/relay/test/`. They run against a local Miniflare worker context.

## Minting a Beta Invite Token

There is no operator UI today. Use a direct D1 command:

```bash
cd apps/relay
TOKEN="your-invite-token"
HASH=$(printf 'invite:%s' "$TOKEN" | sha256sum | awk '{print $1}')
npx wrangler d1 execute emberchamber-relay-prod-db --env production --remote \
  --command "INSERT INTO beta_invites \
    (token_hash, created_at, expires_at, max_uses, use_count, created_by, revoked_at) \
    VALUES ('$HASH', datetime('now'), NULL, 10, 0, 'operator', NULL);"
```

For local development the `npm run invite:local:test` root script seeds a reusable test invite.

## Invite Defaults

- `maxUses` ≤ 12
- `expiresInHours` ≤ 72
- `allowMemberInvites` off unless explicitly enabled by the group owner
