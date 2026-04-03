# Getting Started

This guide covers local development setup for every active surface in the EmberChamber monorepo.

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20 LTS | Any 20.x release |
| pnpm | 10.x | Managed via `corepack` — run `corepack enable` once |
| Rust | stable | Required for `crates/core`, `crates/relay-protocol`, and the Tauri desktop shell |
| Cargo | bundled with Rust | — |

For Android mobile builds you also need the Android SDK (managed by Expo / EAS Build) and for Ubuntu desktop you need the Tauri system dependencies (GTK3, webkit2gtk, etc.).

## First-Time Setup

```bash
# 1. Clone the repo
git clone https://github.com/jhwodchuck/EmberChamber.git
cd EmberChamber

# 2. Enable corepack so pnpm is available
corepack enable

# 3. Copy environment variable templates
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local

# 4. Build shared packages before anything else
npm run build --workspace=packages/protocol

# 5. Start the relay + web app together
npm run dev
```

The relay runs on `http://localhost:8787` by default. The web app runs on `http://localhost:3000`.

## Surface-Specific Setup

### Relay (Cloudflare Worker)

```bash
# Apply local D1 migrations
cd apps/relay
npx wrangler d1 migrations apply emberchamber-relay-dev --local

# Run just the relay
npm run dev --workspace=apps/relay
```

See [Relay](./relay.md) for full details.

### Web App (Next.js)

```bash
npm run build:web   # production build
# or
npm run dev         # dev mode (relay + web together)
```

See [Web](./web.md) for full details.

### Desktop App (Tauri)

Ubuntu/Linux requires the Tauri system dependencies first:

```bash
npm run install:desktop:ubuntu   # installs GTK/webkit deps on Ubuntu
npm run dev:desktop
```

Windows and macOS use the same `npm run dev:desktop` command after installing Rust and the platform Tauri prerequisites.

See [Desktop](./desktop.md) for full details.

### Mobile App (Expo / Android)

```bash
npm run dev:mobile          # start Metro bundler
npm run build:android       # local release APK/AAB
```

An Android emulator or physical device is required. See [Mobile](./mobile.md) for full details.

### Ubuntu Local Test Lane

The Ubuntu smoke-test lane sets up a local relay, seeds an invite token, and installs the desktop package in one shot:

```bash
npm run ubuntu:ready
```

After it finishes, the desktop app connects to the local relay automatically and pre-fills the test invite token.

## Verification

Run the following checks before opening a pull request:

```bash
# TypeScript and protocol contracts
npm run type-check

# Relay tests
npm run test --workspace=apps/relay

# Rust checks
cargo check -p emberchamber-core -p emberchamber-relay-protocol
cargo test  -p emberchamber-core -p emberchamber-relay-protocol

# Lint
npm run lint
```

## Repo Structure

```
apps/
  relay/        Cloudflare Worker — auth, groups, mailbox, attachments
  web/          Next.js — onboarding, DMs, groups, search, settings
  mobile/       Expo — Android (+ iPhone scaffold)
  desktop/      Tauri — Windows, Ubuntu, macOS shell

crates/
  core/         Rust local-first sync and secure-state
  relay-protocol/ Canonical Rust relay contracts

packages/
  protocol/     TypeScript mirror of relay contracts
  shared/       Shared utilities
  ui/           Shared UI components

docs/
  architecture.md     System architecture
  launch-targets.md   Buildable surfaces and release lanes
  operator-playbook.md Day-to-day operational procedures
  roadmap.md          Product roadmap and phase plan
```
