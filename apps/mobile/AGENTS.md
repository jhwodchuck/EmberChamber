# apps/mobile Agent Guide

## Role

`apps/mobile` is the shared Expo client for Android and iPhone. Android is the committed first-wave mobile surface, while iPhone remains a later-surface lane that should stay in sync where practical.

## Structure

- `App.tsx`: current application scaffold and most UI flow logic
- `assets/*`: app icons and packaging assets
- `app.json`: Expo app config

The mobile app currently keeps most behavior in `App.tsx`. If a feature grows materially, extract helpers or components instead of making the file denser.

## Working Rules

- Keep Android and iPhone behavior unified unless a platform-specific difference is necessary
- Do not expand scope around iPhone-specific polish or distribution unless the user explicitly asks for it
- Preserve local-first assumptions: sensitive state stays on device, small secrets go in SecureStore, local history goes in SQLite
- Keep privacy defaults conservative for sensitive media and notifications
- Relay flow changes usually require matching work in `../relay`
- If request or response shapes change, update `../../packages/protocol` and keep it aligned with `../../crates/relay-protocol`

## Validation

- `npm run verify --workspace=apps/mobile`
- `npm run verify:android --workspace=apps/mobile`
- When `app.json` or iPhone deep-link config changes, run `npm run prebuild:ios --workspace=apps/mobile` on macOS when available
