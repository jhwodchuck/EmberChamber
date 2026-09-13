# EmberChamber Strategic Plan — 1 Month / 3 Months / 1 Year / 5 Years

Date: 2026-07-18
Status: planning document — product strategy, not an implementation spec.
Companion to [`docs/roadmap.md`](../roadmap.md) (phase history) and
[`docs/launch-targets.md`](../launch-targets.md) (buildable surfaces).

## 1. Where the product actually is

Phases 0–3 of the roadmap agreement are complete and Phase 4 hardening largely landed
(passkeys, account suspension, bulk report review, iOS/macOS scaffolding — commit `cd4c652`).
The remaining engineering debt that matters:

- **Uniform client-side attachment encryption** across every surface (still listed outstanding).
- **Retiring legacy relay-hosted group/room history** (readable D1 history still exists until
  each group migrates).
- **Desktop shell divergence** — `apps/desktop/shell/index.html` is a ~7k-line hand-rolled file
  that does not consume `packages/ui`; Windows/Ubuntu diverge visually from web/mobile.
- **Production push** — FCM and web-push VAPID are documented but not fully production-enabled.
- **Distribution polish** — no code-signed Windows builds, no notarized Apple builds, no
  auto-update channel, Play Store lane exists but the closed track needs to be actually live.

The strategic reality: **the product is built; it has no users yet.** The binding constraint has
shifted from engineering to adoption, trust, and operations.

## 2. Competitive landscape (July 2026)

**General E2EE messengers** — Signal (gold standard crypto, nonprofit, but phone-number
bootstrap and no organizer-governed communities), Threema (anonymous but
paid, low network effects), Session/SimpleX (strongest metadata privacy, weak UX/adoption),
Telegram (not E2EE by default; since the Durov arrest it shares user IP/phone data with
authorities at scale — tens of thousands of users' data handed over in 2025 — driving a trust
exodus that is a direct tailwind for private alternatives).

**Community platforms** — Discord (large public and private communities, no default E2EE),
Geneva (invite-only homes, no E2EE), Circle/Mighty Networks/Heylo (creator/organizer
monetization models worth borrowing, zero privacy posture).

**The open position:** *E2EE + organizer-governed invite-gated communities +
pseudonymous, no phone number + local-first history.* No shipping product occupies this
intersection. The organizer-pays SaaS model (Heylo/Circle) has never been applied to a
privacy-first messenger.

**Regulatory weather:** privacy, encryption, child-safety, app-store, and platform-accountability
rules continue to evolve across jurisdictions. The product needs a written jurisdictional
posture, data-minimization discipline, and periodic counsel review before broad availability.

## 3. One month (by ~2026-08-18) — "Real humans, real groups"

Goal: 3–5 real organizer-led groups from the initial cohort using the app daily.

1. **Close the two trust gaps**: uniform client-side attachment encryption everywhere; migrate
   and delete remaining relay-hosted group history. These are the difference between the
   privacy story being true and being aspirational — close them before recruiting strangers.
2. **Production push notifications** (FCM + web-push VAPID keys/migration). A messenger without
   reliable notifications does not retain anyone.
3. **Distribution minimum**: Play Store closed-testing track live; desktop download page with
   clear install paths; auto-update plan chosen (even if manual for now).
4. **Recruit design-partner groups**: 3–5 organizers from the initial target segment, white-glove
   onboarding, a private feedback channel (dogfood: run it in EmberChamber), weekly cadence.
5. **Instrument the funnel privately**: invite→first-message rate, media send success rate,
   session/recovery confusion — the metrics already named in the roadmap. Aggregate counts
   only, nothing content-derived.
6. **Operational dry run**: exercise report→revocation, suspension, recovery-handoff end to end
   with a test cohort; fix whatever the drill breaks.

Explicitly *not* this month: new features, new platforms, monetization.

## 4. Three months (by ~2026-10-18) — "A beta that retains"

Goal: 10–20 active communities, a few hundred weekly actives, retention you'd show an investor.

1. **Iterate on design-partner feedback** — expect the punch list to be onboarding confusion,
   media reliability, and notification behavior. Polish those before anything novel.
2. **Desktop decision**: rebuild the desktop shell on the shared web frontend/`packages/ui`
   (recommended) or formally accept divergence. The 7k-line static shell is the biggest
   consistency and velocity liability in the repo.
