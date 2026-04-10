# `@emberchamber/web`

## Purpose

`apps/web` is the Next.js web app for EmberChamber.

It has two jobs:

1. Public site and onboarding surface
2. Authenticated messaging workspace

The web app is intentionally **secondary, not crippled**.

- It supports real messaging, search, invite review, settings, and recovery.
- Android and desktop remain the preferred primary-use surfaces for longer sessions, better device integration, and heavier media traffic.
- The current implementation is relay-first: onboarding, DMs, groups, community and room management, invite flows, search, settings, and browser mailbox sync all use `apps/relay`.
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

- relay-native: direct messages, groups, community and room management, invite preview and acceptance, joined-space metadata search, account settings, session management, and browser mailbox sync
- retired: legacy channel-style browser surfaces

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
- `/app/new-community`
- `/app/community/[id]`
- `/app/new-channel` bridge into the newer community and room flow
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

- `apps/relay` for auth, direct messaging, mailbox sync, invite, group, community and room management, room-scoped invites, invite-freeze policy, search, and account flows
- `packages/protocol` for shared TypeScript relay contracts

If `packages/protocol` changes, rebuild it before building the web app:

```bash
npm run build --workspace=packages/protocol
```

## Environment

Defined in [`.env.example`](.env.example):

- `NEXT_PUBLIC_RELAY_URL`: browser-facing relay base URL
- `NEXT_PUBLIC_WEB_URL`: canonical public web origin
- `NEXT_PUBLIC_EMBERCHAMBER_AUTH_BOOTSTRAP_ENABLED`: toggles magic-link bootstrap UI

Also supported:

- `NEXT_OUTPUT=standalone`: enables Next.js standalone output for container-style deployment

## Local Development

First-time setup from the repo root:

```bash
npm run bootstrap
```

Then start the active web-plus-relay lane:

```bash
npm run dev
```

That starts:

- `apps/relay` on the relay dev port
- `apps/web` on port `3000`

The root workspace is `npm`-first. `docs/wiki-site` remains a standalone `pnpm` VitePress site.

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

Targeted browser-route coverage is also available for the active relay-backed auth flows:

```bash
CI_WEB_BASE_URL=http://127.0.0.1:3000 \
CI_RELAY_BASE_URL=http://127.0.0.1:8787 \
CI_AUTH_INVITE_TOKEN=dev-beta-invite \
npm run e2e --workspace=apps/web
```

For a full active-runtime sweep from the repo root, run `npm run verify:all`.

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
- `apps/web/e2e/invite-continuation.spec.ts` covers signed-out invite preview, `/login?next=...`, and browser auth completion back into the same invite route.
- The test performs signup in UI, reads the CI-only completion token from `/v1/auth/start`, opens `/auth/complete?token=...&browser=1`, updates profile settings, then sends a first DM to a seeded peer account.
- The invite continuation test keeps `next` local to safe in-app paths and verifies that `auth/complete` returns the browser to the same invite preview instead of dropping the user into generic `/app`.
- Screenshots are saved under `apps/web/artifacts/screenshots/new-user-flow`.

### Artifacts

The CI workflow uploads screenshots as a GitHub Actions artifact:

- `emberchamber-web-screenshots-<run_number>`

## Deployment Notes

- `next.config.js` supports `NEXT_OUTPUT=standalone` for container-oriented builds.
- The public site and authenticated workspace ship from the same Next.js app.
- The web app should be treated as a capable secondary surface, not as the highest-throughput primary client.

## Production-Readiness Status

### What is production-grade for beta

| Area                        | Status        | Notes                                                                                                                      |
| --------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| HTTP security headers       | ✅ Live       | CSP, X-Frame-Options, Referrer-Policy, X-Content-Type-Options, Permissions-Policy, COOP all set in `next.config.js`        |
| Image remotePatterns        | ✅ Hardened   | Narrowed from wildcard `**` to relay origin + localhost only                                                               |
| Auth continuation safety    | ✅ Live       | `normalizeAuthContinuationPath` rejects all non `/app/*` and `/invite/*` paths; prevents open redirects                    |
| Relay session storage       | ⚠️ Known risk | Access + refresh tokens stored in `localStorage`; mitigated by relay-side revocation; `httpOnly` cookie migration deferred |
| Relay fetch timeout         | ✅ Live       | All relay requests time out at 30 s via `AbortController`                                                                  |
| Token refresh serialization | ✅ Live       | Concurrent refresh calls are de-duplicated to a single in-flight promise                                                   |
| Accessibility baseline      | ✅ Improved   | Skip link, semantic landmarks, ARIA roles on tabs, labelled search input, aria-live on relay status badge                  |
| Content Security Policy     | ✅ Live       | `unsafe-inline` required for Next.js hydration; nonce-based strict CSP is deferred                                         |
| CI lint coverage            | ✅ Live       | `npm run lint` now runs in CI alongside type-check and build                                                               |
| Deploy smoke tests          | ✅ Live       | Multi-route HTTP smoke test runs after every production deploy                                                             |
| E2E coverage                | ✅ Live       | New-user bootstrap flow + invite continuation covered by Playwright                                                        |

### Known risks and intentional deferrals

| Risk                          | Severity      | Rationale for deferral                                                                                                                                  |
| ----------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `localStorage` session tokens | Medium        | Moving to `httpOnly` cookies requires relay-side session cookie support; deferred until relay session contract is stable                                |
| CSP nonce approach            | Low-Medium    | Full nonce-based CSP needs middleware and React context threading; deferred until Next.js 15 nonce support pattern is finalized for App Router          |
| Avatar `<img>` src from relay | Low           | `Avatar` uses a raw `<img>` tag not Next.js Image; source values come from the relay API only, not user-controlled input; upgrade to `<Image>` deferred |
| WebSocket reconnect backoff   | Low           | Fixed 1500 ms reconnect delay; exponential backoff deferred — acceptable for beta load levels                                                           |
| HSTS header                   | Informational | HSTS is enforced by Vercel at the CDN layer, not in `next.config.js` `headers()`; no action needed                                                      |
| Attachment encryption parity  | Medium        | Browser DM path encrypts before upload; native client paths still uneven; documented in architecture.md                                                 |
| Passkey / recovery maturity   | Medium        | Relay endpoints exist (`/v1/passkeys`) but return 501; full user flow deferred                                                                          |

## Documentation Links

- Docs index: [`docs/README.md`](../../docs/README.md)
- Repo map: [`repo-map.yaml`](../../repo-map.yaml)
- Root overview: [`README.md`](../../README.md)
- Architecture: [`docs/architecture.md`](../../docs/architecture.md)
- Launch targets: [`docs/launch-targets.md`](../../docs/launch-targets.md)
- Roadmap: [`docs/roadmap.md`](../../docs/roadmap.md)
- Relay API: [`docs/api/relay-http.md`](../../docs/api/relay-http.md)
- Operator playbook: [`docs/operator-playbook.md`](../../docs/operator-playbook.md)
