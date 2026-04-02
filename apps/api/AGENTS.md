# apps/api Agent Guide

## Status

`apps/api` is a legacy Express and Postgres prototype. It is not the default backend for current beta work.

Prefer `../relay` unless the user explicitly asks for legacy-stack work or this path is blocking current verification.

## If You Must Work Here

- Keep changes narrowly scoped
- Do not route new beta features here by default
- Avoid treating this app as the source of truth for current product behavior

## Validation

- `npm run type-check --workspace=apps/api`
- `npm run test --workspace=apps/api`
