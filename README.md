# PrivateMesh

> **PrivateMesh gives communities more control over their communications.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Overview

PrivateMesh is a privacy-respecting messaging platform built for invite-only private communities, creators, clubs, and member groups. It combines end-to-end encrypted direct messaging with server-managed group and channel conversations, strong admin controls, and a permissioned federation model for multi-operator deployments.

### What PrivateMesh is
- Community-controlled messaging with clear privacy boundaries
- Default end-to-end encrypted 1:1 DMs; server-managed groups and channels with explicit trust assumptions
- A responsible platform that is privacy-respecting **and** anti-abuse
- Designed for lawful operation with honest product claims

### What PrivateMesh is NOT
- A tool for evading lawful requirements
- An anonymity network or "uncensorable" messaging system
- A platform that ignores illegal content, CSAM, malware, extortion, or trafficking
- Open for public discovery — invite-only communities only in MVP

---

## Features (MVP)

| Feature | Status |
|---------|--------|
| Signup / login — passkeys or email magic link | 🚧 Sprint 1 |
| Username registry + profile | 🚧 Sprint 1 |
| Device and session management | 🚧 Sprint 1 |
| Default-E2EE 1:1 direct messages | 🚧 Sprint 3 |
| Server-managed group chat | 🚧 Sprint 2 |
| Server-managed broadcast channels | 🚧 Sprint 2 |
| Invite links | 🚧 Sprint 4 |
| File attachments (S3/MinIO) | 🚧 Sprint 2 |
| PostgreSQL full-text search (groups/channels) | 🚧 Sprint 4 |
| Client-side local search for secure DMs | 🚧 Sprint 4 |
| User blocking & reporting | 🚧 Sprint 4 |
| Owner / admin / mod roles | 🚧 Sprint 4 |
| Web push notifications | 🚧 Sprint 2 |
| Configurable read receipts | 🚧 Sprint 2 |
| Multi-operator federation (relay) | 🚧 Sprint 5 |
| Rate limiting & abuse prevention | 🚧 Sprint 6 |

---

## MVP Launch Deliverables

| Platform | Format | Built by CI |
|----------|--------|-------------|
| **Windows** | `.exe` NSIS installer + `.msi` | `release-windows.yml` |
| **Ubuntu / Debian Linux** | `.deb` package + AppImage | `release-linux.yml` |
| **Android** | `.apk` (debug) / `.aab` (release) | `release-android.yml` |
| **macOS** | Universal `.dmg` (Apple Silicon + Intel) | `release-apple.yml` |
| **iPhone (iOS)** | `.ipa` via TestFlight → App Store | `release-apple.yml` |

