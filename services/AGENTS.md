# services Agent Guide

## Status

`services/*` contains older Rust service scaffolds that remain in the Cargo workspace, but they are not the active beta runtime.

Prefer `../apps/relay`, `../crates/core`, and `../crates/relay-protocol` for current backend and shared-runtime work unless the user explicitly asks for these services.

## If You Must Work Here

- Keep changes targeted to the specific service
- Do not start new hosted beta features here by default
- Verify only the crates you changed unless broader workspace validation is required
