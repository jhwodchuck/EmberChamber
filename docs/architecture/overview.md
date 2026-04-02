# Architecture Overview

The active EmberChamber beta architecture is documented in [`docs/architecture.md`](../architecture.md).

This overview file now exists only as a short redirect because the old centralized `web + Express + Postgres + Redis` diagrams are no longer the source of truth.

## Active runtime

- `apps/relay`: Cloudflare Worker relay/control plane
- `apps/mobile`: Android-first Expo client
- `apps/desktop`: Windows and Ubuntu Tauri client shell
- `apps/web`: public site plus secondary web messaging workspace
- `crates/core`: Rust local-first secure state engine

## Legacy runtime

- `apps/api`
- `infra/docker-compose.yml`
- older hosted channel/search assumptions

Those remain in the repo only as prototype artifacts while the relay beta is being built out.
