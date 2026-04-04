# `@emberchamber/web`

## Purpose

`apps/web` is the Next.js web app for EmberChamber.

It has two jobs:

1. Public site and onboarding surface
2. Authenticated messaging workspace

The web app is intentionally **secondary, not crippled**.

- It supports real messaging, search, invite review, settings, and recovery.
- Android and desktop remain the preferred primary-use surfaces for longer sessions, better device integration, and heavier media traffic.
- The current implementation is relay-first: onboarding, DMs, groups, invite flows, search, settings, and browser mailbox sync all use `apps/relay`.
- Legacy channel pages are intentionally retired placeholders, not active product dependencies.

## Responsibilities

### Public routes

- product positioning and trust framing
- download guidance
- invite landing pages
- sign-in and join-beta bootstrap
- magic-link completion
- support and recovery guidance

### Authenticated `/app/*` routes

- relay-native: direct messages, groups, invite preview and acceptance, joined-space metadata search, account settings, session management, and browser mailbox sync
- deferred: community-room and channel-style browser surfaces

## Route Map

### Public routes

- `/`
- `/start`
- `/download`
- `/privacy`
- `/beta-terms`
- `/trust-and-safety`
- `/support`
- `/login`
- `/register`
- `/auth/complete`
- `/invite/[code]`
- `/invite/[groupId]/[token]`

### Authenticated routes

- `/app`
- `/app/new-dm`
- `/app/chat/[id]`
- `/app/new-group`
- `/app/new-channel` placeholder for later-beta community rooms
- `/app/channel/[id]` retired legacy-channel notice
- `/app/search`
- `/app/discover`
- `/app/settings`

### Legacy Pages Router fallbacks

- `/404`
- `/_error`

## Surface Split

Use web when:

- the fastest path matters more than the preferred path
- you need quick messaging from a browser
- you need search, invite review, settings, or recovery
- a native build is not available for your platform yet

Use Android or desktop when:

- the user will spend most of the day in the product
- attachment and media usage is heavier
- device-level integration and local-first behavior matter more
- the preferred primary-use surface is available

## Dependencies

`apps/web` depends on:

- `apps/relay` for auth, direct messaging, mailbox sync, invite, group, search, and account flows
- `packages/protocol` for shared TypeScript relay contracts

If `packages/protocol` changes, rebuild it before building the web app:

```bash
npm run build --workspace=packages/protocol
```

## Environment

Defined in [`.env.example`](/home/jason/gh/PrivateMesh/apps/web/.env.example):

- `NEXT_PUBLIC_RELAY_URL`: browser-facing relay base URL
- `NEXT_PUBLIC_WEB_URL`: canonical public web origin
- `NEXT_PUBLIC_EMBERCHAMBER_AUTH_BOOTSTRAP_ENABLED`: toggles magic-link bootstrap UI

Also supported:

- `NEXT_OUTPUT=standalone`: enables Next.js standalone output for container-style deployment

## Local Development

From the repo root:

```bash
npm install
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
npm run build --workspace=packages/protocol
npm run dev
```

That starts:

- `apps/relay` on the relay dev port
- `apps/web` on port `3000`

To run only the web app:

```bash
npm run dev --workspace=apps/web
```

## Verification

```bash
npm run build --workspace=packages/protocol
npm run lint --workspace=apps/web
npm run build --workspace=apps/web
```

## CI New-User Flow Automation

The web CI workflow includes a full non-production new-user journey that captures screenshots for:

- signup (invite + email + 18+ affirmation)
- magic-link completion
- profile creation
- sending a first direct message

### CI auth strategy

The automation uses the relay's existing non-production `log` email provider mode (`EMBERCHAMBER_EMAIL_PROVIDER=log` in local/dev defaults). In this mode, `/v1/auth/start` includes a `debugCompletionToken` used only for test and local bootstrap paths. Production/staging keep `queue` provider behavior and do not depend on this token in CI.

### Flow implementation

- `apps/web/e2e/ci-new-user-flow.spec.ts` runs with Playwright in CI.
- The test performs signup in UI, reads the CI-only completion token from `/v1/auth/start`, opens `/auth/complete?token=...&browser=1`, updates profile settings, then sends a first DM to a seeded peer account.
- Screenshots are saved under `apps/web/artifacts/screenshots/new-user-flow`.

### Artifacts

The CI workflow uploads screenshots as a GitHub Actions artifact:

- `emberchamber-web-screenshots-<run_number>`

## Deployment Notes

- `next.config.js` supports `NEXT_OUTPUT=standalone` for container-oriented builds.
- The public site and authenticated workspace ship from the same Next.js app.
- The web app should be treated as a capable secondary surface, not as the highest-throughput primary client.

## Documentation Links

- Docs index: [`docs/README.md`](/home/jason/gh/PrivateMesh/docs/README.md)
- Root overview: [`README.md`](/home/jason/gh/PrivateMesh/README.md)
- Architecture: [`docs/architecture.md`](/home/jason/gh/PrivateMesh/docs/architecture.md)
- Launch targets: [`docs/launch-targets.md`](/home/jason/gh/PrivateMesh/docs/launch-targets.md)
- Roadmap: [`docs/roadmap.md`](/home/jason/gh/PrivateMesh/docs/roadmap.md)
- Relay API: [`docs/api/relay-http.md`](/home/jason/gh/PrivateMesh/docs/api/relay-http.md)
- Operator playbook: [`docs/operator-playbook.md`](/home/jason/gh/PrivateMesh/docs/operator-playbook.md)
