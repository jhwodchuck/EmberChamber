# apps/web Agent Guide

## Role

`apps/web` is the Next.js app for both:

- the public site and onboarding surface
- the authenticated web messaging workspace

Treat web as secondary but capable. Do not reduce it to marketing-only, and do not describe it as the preferred primary client when native surfaces are available.

## Structure

- `src/app`: App Router routes
- `src/app/app/*`: authenticated workspace routes
- `src/components`: shared UI and route support components
- `src/lib`: API, state, relay, and formatting helpers
- `src/pages`: legacy `404` and `_error` fallbacks only

Use `README.md` in this directory as the local source of truth for routes, responsibilities, and environment variables.

## Working Rules

- Preserve the split between public routes and authenticated `/app/*` routes
- Prefer App Router changes over adding new Pages Router code
- Keep product and safety language aligned with `../../docs/operator-playbook.md`
- Most auth, invite, group, or conversation flow changes also require `../relay`
- If request or response shapes change, update `../../packages/protocol` and keep it aligned with `../../crates/relay-protocol`

## Validation

- `npm run build --workspace=packages/protocol` if contracts changed
- `npm run lint --workspace=apps/web`
- `npm run build --workspace=apps/web`