3. **Reliability SLOs**: crash-free session rate, end-to-end delivery latency, media
   success rate — tracked and trending, with the polish-plan bar ("boring reliability").
4. **Growth mechanics within constraints**: polish policy-gated member invites, vouching flow,
   organizer dashboards. Growth = organizers recruiting organizers; build the referral loop for
   *organizers*, not individuals.
5. **Regulatory posture decided**: written jurisdiction stance, eligibility-policy roadmap,
   and counsel review of E2EE, safety, privacy, and store-policy interaction.
6. **Monetization discovery**: interview organizers on willingness to pay; draft the free-tier /
   organizer-tier split. Do not charge yet.

## 5. One year (by mid-2027) — "The private home for trusted circles"

1. **iPhone + macOS launch** (scaffolding already exists). Mixed-device couples are the norm in
   the US ICP; iPhone absence is the single biggest adoption blocker. TestFlight by early 2027,
   App Store by mid-year, framed strictly as a private messenger.
2. **Monetization v1 — organizer subscriptions**: free personal/small-group use forever; paid
   organizer tier (larger communities, more rooms, longer attachment retention, admin tooling,
   priority support). Neutral SaaS billing for a general-purpose messenger keeps
   payment processors comfortable. Target: revenue covering infra + services by end of 2027.
3. **Voice, then maybe video**: E2EE voice notes first (cheap, high value), then 1:1 E2EE calls.
   Group video stays deferred.
4. **Trust maturation**: key-verification UX (safety numbers), encrypted backup/export on all
   surfaces (Android has it), passkey-first auth with trusted-device recovery, a third-party
   security audit with published results, and a decision on open-sourcing clients/protocol.
5. **Cohort expansion**: from privacy-conscious early adopters to adjacent groups that need
   discretion — organizers, mutual-aid and support groups, families, and private crews that
   do not want an advertising platform in the room. Same product, wider door.
6. **Scale targets**: 100–500 communities, low thousands of weekly actives, organizer NPS as the
   north-star qualitative metric.

## 6. Five years (2031) — "The private layer for real-world circles"

Vision: when any real-world group needs a private home — not a public audience — EmberChamber is
the default, the way Signal is the default for private 1:1s.

- **Beachhead → rings**: privacy-conscious cohort (validated) → organizer-led trusted circles
  (year 1–2) → general private-group messaging as the Discord/Facebook-Groups privacy backlash
  compounds (years 3–5).
