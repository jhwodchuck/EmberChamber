# Contributing

This repo is organized around the active beta runtime, not the legacy prototype stack.

## Active Paths

Default to these paths for new work:

| Work type | Path |
| --- | --- |
| Relay auth, invites, mailbox, groups, attachments | `apps/relay` |
| Web UI, onboarding, invite landing, browser messaging | `apps/web` |
| Android and iPhone client | `apps/mobile` |
| Desktop shell and packaging | `apps/desktop`, `apps/desktop/src-tauri` |
| Shared secure-state logic | `crates/core` |
| Relay contract changes | `crates/relay-protocol` and `packages/protocol` |

Legacy paths like `apps/api`, `infra/docker-compose.yml`, and `services/*` are not the default place
for new beta work.

## Prerequisites

- Node.js 22 recommended for the active app and relay workflows
- npm 10 for the root workspace scripts and CI lanes
- Rust toolchain for `crates/*` and `apps/desktop`
- Android SDK or Xcode only if you are touching `apps/mobile`
- Wrangler only if you are working directly on relay development or deployment

The root workspace is `npm`-first. The standalone wiki in `docs/wiki-site` uses its own `pnpm`
install flow and is not part of the root workspace.

## First Local Run

From the repo root:

```bash
npm run bootstrap
npm run dev
```

`npm run bootstrap` installs dependencies, creates missing local env files, builds
`packages/protocol`, and seeds the reusable local beta invite after applying local relay
migrations. `npm run dev` then starts the relay dev runtime and the Next.js web app.

## Fastest Deterministic Local Lane

If you want the clearest end-to-end smoke test for the desktop shell on Linux, use:

```bash
npm run ubuntu:ready
```

That seeds a reusable local beta invite, starts the local relay in a detached `screen` session, and
installs the Ubuntu desktop package. The full flow is documented in
[`docs/ubuntu-install-and-test.md`](docs/ubuntu-install-and-test.md).

## Verification Matrix

Run the smallest relevant checks for the paths you touched:

```bash
# Repo guidance, docs, scripts, and workflows
npm run check:repo-contracts

# Protocol contracts
npm run build --workspace=packages/protocol

# Relay
npm run build --workspace=apps/relay
npm test --workspace=apps/relay

# Web
npm run lint --workspace=apps/web
npm run build --workspace=apps/web

# Mobile
npm run type-check --workspace=apps/mobile

# Desktop shell
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml

# Shared Rust core and protocol
cargo test -p emberchamber-core -p emberchamber-relay-protocol
```

If you change protocol payloads or auth or session shapes, verify both the TypeScript and Rust
contracts.
If you change runtime boundaries, docs, repo routing, or CI metadata, run `npm run check:repo-contracts`.

For a full active-runtime sweep, run:

```bash
npm run verify:all
```

## AI Review Council

For non-trivial reviews, audits, or cross-surface work, use the council kit in `llm_council/`.

```bash
cp llm_council/templates/review-request.template.yaml review-request.yaml
npm run council:review -- HEAD WORKTREE "current-worktree"
cat recommended-reviewers.txt
```

Use `main HEAD` when you want a branch or PR diff instead of the local dirty worktree.

## Product Constraints

Preserve the current beta direction:

- Invite-only access
- Adults-only 18+ affirmation
- Email magic-link bootstrap
- End-to-end encrypted DMs and new device-encrypted groups
- Organizer or admin invite control in phase 1
- Local-first device history
- Web as a capable secondary surface, not the preferred primary client

Do not reintroduce:

- Public-discovery-first growth
- Phone-number identity
- Server-side search over private message content
- Anonymous, uncensorable, or law-proof positioning
- Legacy centralized product assumptions unless the task explicitly requires them

## Useful Docs

- [`README.md`](README.md)
- [`repo-map.yaml`](repo-map.yaml)
- [`docs/README.md`](docs/README.md)
- [`docs/architecture.md`](docs/architecture.md)
- [`docs/security/threat-model.md`](docs/security/threat-model.md)
- [`docs/launch-targets.md`](docs/launch-targets.md)
- [`docs/operator-playbook.md`](docs/operator-playbook.md)
