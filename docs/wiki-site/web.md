# Web App

`apps/web` is the Next.js web client. It is a real, capable secondary surface — not a marketing site only. All authenticated flows run on relay APIs.

## Current Capabilities

- Public site and invite landing pages
- Email magic-link onboarding with explicit 18+ affirmation
- Invite preview and accept
- Relay-native DM chat with local-first message history
- Relay-hosted group threads and attachment upload/download
- Joined-space metadata search (only searches spaces the user has joined)
- Profile and privacy settings
- Session listing and self-revocation
- Client-side attachment encryption before upload (DM path)
- Group creation and invite management

## Running Locally

```bash
# Dev mode (relay + web together)
npm run dev

# Web only
npm run dev --workspace=apps/web
```

The web app runs on `http://localhost:3000`. It expects the relay at `http://localhost:8787` by default.

## Environment Variables

```bash
cp apps/web/.env.example apps/web/.env.local
```

Key variables:

| Variable                | Purpose                                           |
| ----------------------- | ------------------------------------------------- |
| `NEXT_PUBLIC_RELAY_URL` | Relay base URL (default: `http://localhost:8787`) |
| `NEXT_PUBLIC_APP_ENV`   | `development` or `production`                     |

## Building for Production

```bash
npm run build:web
```

The production deployment runs via Vercel. The `vercel.json` at the repo root configures the Next.js app deployment.

## CI

`.github/workflows/ci-web.yml` runs lint and build checks on every pull request.

```bash
npm run lint --workspace=apps/web
npm run build --workspace=apps/web
```

## Repo Structure

```
apps/web/
  src/
    app/          Next.js App Router pages and layouts
    components/   Shared UI components
    lib/          Relay API client, auth helpers, local storage
  public/         Static assets
  next.config.js  Next.js configuration
  tailwind.config.js
```

## What Is Not Yet Complete

| Feature                         | Status                                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| Encrypted-group rollout         | In progress — new groups are device-encrypted, while legacy compatibility history still exists |
| Universal encrypted attachments | In progress — DM path encrypts; group path does not yet                                        |
| Passkey enrollment              | Scaffolded in relay; UI not yet wired                                                          |
| Trusted-device recovery         | Partially implemented                                                                          |
