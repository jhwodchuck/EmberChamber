# apps/relay Agent Guide

## Role

`apps/relay` is the active hosted backend for the beta. It runs on Cloudflare Workers and owns:

- bootstrap auth
- invite validation and acceptance
- mailbox delivery
- group membership metadata
- attachment tickets and relay metadata

## Structure

- `src/index.ts`: main Worker entry
- `src/do`: Durable Object implementations
- `src/lib`: shared helpers for crypto, HTTP, tokens, and D1 access
- `migrations`: D1 schema changes
- `wrangler.jsonc`: Worker bindings, Durable Objects, queues, and env defaults

## Working Rules

- Keep the Worker runtime model intact: Durable Objects, D1, R2, and queues are the default primitives
- Do not add Node-only assumptions that do not fit the Cloudflare Workers runtime
- Preserve the ciphertext-first data model and private-email bootstrap flow
- Schema changes belong in `migrations` and should stay consistent with the active architecture docs
- Contract changes usually require matching edits in `../../packages/protocol` and `../../crates/relay-protocol`
- Prefer extending `DeviceMailboxDO`, `GroupCoordinatorDO`, or `RateLimitDO` before inventing parallel state layers

## Validation

- `npm run build --workspace=apps/relay`
- `npm test --workspace=apps/relay`
- `npm run build --workspace=packages/protocol` if contracts changed
