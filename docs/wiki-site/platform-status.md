# Platform Status

This page is the single authoritative table for what is live, in-progress, or planned across every active beta surface. When the download page, release notes, and this table disagree, this table is the most current.

## Key

| Symbol | Meaning                                                        |
| ------ | -------------------------------------------------------------- |
| ✅     | Live and stable on this surface                                |
| ⚠️     | Partially live, incomplete, or requires operator configuration |
| 🔜     | In progress — expected in current phase                        |
| 📋     | Planned — not yet started                                      |
| ❌     | Not available on this surface                                  |

## Feature Matrix

| Feature                                   | Web | Android                               | Windows                  | Ubuntu                   |
| ----------------------------------------- | --- | ------------------------------------- | ------------------------ | ------------------------ |
| Onboarding & invite registration          | ✅  | ✅                                    | ✅                       | ✅                       |
| Email magic-link auth                     | ✅  | ✅                                    | ✅                       | ✅                       |
| 18+ age affirmation                       | ✅  | ✅                                    | ✅                       | ✅                       |
| Pseudonymous profile setup                | ✅  | ✅                                    | ✅                       | ✅                       |
| E2EE direct messages                      | ✅  | ✅                                    | ✅                       | ✅                       |
| Small private groups (≤ 12)               | ✅  | ✅                                    | ✅                       | ✅                       |
| Device-encrypted group history            | ✅  | ✅                                    | ✅                       | ✅                       |
| Legacy relay-hosted compatibility history | ⚠️  | ⚠️                                    | ⚠️                       | ⚠️                       |
| Invite review and management              | ✅  | ✅                                    | ✅                       | ✅                       |
| Device-local search                       | ✅  | ✅                                    | ✅                       | ✅                       |
| Session listing and revocation            | ✅  | ✅                                    | ✅                       | ✅                       |
| Account recovery (email bootstrap)        | ✅  | ✅                                    | ✅                       | ✅                       |
| Full trusted-device recovery              | 🔜  | 🔜                                    | 🔜                       | 🔜                       |
| Attachments (client-side encrypted)       | ✅  | ⚠️ migration in progress              | ⚠️ migration in progress | ⚠️ migration in progress |
| Local SQLite history cache                | ❌  | ✅                                    | ✅                       | ✅                       |
| Push notifications                        | ❌  | ⚠️ code complete, needs relay secrets | ❌                       | ❌                       |
| Disclosure-based report flow              | ✅  | ✅                                    | ✅                       | ✅                       |
| Passkey sign-in                           | 📋  | 📋                                    | 📋                       | 📋                       |
| Encrypted backup / export / import        | 📋  | 📋                                    | 📋                       | 📋                       |
| Self-serve invite validation              | 📋  | 📋                                    | ❌                       | ❌                       |
| Magic-link self-serve resend              | 📋  | 📋                                    | ❌                       | ❌                       |
| Native desktop shell                      | ❌  | ❌                                    | ✅                       | ✅                       |

## Posted Builds

| Surface | Status                             | Build artifact                        |
| ------- | ---------------------------------- | ------------------------------------- |
| Web     | Always current (deployed on merge) | Browser — no install                  |
| Android | Primary beta client                | `.apk` via GitHub Releases            |
| Windows | Beta client                        | `.exe` / `.msi` via GitHub Releases   |
| Ubuntu  | Beta client                        | `.deb` / AppImage via GitHub Releases |
| iPhone  | Deferred                           | —                                     |
| macOS   | Deferred                           | —                                     |

Current release versions are listed on the [download page](https://emberchamber.com/download) and the [GitHub Releases](https://github.com/jhwodchuck/EmberChamber/releases) feed.

## Push Status Note

Android push is wired end-to-end in both the mobile client (`apps/mobile/src/lib/push.ts`) and the relay (`POST /v1/devices/push-token`, `DELETE /v1/devices/push-token`). The only remaining step is operator configuration:

- `EMBERCHAMBER_FCM_SERVICE_ACCOUNT_JSON` — Firebase service account secret on the production relay
- `EMBERCHAMBER_PUSH_TOKEN_SECRET` — push token encryption secret on the production relay

See the [Operator Playbook](./operator-playbook) for the exact `wrangler secret put` commands.

## Attachment Encryption Note

Browser DM flows encrypt attachment bytes client-side before upload. Native clients (Android, Windows, Ubuntu) currently upload some attachment bytes without per-file client-side encryption — this is an active migration track. Do not describe the native attachment path as fully E2EE until it converges with the browser path.

## Recovery Note

Account recovery via email magic-link works on every surface. The fuller trusted-device-to-device recovery handoff (re-establishing keys on a newly linked device from an existing trusted device) is in progress and not yet complete. Total-device-loss recovery remains limited until that flow ships.
