# services Agent Guide

## Status

`services/*` contains archived Rust service scaffolds that are no longer part of the root Cargo workspace and are not the active beta runtime.

Prefer `../apps/relay`, `../crates/core`, and `../crates/relay-protocol` for current backend and shared-runtime work unless the user explicitly asks for these services.

## If You Must Work Here

- Keep changes targeted to the specific service
- Do not start new hosted beta features here by default
- Verify only the crates you changed unless broader workspace validation is required
