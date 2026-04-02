# Ubuntu Install, Signup, And First-Message Readiness Plan

## Summary

The original Ubuntu copy plan was too shallow because it mainly cleaned up wording. It did not answer the practical question: can a tester install the Ubuntu app, sign up, and send a first message quickly enough to trust the desktop lane?

This revised plan treats Ubuntu as an onboarding-product problem, not just a copy problem.

The core decision is simple:

- Ubuntu should expose one invite-led onboarding flow.
- The app should not advertise a visible second lane for local testing.
- Local Ubuntu testing should still be deterministic by using a reusable real beta invite token and automatic local relay adoption when the relay is already running.

## User Outcome

Primary local outcome:

- a repo user on Ubuntu can run one command, launch the installed desktop app, complete auth, and send a first message without hunting for a hidden test mode

Important constraint:

- hosted production beta is still not honest to promise as a universal five-minute flow because it depends on a valid invite plus real email delivery
- the deterministic five-minute path is the Ubuntu local lane

## Current Reality On April 2, 2026

What already existed:

- Linux packaging in `apps/desktop/src-tauri/tauri.conf.json`
- Linux release automation in `.github/workflows/release-linux.yml`
- public `.deb` and `.AppImage` artifacts in `v0.1.0-beta.2`
- a desktop shell that can complete auth, create groups, and send relay-hosted group messages

What still felt wrong:

- the shell exposed a visible local-vs-production split
- the fast local path relied on the special `dev-beta-invite` token instead of a seeded real beta invite entry
- the app asked testers to click a relay preset before the happy path worked
- the plan file and Ubuntu guide did not make the real readiness gap obvious

## Product Decision

Ubuntu onboarding should now behave like this:

1. The tester runs `npm run ubuntu:ready`.
2. That command starts the local relay, seeds a reusable real beta invite token, builds the `.deb`, installs it, and leaves the relay running.
3. The tester opens the desktop app.
4. If there is no saved relay override and no existing session, the app detects the local relay automatically.
5. The app prefills the reusable local beta invite token when no group invite URL is present.
6. The tester uses the normal invite-led auth form and finishes sign-in in-app.

This keeps one visible onboarding flow while still preserving deterministic local testing.

## Scope

In scope:

- Ubuntu onboarding copy and UX in the desktop shell
- local Ubuntu quickstart scripts
- seeded reusable local beta invite handling
- Ubuntu docs and repo guidance
- rebuilding and reinstalling the Ubuntu desktop package locally
- smoke verification for signup, group creation, and first message

Out of scope:

- hosted production invite tooling
- hosted email-delivery reliability work
- relay architecture changes
- encrypted group-history redesign
- macOS and iPhone rollout work

## Implementation Workstreams

### 1. Seed a reusable real local beta invite

Add a repo script that writes a reusable local beta invite into the local D1 database.

Requirements:

- token value: `ubuntu-local-test-invite`
- hash format must match relay invite validation
- invite should be reusable for repeated local account creation
- script should be callable directly and from the Ubuntu quickstart flow

Expected artifacts:

- `scripts/create-local-test-invite.sh`
- `npm run invite:local:test`

### 2. Make the local Ubuntu quickstart deterministic

The Ubuntu quickstart command should now prepare the actual test lane, not just install the app.

Requirements:

- local relay starts in detached `screen`
- local migrations are applied
- reusable local beta invite is seeded
- desktop `.deb` is built and installed
- final console output tells the tester the real invite token and first-run steps

Expected commands:

- `npm run relay:local`
- `npm run relay:local:screen`
- `npm run relay:local:stop`
- `npm run invite:local:test`
- `npm run install:desktop:ubuntu`
- `npm run ubuntu:ready`

### 3. Remove the visible second lane from the desktop shell

The desktop shell should present one normal onboarding surface.

Requirements:

- remove explicit `Use local relay preset` and `Use production relay` buttons
- keep relay diagnostics available for manual overrides
- auto-detect the local relay only when:
  - there is no saved relay override
  - there is no existing session
- save the adopted local relay URL so the app stays on the working lane during the test session
- prefill the reusable local beta invite token when:
  - the local relay is active
  - there is no group invite URL
  - there is no existing beta invite token in the form

Desktop copy changes:

- step 1 should talk about the invite being tested, not a separate local lane
- bootstrap copy should say the same form accepts either a real group invite URL or the reusable local beta invite
- local relay status copy should identify the seeded test invite token directly
- diagnostics copy should say the app adopts a running local relay automatically

### 4. Update the Ubuntu docs and repo guidance

Repo docs should describe the actual deterministic path.

Required updates:

- `docs/ubuntu-install-and-test.md`
- `README.md`
- this plan file

Docs must explain:

- `ubuntu:ready` now seeds a reusable real local beta invite
- the app auto-adopts the local relay when appropriate
- the local test token is `ubuntu-local-test-invite`
- hosted production still is not the guaranteed five-minute path

### 5. Rebuild, reinstall, and verify locally

The work is not complete until the updated Ubuntu package is installed again on this machine.

Required verification:

- rebuild desktop bundle
- reinstall the Ubuntu `.deb`
- verify local relay health
- verify auth start with `ubuntu-local-test-invite`
- verify auth completion
- verify group creation
- verify first message send

## Acceptance Criteria

- Ubuntu desktop presents one invite-led onboarding flow
- no visible local-vs-production preset buttons remain in the auth UI
- a reusable real local beta invite token exists for deterministic local signup
- `npm run ubuntu:ready` prepares the actual local Ubuntu test lane end to end
- the desktop app auto-adopts the local relay when there is no saved override and no session
- the Ubuntu guide and README describe the same flow the app actually uses
- the Ubuntu package is rebuilt and installed locally after the changes

## Test Cases

- fresh local Ubuntu setup runs `npm run ubuntu:ready`
- `screen -ls` shows `ember-relay`
- `curl http://127.0.0.1:8787/health` succeeds
- `npm run invite:local:test` returns `ubuntu-local-test-invite`
- installed desktop app opens with one normal auth form
- app auto-detects the local relay and prefills the local beta invite token
- user can start auth with any email-shaped value in local log-email mode
- user can complete auth with the in-app completion token
- user can create a group
- user can send the first message into that group

## Verification Commands

```bash
bash -n scripts/create-local-test-invite.sh
bash -n scripts/start-local-relay.sh
bash -n scripts/install-ubuntu-desktop.sh
bash -n scripts/ubuntu-ready.sh
npm run invite:local:test
curl http://127.0.0.1:8787/health
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
git diff --check
```

## Remaining Gaps After This Work

- hosted production beta still depends on invite state and real email delivery
- the first-photo loop still needs an actual GUI human pass after package reinstall
- relay-hosted group threads and raw attachment storage remain implementation gaps already documented elsewhere

## Default Decisions

- keep public copy neutral
- keep one visible onboarding flow
- use a reusable real local beta invite instead of the special `dev-beta-invite` shortcut for the Ubuntu happy path
- auto-adopt local relay only for fresh local onboarding, not for existing signed-in sessions
- keep relay override diagnostics available for staging and recovery cases
