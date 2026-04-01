# PrivateMesh

> **Privacy-first messaging for communities.** PrivateMesh gives groups, channels, and direct conversations more control over their communications while reducing unnecessary centralized visibility.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Overview

PrivateMesh is a production-minded messaging platform starter focused on invite-first communities, direct conversations, resilient delivery, and explicit trust boundaries. The current implementation centers on the TypeScript web app and API, with additional Rust/Tauri scaffolding in the repo for native packaging and future service evolution.

Current repo status:

- `apps/api` and `apps/web` are the working MVP implementation today
- `apps/desktop` is the working Tauri shell for launch packaging
- `services/`, `crates/`, `packages/api-types`, `packages/client-sdk`, `packages/config`, `packages/ui`, and `infra/compose` are future-facing scaffold paths, not the main runtime yet
- JavaScript commands in this repo currently use `npm` workspaces even though `pnpm-workspace.yaml` and `turbo.json` remain for broader monorepo evolution

### What PrivateMesh is
- Privacy-first, user-controlled messaging
- Invite-first groups and channels instead of default public discovery
- Transparent enforcement boundaries for clearly illegal abuse and platform attacks
- A practical launch path across web, desktop, and mobile packaging targets

### What PrivateMesh is NOT
- A tool for criminal evasion
- "Perfect anonymity" or "uncensorable forever"
- A promise that all message surfaces are end-to-end encrypted today
- A haven for CSAM, malware, extortion, trafficking, or non-consensual abuse

---

## Features (Current Starter)

| Feature | Status |
|---------|--------|
| User registration & login (JWT) | ✅ |
| Private direct messaging | ✅ |
| Group chat | ✅ |
| Channels (broadcast) | ✅ |
| Invite links | ✅ |
| File attachments (S3/MinIO) | ✅ |
| Scoped search for accessible spaces | ✅ |
| User blocking & reporting | ✅ |
| Admin controls (group/channel) | ✅ |
| Privacy settings | ✅ |
| WebSocket real-time updates | ✅ |
| Dark/light mode | ✅ |
| Multi-device session management | ✅ |
| Rate limiting & abuse prevention | ✅ |
| Public invite preview pages | ✅ |

---

## Launch Targets

- Windows: `.exe` and `.msi`
- Ubuntu / Debian: `.deb` and AppImage
- Android: `.apk` for direct install and `.aab` for store submission
- iPhone: `.ipa` for TestFlight and App Store review
- macOS: signed and notarized `.dmg` or `.pkg`

Current launch path:

- `apps/web` is the main product UI and admin surface
- `apps/desktop` provides a Tauri v2 native shell for Windows, Linux, macOS, Android, and iPhone packaging
- The native shell opens the deployed PrivateMesh web app for MVP packaging rather than shipping a separate native client yet

More detail: [`docs/launch-targets.md`](docs/launch-targets.md)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 + React 18 + TypeScript |
| Native packaging | Tauri v2 shell |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL 16 |
| Cache / PubSub | Redis 7 |
| Object storage | S3-compatible (MinIO for local dev) |
| Real-time | WebSocket (`ws` + Redis fan-out) |
| Styling | Tailwind CSS |
| Additional scaffolding | Rust workspace for future services and native integration |

---

## Repository Structure

```text
privatemesh/
├── apps/
│   ├── api/                  # Current Express API + WebSocket gateway
│   ├── web/                  # Current Next.js frontend
│   └── desktop/              # Tauri v2 shell for native packaging
├── packages/
│   ├── shared/               # Current shared TypeScript types
│   ├── api-types/            # Additional API type scaffolding
│   ├── client-sdk/           # SDK scaffolding
│   ├── config/               # Shared config scaffolding
│   └── ui/                   # UI token scaffolding
├── services/                 # Rust service scaffolding
├── crates/                   # Rust shared crates
├── infra/
│   ├── docker-compose.yml    # Current local stack
│   └── compose/              # Additional infra scaffold
├── docs/
│   ├── architecture.md
│   ├── launch-targets.md
│   ├── architecture/
│   ├── api/
│   ├── product/
│   └── security/
├── Cargo.toml
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── .env.example
```

---

## Quick Start

### Docker

```bash
git clone https://github.com/jhwodchuck/PrivateMesh.git
cd PrivateMesh
cp .env.example .env
docker compose -f infra/docker-compose.yml up -d
docker compose -f infra/docker-compose.yml exec api npm run migrate
```

Open `http://localhost:3000`.

The alternate scaffold in `infra/compose/docker-compose.yml` is future-facing Rust-service infrastructure and is not the primary local app stack yet.

### Local Development

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp .env.example .env
cd apps/api && npm run migrate
cd ../..
npm run dev
```

---

## Native Shell Commands

```bash
npm run dev:desktop
npm run doctor:desktop
npm run build:desktop
npm run build:android
npm run build:ios
```

Set `PRIVATEMESH_APP_URL` before native release builds so packaged apps open the correct deployed environment.

---

## Current Trust Boundaries

- Direct messages in this starter are private by account access controls, but they are **not yet full Signal-style end-to-end encrypted chats**
- Groups and channels are server-managed community spaces with clear admin controls
- Invite links are the primary path into communities; public discovery is intentionally reduced
- Privacy controls decide who can find you and who can open a new DM with you

---

## Verification

The current local upgrade has been verified with:

- `npm run build --workspace=apps/web`
- `npm test --workspace=apps/api`
- `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml`

---

## Documentation

- Architecture: [`docs/architecture.md`](docs/architecture.md)
- Launch targets: [`docs/launch-targets.md`](docs/launch-targets.md)
- API starter spec: [`docs/openapi.yaml`](docs/openapi.yaml)
- Additional future-facing docs: [`docs/architecture/overview.md`](docs/architecture/overview.md)