All native clients are built with **[Tauri v2](https://tauri.app)**, which wraps the existing Next.js
frontend in a lightweight Rust shell — no Electron, no bundled Chromium, significantly smaller download.

### What you need to enable macOS and iPhone builds

Both macOS and iOS are built on the same GitHub Actions runner (`macos-14`) and require
an **[Apple Developer Program membership](https://developer.apple.com/programs/)** ($99 USD/year).

| Secret | Where to get it | Used for |
|--------|----------------|---------|
| `APPLE_CERTIFICATE` | Export a **Developer ID Application** cert from Keychain as `.p12`, then base64-encode it | macOS code signing |
| `APPLE_CERTIFICATE_PASSWORD` | Password you set when exporting the `.p12` | macOS code signing |
| `APPLE_SIGNING_IDENTITY` | e.g. `"Developer ID Application: Acme Corp (XXXXXXXXXX)"` | macOS code signing |
| `APPLE_ID` | Your Apple ID email | macOS notarization (Gatekeeper) |
| `APPLE_TEAM_ID` | 10-character team ID from developer.apple.com | macOS notarization + iOS |
| `APPLE_PASSWORD` | App-specific password from appleid.apple.com | macOS notarization |
| `IOS_PROVISIONING_PROFILE` | Download from developer.apple.com, base64-encode the `.mobileprovision` | iOS code signing |
| `TAURI_SIGNING_PRIVATE_KEY` | `cargo tauri signer generate` | Tauri update signature (all platforms) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Chosen when running the above | Tauri update signature |

Set all secrets in **GitHub → Settings → Secrets and variables → Actions**.

> **Tip:** If you are not ready to distribute on the App Store, iOS apps can be installed
> directly on test devices via TestFlight or an Enterprise Distribution certificate without
> going through App Store review.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 + React 19 + TypeScript (PWA) |
| Native shell | Tauri v2 (Rust) — Windows, macOS, Linux, Android, iOS |
| Backend services | Rust (Axum, Tokio, SQLx) |
| Database | PostgreSQL 16 |
| Cache / pub-sub | Redis 7 |
| Object storage | S3-compatible (MinIO for local dev) |
| Auth | Passkeys (WebAuthn) + email magic link + TOTP |
| Search | PostgreSQL FTS (groups/channels); client-side index (DMs) |
| Federation | Signed relay envelopes over HTTPS |
| Styling | Tailwind CSS + design tokens (`packages/ui`) |
| Build | pnpm + Turborepo (web) · Cargo workspace (Rust + Tauri) |

---

## Repository Structure

```
/
├─ apps/
│  ├─ web/                   # Next.js PWA frontend
│  └─ desktop/               # Tauri v2 shell (Windows/macOS/Linux/Android/iOS)
│     └─ src-tauri/          # Rust Tauri crate
├─ services/
│  ├─ control-api/           # REST auth + admin (Rust/Axum)
│  ├─ realtime-gateway/      # WebSocket fan-out (Rust/Axum)
│  ├─ relay-gateway/         # Inter-operator federation (Rust/Axum)
│  ├─ media-worker/          # Upload finalization + malware scan (Rust)
│  ├─ push-worker/           # Web push delivery (Rust)
│  └─ directory-ca/          # Global username registry + operator CA (Rust)
├─ crates/
│  ├─ domain/                # Core domain types
│  ├─ db/                    # SQLx queries + migrations
│  ├─ auth/                  # Auth primitives
│  ├─ relay-protocol/        # Relay envelope types + signing
│  └─ test-support/          # Test helpers and fixtures
├─ packages/
│  ├─ api-types/             # Shared TypeScript API types
│  ├─ client-sdk/            # Browser client SDK
│  ├─ ui/                    # Design system + tokens
│  └─ config/                # Shared ESLint / TS / Tailwind config
├─ infra/
│  ├─ compose/               # Docker Compose local dev stack
│  ├─ k8s/                   # Kubernetes manifests
│  └─ scripts/               # Bootstrap + seed scripts
├─ docs/
│  ├─ architecture/          # Mermaid diagrams + ADRs
│  ├─ api/                   # OpenAPI spec
│  ├─ security/              # Threat model + key-management notes
│  └─ product/               # Personas + flows
├─ Cargo.toml                # Rust workspace
├─ package.json              # Root pnpm workspace
├─ pnpm-workspace.yaml
├─ turbo.json
├─ .env.example
└─ README.md
```

---

## Quick Start (Docker Compose)

### Prerequisites
- Docker Engine 24+ and Docker Compose v2

### 1. Clone and configure

```bash
git clone https://github.com/jhwodchuck/PrivateMesh.git
cd PrivateMesh
cp .env.example .env
# Edit .env — at minimum set SESSION_SECRET, DB_PASSWORD, and MINIO_ROOT_PASSWORD
```

### 2. Start the local stack

```bash
docker compose -f infra/compose/docker-compose.yml up -d
```

This starts PostgreSQL, Redis, MinIO, and all PrivateMesh services.

### 3. Open the app

Visit `http://localhost:3000`

---

## Local Development

### Prerequisites
- Node.js 20+, pnpm 9+
- Rust 1.80+ with Cargo
- PostgreSQL 16, Redis 7 (or use the Compose stack for infrastructure only)
- **For desktop:** no extras — `cargo tauri dev` handles it
- **For Android:** Android Studio + NDK 27 + `cargo install tauri-cli`
- **For iOS / macOS:** Xcode 16 on a Mac + Apple Developer account

### Frontend

```bash
pnpm install
pnpm dev          # starts apps/web on :3000
```

### Desktop (Tauri)

```bash
cd apps/desktop
cargo tauri dev   # opens native window wrapping localhost:3000
```

### Native release builds

```bash
cargo tauri build                      # current OS (Windows/macOS/Linux)
cargo tauri android build --debug      # Android APK
cargo tauri ios build                  # iOS .ipa (macOS only)
```

### Rust services

```bash
cargo build       # build all services and crates
cargo test        # run all Rust tests
```

---

## Running Tests

```bash
# TypeScript / frontend
pnpm test

# Rust
cargo test
```

---

## API Documentation

Full OpenAPI spec: [`docs/api/openapi.yaml`](docs/api/openapi.yaml)

**WebSocket**: connect to `realtime-gateway` with a signed session token.

---

## Architecture

See [`docs/architecture/`](docs/architecture/) for system diagrams, database schema, authentication flows, E2EE design, and federation model.

---

## Security

- 1:1 DMs are end-to-end encrypted by default; groups and channels are server-managed with explicit trust disclosure
- Passkeys (WebAuthn) and email magic links — no passwords stored
- Device-bound session tokens with Redis-backed revocation
- Signed relay envelopes for inter-operator federation
- Metadata minimization: IP/UA hashed in long-lived tables, content-free operational logs
- See [`docs/security/`](docs/security/) for the full threat model

---

## Trust & Safety

PrivateMesh maintains clear anti-abuse enforcement for illegal content (CSAM, malware, extortion, trafficking). Reports are permanently audited. Operator certificates can be revoked to stop traffic from a compromised node. Platform intervention is reserved for severe abuse, coordinated spam, malware distribution, and network attacks.

---

## Roadmap

| Sprint | Focus |
|--------|-------|
| 0 ✅ | Monorepo scaffold, CI, Compose stack, service skeletons, shared types, design tokens |
| 1 | Auth (passkeys, magic link, TOTP), username registry, devices/sessions |
| 2 | Hosted conversations, realtime gateway, attachments, notifications |
| 3 | 1:1 E2EE DMs, per-device key fan-out, device linking, encrypted backup |
| 4 | Invites, roles/permissions, moderation, local search, privacy settings |
| 5 | Federation relay protocol, operator certificates, cross-node delivery |
| 6 | Rate limits, spam controls, malware pipeline, observability, hardening |
| 7 | Integration tests, demo environments, security review, beta onboarding |
