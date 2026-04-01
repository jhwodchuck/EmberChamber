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

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 + React 19 + TypeScript (PWA) |
| Backend services | Rust (Axum, Tokio, SQLx) |
| Database | PostgreSQL 16 |
| Cache / pub-sub | Redis 7 |
| Object storage | S3-compatible (MinIO for local dev) |
| Auth | Passkeys (WebAuthn) + email magic link + TOTP |
| Search | PostgreSQL FTS (groups/channels); client-side index (DMs) |
| Federation | Signed relay envelopes over HTTPS |
| Styling | Tailwind CSS + design tokens (`packages/ui`) |
| Build | pnpm + Turborepo (web) · Cargo workspace (Rust) |

---

## Repository Structure

```
/
├─ apps/
│  └─ web/                   # Next.js PWA frontend
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

### Frontend

```bash
pnpm install
pnpm dev          # starts apps/web on :3000
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
