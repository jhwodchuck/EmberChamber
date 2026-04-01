# PrivateMesh

> **Privacy-first messaging for communities.** PrivateMesh gives groups, channels, and direct conversations more control over their communications — built for user control, resilient infrastructure, and minimal centralized visibility.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Overview

PrivateMesh is a production-ready MVP for a privacy-first messaging platform. It supports direct messaging with E2EE, group chat, broadcast channels, invite links, file sharing, real-time updates, and granular privacy controls.

### What PrivateMesh is
- Privacy-first, user-controlled messaging
- Transparent enforcement boundaries (clear rules, clear enforcement)
- Resilient communications with minimal centralized oversight
- A responsible platform: privacy-respecting AND anti-abuse

### What PrivateMesh is NOT
- A platform for criminal evasion
- Immune from lawful requirements
- "Uncensorable" or "perfectly anonymous"
- A haven for illegal content, CSAM, malware, extortion, or trafficking

---

## Features (MVP)

| Feature | Status |
|---------|--------|
| User registration & login (JWT) | ✅ |
| Direct messaging (E2EE-ready) | ✅ |
| Group chat | ✅ |
| Channels (broadcast) | ✅ |
| Invite links | ✅ |
| File attachments (S3/MinIO) | ✅ |
| Message search (PostgreSQL FTS) | ✅ |
| User blocking & reporting | ✅ |
| Admin controls (group/channel) | ✅ |
| Privacy settings | ✅ |
| WebSocket real-time updates | ✅ |
| Dark/light mode | ✅ |
| Multi-device session management | ✅ |
| Rate limiting & abuse prevention | ✅ |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 + React 19 + TypeScript |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL 16 |
| Cache/PubSub | Redis 7 |
| Object Storage | S3-compatible (MinIO for local dev) |
| Real-time | WebSocket (ws library + Redis pub/sub fan-out) |
| Auth | JWT (access 15m + refresh 30d) |
| Password hashing | argon2id |
| Search | PostgreSQL Full-Text Search |
| Styling | Tailwind CSS |

---

## Project Structure

```
privatemesh/
├── apps/
│   ├── api/                  # Backend REST API + WebSocket gateway
│   │   ├── src/
│   │   │   ├── db/           # PostgreSQL client + Redis + migrations
│   │   │   ├── middleware/   # Auth, error handling
│   │   │   ├── routes/       # auth, conversations, channels, users, invites, search
│   │   │   ├── utils/        # JWT helpers
│   │   │   └── websocket/    # WebSocket gateway with Redis pub/sub
│   │   └── Dockerfile
│   └── web/                  # Next.js frontend
│       ├── src/
│       │   ├── app/          # Next.js App Router pages
│       │   ├── lib/          # API client, auth store
│       │   └── hooks/        # WebSocket hook
│       └── Dockerfile
├── packages/
│   └── shared/               # Shared TypeScript types
├── infra/
│   └── docker-compose.yml    # Full local dev stack
├── docs/
│   ├── architecture.md       # Architecture diagrams (Mermaid)
│   └── openapi.yaml          # API specification
├── .env.example
└── README.md
```

---

## Quick Start (Docker)

### Prerequisites
- Docker Engine 24+
- Docker Compose v2

### 1. Clone and configure

```bash
git clone https://github.com/jhwodchuck/PrivateMesh.git
cd PrivateMesh
cp .env.example .env
# Edit .env and set JWT_SECRET and JWT_REFRESH_SECRET:
# openssl rand -hex 64  # use output for JWT_SECRET
# openssl rand -hex 64  # use output for JWT_REFRESH_SECRET
```

### 2. Start with Docker Compose

```bash
cd infra
docker compose up -d
```

This starts PostgreSQL, Redis, MinIO, API (port 3001), and Web (port 3000).

### 3. Run database migrations

```bash
docker compose exec api npm run migrate
```

### 4. Open the app

Visit `http://localhost:3000`

---

## Local Development

### Prerequisites
- Node.js 20+, PostgreSQL 16, Redis 7

### Setup

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# Configure .env files, then:
cd apps/api && npm run migrate
npm run dev  # starts both API and Web
```

---

## Running Tests

```bash
cd apps/api && npm test
```

---

## API Documentation

Full OpenAPI spec: [`docs/openapi.yaml`](docs/openapi.yaml)

**WebSocket**: `ws://localhost:3001/ws?token=<accessToken>`

---

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for system diagrams, database schema, authentication flow, E2EE design, and scaling strategy.

---

## Security

- Passwords hashed with argon2id
- Access tokens: 15min; Refresh tokens: 30 days
- Rate limiting: 500 req/15min global; 20 req/15min auth
- File upload MIME allowlist, 50MB limit, AES256 at rest
- All SQL queries parameterized (no injection risk)
- Helmet security headers
- **Change JWT secrets before deploying**: `openssl rand -hex 64`

---

## Trust & Safety

PrivateMesh supports resilient private communication while maintaining clear anti-abuse enforcement for illegal content (CSAM, malware, extortion, trafficking). Reports are stored 7 years; moderation actions are permanently audited.

---

## Roadmap

- Full Signal Protocol E2EE for DMs
- Passkey authentication + TOTP
- Push notifications
- Voice/video calls (WebRTC)
- Self-hosting docs + installer
- Federation/relay node support
- React Native mobile apps