- **Technology end-state**: audited, possibly open protocol; self-hostable or bring-your-own
  relay for high-trust organizations (differentiates from Signal's centralization without
  Matrix's federation pain); local-first history and device-encrypted groups as the durable
  architectural moat; post-quantum migration tracked against Signal's PQXDH work.
- **Business end-state**: profitable at modest scale on organizer SaaS (the Threema lesson:
  privacy products can be sustainable without hypergrowth). Optional adjacencies — event tooling
  and organizer integrations — only if they never compromise the privacy model.
- **Moats**: trust brand (breach-free record + audits + local-first architecture), organizer
  network effects (communities are heavy to move), cross-platform reach including the platforms
  privacy rivals neglect (desktop Linux/Windows).
- **Standing risks to manage**: identity and eligibility regulation (prefer privacy-preserving
  verification — ZK/on-device approaches as standards mature), EU chat-control/client-side
  scanning debates, app-store policy shifts, payment-rail morality policing, and CSAM/abuse
  posture (disclosure-based reporting + revocation must scale credibly with growth).

## 7. The five bets this plan makes

1. The wedge is *after-discovery* private space, not discovery — don't drift toward dating.
2. Organizers are the customer; members are users. Sell to, build for, and grow through
   organizers.
3. Privacy-first framing keeps the product promise clear across stores, processors, and
   regulators.
4. iPhone is the gate between "beta" and "real product" in this market.
5. Trust is the compounding asset: every audit, breach-free year, and true privacy claim is
   worth more than any feature.

---

## 8. Consolidated outstanding engineering backlog

This section absorbs the *unfinished* work from the retired plan documents that previously lived
in `docs/plansforwork/` (`relay-hardening-and-relay-first-migration.md`,
`telegram-signal-level-polish-plan.md`, `2026-04-09-mobile-modularization-plan.md`,
`phase2-completion-plan.md` — the last was fully complete). Everything those plans listed that
shipped has been dropped; only remaining work is recorded here. This is now the single
engineering backlog for the repo.

### 8.1 Trust closeout (highest priority — makes the privacy story fully true) — done 2026-07-18

- **Uniform client-side attachment encryption — done.** All three clients already encrypted
  message attachments client-side before upload; the only remaining plaintext path was avatar
  uploads (no `conversationId`, profile presentation data, not message content — intentionally
  out of scope, same trust class as a pseudonymous display name). The relay now *enforces* this
  at the schema level: `POST /v1/attachments/ticket` rejects `encryptionMode !== "device_encrypted"`
  whenever `conversationId` is set (`apps/relay/src/schemas.ts`), so plaintext message-attachment
  tickets are structurally impossible, not just conventionally avoided. Relay tests added in
  `apps/relay/test/routes.test.ts`; no protocol payload shape changed, so no Rust-side edit was
  needed.
- **Retire relay-hosted group/room history — done, rescoped.** Investigation found rooms and
  communities are relay-hosted by *permanent* product design (Phase 2 architecture), not a
  legacy leftover — only pre-migration `kind = 'group'` rows on `history_mode = 'relay_hosted'`
  are legacy (no live code path creates new ones; `POST /v1/groups` has created
  `device_encrypted` groups only since the encrypted-group migration). Retroactively
  re-encrypting old plaintext history was explicitly ruled out by the original relay-hardening
  plan, so the shipped mechanism is freeze-then-purge, not migrate-in-place: new migration
  0019 adds `legacy_history_retired_at`/`legacy_history_purged_at`; two operator-gated,
  audit-logged endpoints (`POST /v1/admin/conversations/:id/{retire,purge}-legacy-history`,
  `apps/relay/src/handlers/operator.ts` + `services/legacy-group-retirement.ts`) freeze writes
  (410 `GROUP_HISTORY_RETIRED` on send/react/edit/delete) then purge messages and attachment
  blobs, in that enforced order. Reads stay available after freeze — only purge removes history.
  Operator runbook added to `docs/operator-playbook.md`. No client code changes were needed: all
  three clients already surface the relay's error `message` text verbatim in their existing
  generic send-failure UI, so the calm, actionable copy reaches users for free.
- **Legacy path removal — done, deleted.** `apps/api`, `infra/docker-compose.yml`
  (+ `infra/compose`), and `services/*` are deleted (git history retains them). Nothing active
  depended on them. Updated in lockstep: `scripts/check-repo-contracts.mjs` (dropped the
  required-path assertions), `repo-map.yaml` (removed the three entries), `Cargo.toml` (dropped
  the now-moot `services/*` exclude), `package.json` (`dev:legacy`/`test:legacy` scripts and the
  `format` glob), plus `AGENTS.md`, `CLAUDE.md`, `README.md`, `CONTRIBUTING.md`,
  `docs/README.md`, `docs/roadmap.md`, `docs/architecture.md`,
  `docs/architecture/overview.md`, `docs/wiki-site/contributing.md`, and the `llm_council/*`
  grounding docs. `docs/api/openapi.yaml` (the now-orphaned legacy spec) was deleted too.
  `npm run check:repo-contracts` passes; `package-lock.json` regenerated via `npm install`
  (174 packages dropped).

Verification note (updated 2026-07-18 after Rust was installed in this environment): `cargo test
-p emberchamber-core -p emberchamber-relay-protocol` passes clean (13 tests, including the
Rust↔TS protocol parity fixture test), confirming the schema-only attachment-encryption change
needed no Rust-side edits and broke nothing. `apps/relay`'s vitest suite still cannot run here —
`execFileSync("npx", ...)` throws `ENOENT` inside the test's `beforeAll`, reproducible on the
untouched file with Rust installed and on PATH, so it is specifically a wrangler-test-harness
`npx` spawn quirk in this sandbox, not a toolchain gap. `tsc --noEmit` for `apps/relay` and
`packages/protocol` is clean; the new tests were traced by hand against the implementation. Run
the vitest suite in CI or a normal dev machine before merging.

### 8.2 Desktop parity (the #1 cross-surface consistency liability) — done 2026-07-18

- **Rebuilt the desktop shell on the shared frontend — option (a), static export.** Chose
  "embed `apps/web`" over rebuilding on `packages/ui` primitives, specifically as a **build-time
  static export bundled into the installer** — not a live remote-URL wrapper, which
  `apps/desktop/AGENTS.md` already forbade and would have been a real security regression for an
  E2EE app (server pushing fresh JS with local-key access on every launch). `apps/web` had zero
  API routes, middleware, or server actions, and every authenticated `/app/*` page was already
  `"use client"` — a genuine SPA riding Next.js App Router, not something requiring a live
  server. `apps/desktop/shell/index.html` (~7,200 lines) and `shell/vendor/` are deleted.
  - `apps/web/next.config.js`: `NEXT_OUTPUT=desktop` → `output: "export"`, `images.unoptimized`,
    skips the server-only `headers()` config (desktop's CSP comes from
    `tauri.conf.json` `app.security.csp` instead, unchanged).
  - Dynamic routes (`/app/chat/[id]`, `/app/community/[id]`, `/app/channel/[id]`,
    `/invite/[[...segments]]`) needed `generateStaticParams()`, which cannot coexist with
    `"use client"` in the same file (confirmed by the actual Turbopack build error, not
    assumption) — each was split into a server `page.tsx` (one placeholder param) + a
    `page-client.tsx` (the real component, unchanged). `/login` and `/register` had a similar
    server-`searchParams` incompatibility, fixed the same way using `useSearchParams()` +
    `Suspense` instead. Known, documented, accepted limitation: a *cold* navigation straight to
    a dynamic route 404s under static hosting — verified this empirically, not just in theory.
    In-app client-side navigation (the only way Tauri ever reaches these routes) is unaffected —
    also verified empirically (a real link click navigated `/start` → `/login` with zero network
    request, matching Next's client router).
  - **Security-critical:** private keys and session tokens are no longer in browser
    `localStorage` on desktop. New `apps/web/src/lib/secure-storage.ts` detects the Tauri IPC
    bridge (`globalThis.__TAURI_INTERNALS__`, the same check the old shell used) and routes
    through the *existing, unchanged* OS keyring-backed `load_secure_state`/`save_secure_state`/
    `clear_secure_state` Rust commands instead; the public web build's behavior is byte-for-byte
    unchanged (falls through to `localStorage`). Reads had to stay synchronous for the many
    existing call sites, so a `<SecureStorageBootstrap>` gate hydrates one in-memory cache from
    the keyring once before the app renders (desktop-only; a web build no-op).
  - **Relay URL**: desktop now bakes `NEXT_PUBLIC_RELAY_URL` in at build time like the public
    web deployment (`.github/workflows/reusable-release-desktop.yml` now sets it to
    `https://relay.emberchamber.com` for release builds — this was a real gap: without it,
    packaged desktop installers would have shipped pointed at `127.0.0.1:8787`). To preserve the
    old shell's "auto-detect a local relay, no rebuild needed" behavior (which
    `npm run ubuntu:ready` and local dev depend on), added a narrow runtime override:
    `detectLocalRelayOverride()` probes `127.0.0.1:8787/health` once at startup, desktop-only.
    The old shell's *manual* relay-override settings field was not reintroduced — noted as a
    known gap in `apps/desktop/AGENTS.md`.
  - `tauri.conf.json`: `devUrl: http://localhost:3000` + `beforeDevCommand: npm --prefix ../web
    run dev` for real HMR during `tauri dev` (a genuine improvement over the old shell's no-HMR
    hand-editing workflow); `frontendDist: ../../web/out` + `beforeBuildCommand: npm --prefix
    ../web run build:desktop` for production. `beforeDevCommand`/`beforeBuildCommand` run with
    CWD `apps/desktop` (the npm workspace directory tauri-cli is invoked from), not
    `apps/desktop/src-tauri` — confirmed by a real failed build (`--workspace=apps/web` couldn't
    resolve a workspace root from there; `--prefix ../../web` then also failed, off by one
    level) before landing on the working `--prefix ../web`. `lib.rs`'s window now opens at
    `start.html` (onboarding), not `index.html` (marketing homepage).
  - CI: the old shell's screenshot step (`file://.../shell/index.html`) is retired from
    `ci-web.yml`/`reusable-ci-web.yml`/`publish-screenshots.yml` — desktop renders the same DOM
    as the web screenshots now, so it was redundant, not lost coverage.
  - Release workflow (`reusable-release-desktop.yml`) now sets `NEXT_PUBLIC_RELAY_URL`/
    `NEXT_PUBLIC_WEB_URL` to the production origins for the desktop build step — a real gap
    caught before shipping, not just in review: without it, packaged installers would have
    defaulted to `127.0.0.1:8787`.
  - **Found and fixed a real, unrelated, launch-blocking bug via full verification**: the
    pre-existing `tauri-plugin-updater` registration (inactive, but still initialized) panics at
    startup on current Tauri because `plugins.updater` config lacks the now-required `pubkey`
    field. Auto-update was never implemented (no real signing keypair exists, and it's listed as
    deferred in `docs/launch-targets.md`), and nothing in the new frontend calls the update
    commands — removed the plugin, its two Tauri commands, and the `tauri-plugin-updater`
    dependency entirely rather than ship a fake pubkey. This is pre-existing and unrelated to the
    shell rebuild itself, but the rebuild's end-to-end verification is what surfaced it.
  - *Verify — fully completed after Rust was installed in this environment (2026-07-18):*
    `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml` passes clean (one pre-existing,
    unrelated warning in `secure_state.rs`, gated to non-Unix builds). A real `tauri build --debug
    --no-bundle` succeeded end to end — ran the `apps/web` static export, compiled the Rust binary,
    and produced `target/debug/emberchamber-desktop.exe`. That binary was launched directly and
    stayed running stably (steady ~39MB memory, no crash, no error output) after the updater fix —
    before the fix, it panicked immediately, confirming the fix was both necessary and sufficient.
    The user declined screen-share access to visually confirm the rendered window content, which
    is respected; the process-level evidence (clean launch, stable run, matches the exact crash
    signature before/after the fix) is still strong, direct evidence the app initializes and loads
    the frontend correctly. **Still not verified**: `npm run ubuntu:ready` (Linux-only smoke lane,
    not runnable on this Windows sandbox) and a real relay-backed login/message-send smoke test
    through the packaged app (the local relay dev server crashes on startup in this sandbox — a
    separate, pre-existing wrangler/Windows issue, confirmed unrelated to Rust or this change).
    Both should be run before shipping.
- Follow-ons unlocked by the rebuild, still open: desktop native notifications + tray behavior,
  HiDPI/Linux packaging polish, desktop accessibility, a manual relay-override settings UI, and a
  packaged-app screenshot/visual-regression lane (native chrome, OS compositor — the web
  screenshot suite covers the shared DOM but not window chrome).

### 8.3 Mobile structural completion (from the modularization plan)

- **Finish the `App.tsx` decomposition.** Down from ~2,985 to ~2,362 lines and `src/features/`
  now owns auth, conversations, deviceLink, invites, and notifications — but attachments,
  profile, settings, and sync extraction remain, and `App.tsx` should shrink to boot + routing +
  shell composition. `src/styles.ts` (~1,131 lines) should keep migrating toward tokens.
- **Android-native bridge seams.** Define capability interfaces for push behavior,
  Keystore-backed secrets, background sync, and share intents; prove the pattern on one seam
  (push or secure storage). *Verify:* `npm run verify --workspace=apps/mobile`.

### 8.4 Production launch readiness (from §3, the one-month plan)

- Production push end-to-end: FCM config (`docs/android-fcm-setup.md`) and web-push VAPID keys +
  migration enabled in production.
- Play Store closed-testing track live (`docs/android-play-store-release.md`).
- Windows code signing; Apple signing/notarization when iOS/macOS commit; auto-update channel
  decision for desktop.
- Performance budget gate (Lighthouse/web-vitals on key web routes) — the one QA gate from the
  polish plan still missing; visual-regression and axe accessibility gates already exist.

### 8.5 Delight backlog (from the polish plan's P3 — do after the above)

- Shared motion vocabulary sweep + tasteful desktop transitions (token-driven, reduced-motion
  safe).
- "Trusted circles" visual signature motif across onboarding / thread-entry / invite moments.
- Perceived-speed micro-polish: optimistic everything, prefetch on hover/focus, skeleton timing.
- Presence / quiet-state metadata that respects the no-discovery privacy boundary.
