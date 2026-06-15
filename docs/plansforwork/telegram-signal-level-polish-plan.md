# Telegram/Signal-Level Polish Plan for EmberChamber

Date: 2026-06-14
Scope: active beta runtime surfaces (`apps/web`, `apps/mobile`, `apps/desktop`, `apps/relay`,
`packages/protocol`, `crates/core`, `crates/relay-protocol`) and the shared design system in
`packages/ui`.
Status: **planning only — no product code changes in this document.**

> This plan is a unifying meta-roadmap. It does **not** replace the existing surface-specific
> roadmaps; it sequences and gap-fills them:
> - [`docs/android-polish-roadmap.md`](../android-polish-roadmap.md) — Android motion/gesture (Phase 0 stack now installed)
> - [`docs/web-polish-roadmap.md`](../web-polish-roadmap.md) — web chat-surface polish (largely shipped)
> - Cross-surface IA/hierarchy punch list (completed in full as of 2026-05-19)
> - [`docs/plansforwork/2026-04-09-mobile-modularization-plan.md`](2026-04-09-mobile-modularization-plan.md) — `App.tsx` god-component decomposition
> - [`docs/plansforwork/relay-hardening-and-relay-first-migration.md`](relay-hardening-and-relay-first-migration.md) — relay reliability
>
> Where those documents already own a task, this plan references them rather than re-specifying.

---

## 1. Executive Summary

### Current state (grounded in the repo, 2026-06)

EmberChamber is **feature-rich but unevenly polished across surfaces**. The three active client
surfaces are at materially different maturity levels:

- **Mobile (`apps/mobile`) — most mature feel.** The native-grade interaction stack the
  android-polish-roadmap called for is now installed (`react-native-reanimated@4.2.1`,
  `react-native-gesture-handler`, `@shopify/flash-list@2.0.2`, `expo-haptics`, `expo-blur`,
  `expo-linear-gradient`, `expo-notifications`, `react-native-keyboard-controller` —
  `apps/mobile/package.json`). Co-located `*.styles.ts` modules, `src/lib/motion.ts`,
  `src/lib/haptics.ts`, `TypingDots.tsx`, `Shimmer.tsx`, `GradientBackground.tsx`, and a rich
  component set (`AttachMenuSheet`, `PollCreatorSheet`, `MessageContextMenu`, `ImageViewerModal`)
  exist. **Structural debt remains the drag**: `apps/mobile/App.tsx` is ~2,985 lines and
  `apps/mobile/src/styles.ts` is ~2,533 lines.
- **Web (`apps/web`) — its polish roadmap largely shipped.** The chat surface has the full polish
  suite: `apps/web/src/components/chat/{message-row,read-ticks,typing-dots,jump-to-bottom,image-lightbox,message-context-menu,reaction-chip,skeletons}.tsx`,
  plus `src/lib/avatar-color.ts` and an OLED theme. Web is a credible secondary surface.
- **Desktop (`apps/desktop`) — the laggard, and the biggest consistency liability.** The desktop
  "app" is a single hand-rolled **7,158-line static file**, `apps/desktop/shell/index.html`, with
  vendored crypto (`shell/vendor/tweetnacl.min.js`, `shell/vendor/zxing-browser.min.js`), inlined
  CSS variables that *duplicate but do not import* the design tokens, a dark-only `color-scheme`,
  and its own font stack (`"Ubuntu","Cantarell","Segoe UI"`). It does **not** consume
  `packages/ui` or any `apps/web` React component. **Windows and Ubuntu render this same shell**,
  so they are consistent with each other but diverge from web and mobile.

The **shared foundations are good**: `packages/ui/src/tokens.ts` is a mature semantic token set
(color roles, text/border roles, spacing, radius, motion, z-index, icon sizes, plus a
purpose-built `trustState` distinguishing `secure` E2EE DMs from `hosted` relay groups). The
relay wire contract is dual-sourced and parity-tested (`crates/relay-protocol` +
`packages/protocol`). The product direction is unusually well-documented
([`docs/roadmap.md`](../roadmap.md), [`AGENTS.md`](../../AGENTS.md)).

### Desired polish bar

The benchmark is the *boring reliability and visual calm* of Signal and Telegram — **not** their
branding, growth model, or feature surface. Concretely: onboarding that completes in seconds,
message state that is never ambiguous, empty/loading/error states everywhere (never a blank
screen or raw spinner), media that uploads/downloads predictably with recoverable failures,
settings that feel complete, notifications the user trusts, and **the same product personality on
every surface**.

### The biggest gaps

1. **Desktop is a different product visually.** The static `index.html` shell can't reach
   parity with web/mobile while it stays a bespoke HTML file divorced from `packages/ui`. This is
   the **#1 cross-surface consistency risk**.
2. **No notification story on web/desktop.** Mobile has `expo-notifications` + a relay push queue;
   `apps/web` has no service worker / web-push (grep found none), and desktop has no native
   notification path. Notification trust is uneven.
3. **QA gates are thin for a "polished" claim.** `apps/relay` has 2 test files; `apps/web` has 2
   Playwright specs (`e2e/ci-new-user-flow.spec.ts`, `e2e/invite-continuation.spec.ts`);
   screenshots are *captured but never diffed* (gallery only, per
   [`docs/ci-screenshots.md`](../ci-screenshots.md)); no accessibility or performance gates exist;
   a11y attributes appear in only ~33 source files across web+mobile combined.
4. **Honest-encryption UX debt.** The repo itself notes legacy relay-hosted groups coexist with
   new device-encrypted groups (README "Current implementation reality"). The UI must make that
   distinction legible without overclaiming E2EE — the `trustState` token exists but adoption is
   incomplete.
5. **Structural drag slows polish on mobile.** The `App.tsx`/`styles.ts` monoliths make every
   visual change riskier than it should be (owned by the mobile-modularization plan).

---

## 2. Product Polish Principles

These should govern every surface and every PR in this program.

1. **Privacy honesty over privacy theater.** Never render a lock/"encrypted" affordance on a flow
   that is relay-hosted. Use the existing `trustState.secure` vs `trustState.hosted` tokens
   (`packages/ui/src/tokens.ts`) so encrypted and legacy/hosted flows are visually distinct.
   Soft-deterrence features (per `docs/roadmap.md`) must promise friction, not prevention.
2. **One product, many windows.** A participant's avatar color, a delivery tick, an empty-state
   card, and a trust badge must read the same on Android, web, and desktop. Divergence is a bug.
3. **Speed is a feature; perceived speed is the product.** Optimistic sends, instant local
   navigation, skeletons over spinners, and cached-first rendering. Never block the first
   meaningful paint on the relay.
4. **No dead ends.** Every list, screen, and async surface has an explicit empty, loading, and
   error state with one obvious recovery action. A raw spinner or blank panel is a defect.
5. **Message state is never ambiguous.** Pending → sent → delivered → read (and **failed →
   retry**) is always visible and always recoverable. Failures degrade to a recoverable row,
   never silently drop (already the rule in `docs/product/ui-patterns.md`).
6. **Accessibility is table stakes.** Keyboard-navigable web, screen-reader labels, 44px/48dp
   touch targets, visible focus, AA contrast, and full `prefers-reduced-motion` honoring (web
   already gates motion behind it; keep that discipline everywhere).
7. **Reliability is boring on purpose.** Reconnect quietly, retry with backoff
   (`apps/web/src/lib/backoff.ts` exists — generalize it), preserve cached state on failure, and
   never surprise the user with data loss.
8. **Calm copy.** Trust/security copy is short by default with progressive disclosure (the
   ui-patterns "short default, expandable learn-more" rule). Avoid scary, vague, or absolutist
   security language.
9. **Tokens before pixels.** New visual values go into `packages/ui/src/tokens.ts` first, then map
   into surface styles — never reintroduce raw hex/spacing at the surface (existing
   ui-patterns implementation note).
10. **Local-first truthfulness.** Offline and degraded states are first-class. Cached history is
    shown with honest "not yet synced" affordances rather than hidden.
11. **Respect the product boundary.** Polish must not smuggle back deprecated direction
    (public discovery, server-side private search, phone identity) — see `AGENTS.md`.
12. **Every perceptible change ships with proof.** Run the path's verify command and attach a
    screenshot or smoke result (the ui-surface-punch-list already established this as a norm).

---

## 3. Surface Inventory

| Surface | Repo path | Current maturity | User-facing risks | Polish gaps | What "done" looks like |
| --- | --- | --- | --- | --- | --- |
| **Web** | `apps/web` (Next.js App Router; public routes + `/app/*` workspace) | **High.** Chat polish suite shipped (`src/components/chat/*`), OLED/light/dark theme, skeletons, avatar colors. | Monolithic `app/app/settings/page.tsx`; no web-push/notifications (no service worker found); search UX shallow (`src/lib/message-search-index.ts` is joined-space only by design). | Notification permission + delivery; settings IA depth; accessibility audit; visual regression baseline. | Web feels like a first-class secondary client; a returning user can do onboarding→DM→group→settings→recovery without a rough edge; a11y + perf gates green. |
| **Android mobile** | `apps/mobile` (Expo, Android-first) | **High feel, high debt.** Native polish stack installed; rich component set; push via `expo-notifications`. | `App.tsx` (~2,985 lines) + `styles.ts` (~2,533 lines) monoliths make changes risky; keyboard/pan jank historically; FCM setup (`docs/android-fcm-setup.md`). | Finish android-polish-roadmap Phases 2–4 follow-through; modularize per `2026-04-09-mobile-modularization-plan.md`; notification trust polish. | Telegram/Signal-level motion verified on device; god components decomposed enough that a single screen can be changed in isolation; notifications reliable + preview-mode-respecting. |
| **Desktop — Windows** | `apps/desktop` (Tauri) renders `apps/desktop/shell/index.html` | **Low/bespoke.** Single 7,158-line static HTML shell; vendored crypto; dark-only; no `packages/ui`. | Visual + behavioral divergence from web/mobile; no shared components means fixes don't propagate; no native notifications; no auto-update (`docs/launch-targets.md` lists it deferred). | The whole shell is the gap — it cannot track web/mobile polish as a separate hand-rolled file. | Desktop renders the **same** design language as web (shared tokens/components or an embedded web workspace), with native window chrome, notifications, and tray behavior. |
| **Desktop — Ubuntu** | `apps/desktop` (same shell; `npm run ubuntu:ready` smoke lane) | **Low/bespoke (== Windows).** Same `index.html`; has a deterministic smoke lane (`docs/ubuntu-install-and-test.md`). | Same as Windows; plus Linux packaging (`.deb`/`.AppImage`) polish (icons, desktop entry, notifications via libnotify). | Same shared-shell gap; Linux-specific notification + tray + HiDPI polish. | Identical product feel to Windows desktop; clean install/run on the Ubuntu smoke lane with native notifications and crisp HiDPI. |
| **Deferred iPhone / macOS** | iPhone scaffold in `apps/mobile`; macOS in `apps/desktop` (`release-apple.yml`, `release-macos.yml`) | **Scaffolded / deferred.** Build lanes exist (simulator `.app`, `.dmg`) but neither is a first-beta commitment (`docs/launch-targets.md`, `docs/roadmap.md` Phase 4). | Risk is *overclaiming* readiness, not under-polish. | Out of scope for this program except: keep them honestly labeled "deferred" and avoid regressions in shared code. | Honestly documented as deferred; shared protocol/UI work doesn't bit-rot the scaffolds; **no** polish investment until first-wave surfaces are stable. |
| **Relay / backend** | `apps/relay` (Cloudflare Worker; `handlers/*`, `do/{device-mailbox,group-coordinator,rate-limit}.ts`) | **Active, thin tests.** Functional control plane; push queue plumbing across handlers + `queue.ts`. | Only 2 test files; reliability hardening tracked in `relay-hardening-and-relay-first-migration.md`. | Error-shape consistency for clients; push delivery reliability; rate-limit UX surfacing; retry/ack semantics clarity. | Predictable, typed error envelopes clients can render; reliable push fan-out; reconnection/ack behavior that clients can build calm UX on. |
| **Shared protocol / core** | `packages/protocol` (TS mirror) + `crates/relay-protocol` (canonical Rust) + `crates/core` (Rust local-first, `src/lib.rs` ~450 lines) | **Active, parity-tested.** Parity fixtures keep TS/Rust in lockstep. | Any payload change must land on both sides or break parity tests. | Surface client-facing fields needed for honest message-state and trust UX (e.g., delivery/read, hosted-vs-encrypted markers) without leaking private content. | Protocol exposes exactly the state clients need for unambiguous delivery/trust UX; parity tests green on both sides. |

---

## 4. Cross-Surface Parity Matrix

Status legend: **Complete** · **Partial** · **Scaffolded** · **Missing** · **Deferred** ·
**Unknown / needs inspection**. Cells reflect best evidence from this inspection; "Unknown" means
verify on-device/in-app before building.

| Capability | Web (`apps/web`) | Android (`apps/mobile`) | Desktop Win/Ubuntu (`apps/desktop/shell`) | Evidence path |
| --- | --- | --- | --- | --- |
| Onboarding | Complete | Complete | Partial | `apps/web/src/app/start`, `.../register`; `apps/mobile/src/screens/OnboardingScreen.tsx`; `apps/desktop/shell/index.html` |
| Invite acceptance | Complete | Complete | Partial | `apps/web/src/app/invite/[[...segments]]`, `src/components/invite-explorer.tsx`; `apps/mobile/src/lib/inviteApi.ts`; relay `handlers/contacts.ts` |
| Magic-link auth | Complete | Complete | Partial | `apps/web/src/app/auth/complete`, `src/components/bootstrap-auth-form.tsx`; `apps/mobile/src/lib/authApi.ts`; relay `handlers/auth.ts` |
| Adults-only (18+) affirmation | Complete | Complete | Unknown / needs inspection | ui-surface-punch-list (shipped); `apps/web/src/app/start`; `apps/mobile/src/screens/OnboardingScreen.tsx` |
| Session / device management | Partial | Partial | Partial | `apps/web/src/app/app/settings/page.tsx`, `src/components/device-link-panel.tsx`; `apps/mobile/src/lib/deviceLinkApi.ts`; relay `handlers/devices.ts` |
| Direct messages | Complete | Complete | Partial | `apps/web/src/app/app/chat/[id]`, `src/components/chat/*`; `apps/mobile/src/screens/ConversationScreen.tsx`; relay `do/device-mailbox.ts` |
| Small groups (≤12) | Partial | Partial | Partial | `apps/web/src/app/app/new-group`; relay `do/group-coordinator.ts`; legacy-vs-device-encrypted split (README) |
| Attachment upload/download | Partial | Partial | Partial | `apps/mobile/src/lib/attachmentManager.ts`; relay `handlers/attachments.ts` (signed R2 tickets); web chat attachment chips |
| Search | Partial | Partial | Unknown / needs inspection | `apps/web/src/app/app/search`, `src/lib/message-search-index.ts`; joined-space-only by design |
| Settings / privacy controls | Partial | Partial | Partial | `apps/web/src/app/app/settings/page.tsx` (monolithic); `apps/mobile/src/screens/SettingsScreen.tsx` |
| Blocking / reporting | Partial | Partial | Unknown / needs inspection | relay `handlers/reports.ts`; `docs/operator-playbook.md` (disclosure-based) |
| Notifications / push | Missing | Partial | Missing | `apps/mobile/src/lib/{push,pushService}.ts`, `features/notifications/useNotificationBridge.ts`, relay `handlers/queue.ts`; **no web SW / no desktop native notif found** |
| Offline / local state | Partial | Partial | Unknown / needs inspection | `apps/mobile/src/lib/db.ts` (SQLite), `crates/core/src/lib.rs`; web `src/lib/store.ts` |
| Error recovery | Partial | Partial | Partial | `apps/web/src/lib/backoff.ts`, `src/components/companion-route-boundary.tsx`; ui-patterns "retry preserves cached data" |
| Empty states | Partial | Partial | Unknown / needs inspection | ui-patterns "Empty state" rules; `apps/web/src/components/chat/skeletons.tsx`; ChatListScreen empty-state CTA |
| Loading states | Complete (web) | Partial | Partial | `apps/web/src/components/chat/skeletons.tsx`; `apps/mobile/src/components/Shimmer.tsx` |
| Accessibility | Partial | Partial | Missing | ~33 files total across web+mobile use aria/accessibilityLabel/role; no a11y gate in CI |
| Keyboard / touch behavior | Partial | Partial | Partial | mobile `react-native-keyboard-controller` installed; web keyboard nav unaudited; desktop shell raw HTML |
| Screenshot / regression coverage | Partial (captured, not diffed) | Partial (emulator) | Partial (static-HTML screenshot only) | `.github/workflows/ci-web.yml` screenshots job, `ci-mobile.yml`, `publish-screenshots.yml`, `docs/ci-screenshots.md` |

**Highest-signal reads from the matrix:** notifications and accessibility are the weakest rows
cross-surface; desktop is "Partial/Missing/Unknown" on almost everything because it cannot inherit
web/mobile work; screenshot coverage exists but provides **no regression protection** (no diffing).

---

## 5. UX Polish Workstreams

Each workstream lists current likely state, target experience, concrete tasks, affected paths,
dependencies, verification, risks, and suggested owner role (owner roles map to `repo-map.yaml`
owners: `web-companion`, `mobile-client`, `desktop-shell`, `relay-runtime`, `protocol-*`,
`rust-core`, `developer-experience`, `release-engineering`).

### 5.1 Onboarding and invite flow
- **Current:** Web + mobile shipped staged onboarding (18+ affirmation, invite preview/reveal,
  profile handoff) per ui-surface-punch-list. Desktop shell version unverified.
- **Desired:** Sub-30-second invite→first-message on every surface; the 18+ and invite steps feel
  deliberate but fast; desktop matches.
- **Tasks:** audit time-to-first-message on each surface; align desktop onboarding copy/states to
  web; add resilient error states for expired/invalid invites and magic links.
- **Paths:** `apps/web/src/app/{start,register,auth/complete,invite}`,
  `apps/mobile/src/screens/{OnboardingScreen,ProfileSetupScreen}.tsx`, `apps/desktop/shell/index.html`,
  relay `handlers/auth.ts`.
- **Dependencies:** none blocking; desktop work blocked on §6.x shared-shell decision for full parity.
- **Verification:** `npm run build --workspace=apps/web`; `npm run verify --workspace=apps/mobile`;
  manual invite→onboard on each surface; Playwright `invite-continuation.spec.ts` extended.
- **Risks:** Low. **Owner:** web-companion + mobile-client.

### 5.2 Chat list and conversation layout
- **Current:** Web complete (grouped runs, avatar gutter, date pills). Mobile largely complete.
  Desktop unknown/bespoke.
- **Desired:** Identical conversation-row grammar (avatar, unread, preview truncation, pin/mute/
  archive modifiers) per ui-patterns "Chat row".
- **Tasks:** lift the `packages/ui` `ConversationRow` into the canonical row; reconcile web
  `chat-rail.tsx` and mobile `ChatListScreen.tsx` against it; bring desktop list to parity.
- **Paths:** `packages/ui/src/components/messaging/ConversationRow.tsx`,
  `apps/web/src/components/chat-rail.tsx`, `apps/mobile/src/screens/ChatListScreen.tsx`,
  `apps/desktop/shell/index.html`.
- **Dependencies:** §6 token/component propagation.
- **Verification:** web build/lint; mobile type-check; screenshot compare.
- **Risks:** Medium (desktop). **Owner:** web-companion / mobile-client / desktop-shell.

### 5.3 Composer, sending, retry, and delivery states
- **Current:** Web has animated send + reply/edit banners; mobile has composer + attach sheets.
  Failed→retry path needs an explicit audit on all surfaces.
- **Desired:** Optimistic send everywhere; a failed message stays as a recoverable row with an
  obvious **Retry**; delivery label (pending/sent/delivered/read) always present.
- **Tasks:** define one delivery-state state machine in shared code; ensure failed sends never
  drop; wire retry on web/mobile/desktop; surface relay ack/queue errors as typed states.
- **Paths:** `apps/web/src/components/chat/message-row.tsx`, mobile `ConversationScreen.tsx` +
  `MessageBubble.tsx`, relay `handlers/messages.ts` + `do/device-mailbox.ts`, `packages/protocol`.
- **Dependencies:** §5 needs relay error-shape work (5.13) and possibly a protocol field (parity).
- **Verification:** protocol parity (`npm test --workspace=packages/protocol` + `cargo test -p
  emberchamber-relay-protocol`); relay tests; manual airplane-mode send/retry.
- **Risks:** Medium-High (touches protocol + DO). **Owner:** mobile-client + relay-runtime + protocol-typescript.

### 5.4 Message bubbles, timestamps, receipts, attachments
- **Current:** Web + mobile bubbles polished; attachment chip treatment aligned per ui-patterns.
- **Desired:** Consistent bottom-right time+ticks, grouping, tails; attachments share one visual
  treatment for encrypted vs hosted unless action differs.
- **Tasks:** consolidate `packages/ui` `MessageBubble` as the reference; reconcile attachment
  states (uploading/failed/retry/downloaded) into one component contract; desktop parity.
- **Paths:** `packages/ui/src/components/messaging/MessageBubble.tsx`, web/mobile bubble files,
  `apps/mobile/src/lib/attachmentManager.ts`, relay `handlers/attachments.ts`.
- **Dependencies:** §5.3 delivery states.
- **Verification:** per-surface build/type-check; screenshot compare; manual attachment matrix.
- **Risks:** Medium. **Owner:** web-companion / mobile-client.

### 5.5 Empty, loading, skeleton, and error states
- **Current:** Web skeletons shipped; mobile `Shimmer.tsx`. Coverage is **incomplete** (not every
  list/route has all three states).
- **Desired:** Every async surface on every client has explicit empty/loading/error with one
  recovery action. No raw spinner; no blank panel.
- **Tasks:** inventory every list/route per surface; add missing states using shared conventions;
  codify conventions in §6.
- **Paths:** all client surfaces; `apps/web/src/components/chat/skeletons.tsx`,
  `apps/web/src/components/companion-route-boundary.tsx`, `apps/mobile/src/components/Shimmer.tsx`.
- **Dependencies:** §6 conventions doc.
- **Verification:** manual route sweep; screenshot baselines for each state.
- **Risks:** Low. **Owner:** web-companion / mobile-client / desktop-shell.

### 5.6 Search and navigation
- **Current:** Web `app/search` + `src/lib/message-search-index.ts` (joined-space only by product
  rule). Mobile/desktop unknown depth.
- **Desired:** Fast, scoped, forgiving search with clear "searches only spaces you've joined"
  framing (honest, per roadmap); good empty/no-results states; keyboard navigable.
- **Tasks:** audit search latency + empty/no-result states; ensure scope copy is explicit; add
  keyboard nav on web; verify mobile/desktop have a search entry.
- **Paths:** `apps/web/src/app/app/search`, `apps/web/src/lib/message-search-index.ts`,
  `apps/mobile/src/screens/*`, `apps/desktop/shell/index.html`.
- **Dependencies:** none.
- **Verification:** web build; manual search with 0/1/many results; a11y keyboard pass.
- **Risks:** Low-Medium. **Owner:** web-companion / mobile-client.

### 5.7 Settings, privacy, session, and device management
- **Current:** Web settings is one monolithic `page.tsx`; mobile `SettingsScreen.tsx` with debug
  behind a disclosure. Device linking exists on both.
- **Desired:** A "complete-feeling" settings IA: account, identity, privacy/media defaults,
  notifications, sessions/devices, recovery, trust-and-safety — consistent grouping cross-surface.
- **Tasks:** decompose web settings into sections; align mobile sections; expose session list +
  revoke and device link/unlink clearly; surface privacy controls (`notificationPreviewMode`,
  `secureAppSwitcher`, `allowSensitiveExport`) from `docs/roadmap.md`.
- **Paths:** `apps/web/src/app/app/settings/page.tsx`, `apps/web/src/components/{device-link-panel,recovery-panel}.tsx`,
  `apps/mobile/src/screens/SettingsScreen.tsx`, relay `handlers/{devices,me}.ts`.
- **Dependencies:** §8 trust copy; relay session/device endpoints.
- **Verification:** web build/lint; mobile type-check; manual revoke/link round-trip.
- **Risks:** Medium. **Owner:** web-companion + mobile-client + relay-runtime.

### 5.8 Trust and safety flows
- **Current:** Relay `handlers/reports.ts` (disclosure-based); `docs/operator-playbook.md`
  governs language. Client surfacing of block/report is partial/unknown.
- **Desired:** Honest, calm block/report flows; clear "what reporting does / doesn't do" (no
  routine content review per roadmap); recovery limitations stated plainly.
- **Tasks:** ensure block/report is reachable from conversation + member surfaces on each client;
  align copy with operator-playbook; add confirmation + outcome states.
- **Paths:** relay `handlers/reports.ts`, mobile `MemberProfileSheet.tsx`/`MemberRosterModal.tsx`,
  web member/menu components, `apps/web/src/app/trust-and-safety`.
- **Dependencies:** §8.
- **Verification:** relay tests; manual report→outcome; copy review against operator-playbook.
- **Risks:** Medium (copy correctness). **Owner:** relay-runtime + web-companion + docs-contract.

### 5.9 Notifications and background behavior
- **Current:** Mobile has `expo-notifications` + relay push queue. **Web has no web-push/service
  worker; desktop has no native notifications** (both Missing).
- **Desired:** Trustworthy notifications on every surface honoring `notificationPreviewMode`
  (no content leak in previews when set); quiet, accurate, no duplicates; clear permission UX.
- **Tasks:** web: add service worker + Web Push (VAPID) + permission UX + preview-mode respect;
  desktop: Tauri native notifications + tray; mobile: polish reliability, dedupe, preview modes;
  relay: ensure push payloads carry only preview-safe metadata.
- **Paths:** `apps/web` (new SW + push lib), `apps/desktop/src-tauri/src/lib.rs`,
  `apps/mobile/src/lib/{push,pushService}.ts`, relay `handlers/queue.ts` + push queue.
- **Dependencies:** relay push payload shaping; §8 preview-mode semantics.
- **Verification:** manual notify on each surface with preview on/off; relay queue tests; foreground/background/locked.
- **Risks:** High (new web/desktop surfaces, privacy-sensitive). **Owner:** web-companion + desktop-shell + relay-runtime.

### 5.10 Accessibility and keyboard/touch polish
- **Current:** Thin — a11y attributes in ~33 files total; no a11y gate; desktop shell raw HTML.
- **Desired:** Keyboard-navigable web (focus order, visible focus, ARIA), screen-reader labels,
  44px/48dp targets, AA contrast, reduced-motion honored everywhere.
- **Tasks:** add `@axe-core/playwright` checks to web CI; audit focus order + labels; add
  `accessibilityLabel`/roles on mobile interactive elements; touch-target audit; desktop shell a11y.
- **Paths:** `apps/web/src/**`, `.github/workflows/ci-web.yml` (add axe step), `apps/mobile/src/**`,
  `apps/desktop/shell/index.html`.
- **Dependencies:** §9 QA gates.
- **Verification:** axe in CI; manual keyboard-only pass; VoiceOver/TalkBack spot check.
- **Risks:** Medium. **Owner:** web-companion + mobile-client + developer-experience.

### 5.11 Visual design system and design tokens
- **Current:** `packages/ui/src/tokens.ts` mature but **dark-only canonically**; web layered
  light/dark/OLED on top; desktop duplicates token values inline; mobile re-maps in `styles.ts`.
- **Desired:** One canonical token source consumed by all surfaces, including a canonical light
  theme, with desktop no longer holding a private copy.
- **Tasks:** add light-theme roles to canonical tokens; generate CSS-variable + Tailwind exports;
  make desktop shell import generated tokens instead of inlining; reduce mobile `styles.ts` raw values.
- **Paths:** `packages/ui/src/tokens.ts`, `packages/ui/src/index.ts`, `apps/desktop/shell/index.html`,
  `apps/mobile/src/styles.ts`, web Tailwind config.
- **Dependencies:** §6.
- **Verification:** `npm run build --workspace=packages/ui` then dependent builds; visual diff.
- **Risks:** Medium. **Owner:** protocol-typescript (ui owner) + all client owners.

### 5.12 Motion, transitions, micro-interactions
- **Current:** Mobile has `motion.ts` + reanimated; web has CSS keyframes gated on reduced-motion.
  Desktop minimal.
- **Desired:** Shared motion vocabulary (durations/easings already in tokens); consistent
  press/enter/exit feel; always reduced-motion-safe.
- **Tasks:** ensure every surface pulls durations/easings from `animation`/`motionRoles` tokens;
  add tasteful desktop transitions; audit reduced-motion coverage.
- **Paths:** `packages/ui/src/tokens.ts` (`animation`,`motionRoles`), web `globals.css`,
  `apps/mobile/src/lib/motion.ts`, `apps/desktop/shell/index.html`.
- **Dependencies:** §5.11.
- **Risks:** Low. **Owner:** all client owners.

### 5.13 Performance and perceived speed
- **Current:** Web list capped at 80 messages (per web roadmap); mobile uses FlashList. Relay
  reliability tracked separately. No perf gate.
- **Desired:** Fast first paint, smooth scroll on large threads, no jank on keyboard/scroll;
  predictable reconnect/backoff.
- **Tasks:** add a lightweight Lighthouse/web-vitals check for key web routes; verify mobile
  FlashList recycling on long threads; generalize `apps/web/src/lib/backoff.ts` reconnect pattern;
  audit relay error envelopes for client-friendly retry.
- **Paths:** `apps/web/src/lib/{backoff,store,relay}.ts`, `.github/workflows/ci-web.yml`,
  mobile list screens, relay `handlers/*` + `do/*`.
- **Dependencies:** §9.
- **Risks:** Medium. **Owner:** web-companion + mobile-client + relay-runtime.

### 5.14 Screenshot, QA, and release verification
- **Current:** Screenshots captured (`ci-web.yml`, `ci-mobile.yml`) and published to a gallery,
  **but never diffed**; release lanes per surface exist.
- **Desired:** Visual-regression baselines that fail PRs on unexpected UI change; a release
  checklist gating "polished" claims.
- **Tasks:** introduce Playwright visual baselines for web + desktop shell; define release
  checklist (§9); wire a11y + perf checks into CI.
- **Paths:** `.github/workflows/{ci-web,ci-mobile,publish-screenshots}.yml`, `apps/web/e2e/*`,
  `apps/web/playwright.config.*` (new), `docs/ci-screenshots.md`.
- **Dependencies:** §9.
- **Risks:** Medium (baseline flakiness). **Owner:** developer-experience + release-engineering.

---

## 6. Design System Plan

The foundation already exists in `packages/ui/src/tokens.ts` and is **mature**; the work is
**propagation + completion**, not invention. Recommended home for each concern:

| Concern | Current reality | Recommendation / home |
| --- | --- | --- |
| **Typography scale** | `typography.fontSize` xs→7xl + display(Cormorant Garamond)/sans(Inter)/mono(JetBrains Mono) families in `tokens.ts`. | Keep canonical in `tokens.ts`; document semantic roles (title/body/meta/caption) and which size maps to each per surface. |
| **Spacing scale** | `spacing` 0→32 (rem) in `tokens.ts`. | Canonical; forbid raw px/rem at surfaces (lint guidance). |
| **Color tokens** | `colors` + `colorRoles` (ember/obsidian/glass/semantic) in `tokens.ts`. | Canonical; **add light-theme role set** (see below). |
| **Dark/light theme** | **Dark-only canonical**; web added light/dark/system + OLED on top; desktop hardcodes `color-scheme: dark`. | Add a canonical light theme as a parallel `colorRoles` map; export both as CSS variables so web + desktop share one theme switch. |
| **Semantic colors** | `error/warning/success/info` + roles present. | Canonical; ensure each has bg/border/text triplet (already true). |
| **Component states** | Components exist (`Button`, `Chip`, `StatusCallout`, `MessageBubble`, `ConversationRow`, etc.) but state coverage (hover/active/disabled/focus/loading/error) is uneven and web/mobile/desktop don't all consume them. | Define a required state set per interactive component; make `packages/ui` the single source; have web consume directly and mobile/desktop mirror behavior. |
| **Touch-target rules** | No codified rule; mobile thin a11y. | Codify min 44px (web/desktop pointer-coarse) / 48dp (Android) as a token-backed rule + lint/test. |
| **Desktop density** | Bespoke `index.html` inline CSS. | Define a comfortable desktop density (wider gutters, hover affordances) in shared tokens once desktop consumes them. |
| **Mobile density** | Mapped in `styles.ts` (2,533 lines). | Define compact-but-calm spacing; reduce raw values in `styles.ts` toward tokens. |
| **Icon rules** | `iconSizes` sm/md/lg/xl in `tokens.ts`. | Canonical; standardize one icon set + sizing per surface. |
| **Motion rules** | `animation` + `motionRoles` (durations/easings incl. spring) in `tokens.ts`. | Canonical; every surface must pull from these and gate on reduced-motion. |
| **Error/loading/empty conventions** | Partly in `docs/product/ui-patterns.md`; web skeletons/mobile Shimmer exist. | Write a single "Async State Conventions" section (empty/loading/error patterns + copy tone) in `ui-patterns.md` and back it with shared components. |

**Net recommendation:** elevate `packages/ui` from "tokens + some primitives web/mobile partly use"
to **the enforced cross-surface source of truth**, add a canonical light theme, generate CSS-var +
Tailwind exports, and **make the desktop shell consume generated tokens instead of its private
inline copy** (the prerequisite for desktop ever reaching parity).

---

## 7. Messaging UX Detail Plan

Target behaviors, per element, benchmarked against Signal/Telegram reliability (not their look).
Evidence anchors are the real components found in this repo.

- **Chat list** — Avatar + title + last-message preview (truncate before crowding metadata) +
  relative time + unread badge; pin/mute/archive as modifiers on one base row. Reconcile
  `apps/web/src/components/chat-rail.tsx`, `apps/mobile/src/screens/ChatListScreen.tsx`, and
  `packages/ui/.../ConversationRow.tsx`; bring desktop to the same row grammar.
- **Conversation header** — Identity + privacy/trust mode + member affordances grouped;
  hosted-vs-encrypted shown as a supporting label, not a separate layout (ui-patterns rule).
- **Message grouping** — Consecutive same-sender within ~5 min collapse meta and tighten spacing
  (web `message-row.tsx` already does this; mirror on mobile/desktop).
- **Timestamps** — Bottom-right inline with delivery ticks; floating sticky date pill between days.
- **Sender identity** — Deterministic color-from-name (web `src/lib/avatar-color.ts` ==
  mobile `src/lib/avatarColor.ts`); avatar gutter on group/room, last-in-group only.
- **Pending / sent / failed states** — One shared state machine; never ambiguous; failed renders
  a recoverable row.
- **Retry behavior** — Explicit Retry on failed messages; preserve composer/cached content; never
  silently drop (ui-patterns: "attachment failures degrade to recoverable status").
- **Attachment states** — uploading → sent → (failed → retry) → downloaded; encrypted and
  relay-hosted share treatment unless action differs; signed-ticket flow via relay
  `handlers/attachments.ts` + R2.
- **Keyboard behavior** — Mobile: finger-tracked avoidance via `react-native-keyboard-controller`
  (installed); re-evaluate `softwareKeyboardLayoutMode`. Web/desktop: Enter-to-send, Shift+Enter
  newline, Esc cancels edit/reply, full focus management.
- **Scroll anchoring** — Stay pinned to bottom on new messages when at bottom; preserve position
  when scrolled up; jump-to-bottom FAB with unread count (web `jump-to-bottom.tsx` shipped; mirror).
- **Unread indicators** — Unread divider line + count; clear on read; reflect in chat list badge.
- **Group member state** — Roster, join/leave, member profile (mobile `MemberRosterModal.tsx`,
  `MemberProfileSheet.tsx`); show member-cap (≤12) honestly.
- **Invite / member changes** — System rows for joins/leaves/invite events, visually distinct from
  messages; calm, non-alarming.
- **Deleted / unavailable content** — Tombstone row ("message deleted" / "not available on this
  device") rather than a gap; honest about local-first history limits.
- **Offline behavior** — Show cached history with a quiet "not synced yet" affordance; queue
  outgoing; reconcile on reconnect (mobile `src/lib/db.ts`, `crates/core`).
- **First-message / empty conversation** — Friendly empty conversation state explaining the
  encrypted/hosted nature honestly + one prompt to send (ui-patterns "Empty state": no marketing
  copy in signed-in empties).

---

## 8. Trust, Privacy, and Safety Polish

The product's credibility depends on **honesty**, not maximalist claims. The repo already encodes
the right primitive — `trustState.secure` (E2EE DMs) vs `trustState.hosted` (relay groups) in
`packages/ui/src/tokens.ts` — but it is under-adopted.

- **Do not overclaim E2EE.** README's "Current implementation reality" states new device-encrypted
  groups keep bodies/keys off the relay while **legacy relay-hosted groups still exist until
  migrated**. UI must not show a "lock"/"encrypted" affordance on a hosted flow. Drive every
  surface's trust badge off `trustState`.
- **Make relay limits understandable.** A short, calm explainer of what the relay stores
  (ciphertext envelopes, key bundles, account/session metadata, hosted-group history pending
  migration) vs. does not (decrypted history, private search indexes), sourced from README's
  relay model — surfaced as progressive disclosure, not a wall of text.
- **Make device/session state understandable.** Sessions/devices list with plain-language status
  and a clear revoke/unlink path (2-device support per README); honest about what revocation does.
- **Make reporting/blocking honest.** Reflect `docs/operator-playbook.md`: disclosure-based
  reporting, invite/session revocation, **no routine content review**. Don't imply moderation that
  doesn't happen.
- **Make recovery limitations clear.** README states recovery after total device loss "still needs
  a fuller trusted-device flow." Recovery UX must state limits plainly, not promise magic restore.
- **Avoid scary or vague security copy.** Short default copy; calm tone; progressive disclosure
  (ui-patterns). No absolutist words ("unbreakable", "anonymous", "uncensorable" — explicitly
  off-direction per `AGENTS.md`).
- **Distinguish encrypted/new from legacy/migrated flows.** Wherever device-encrypted and
  relay-hosted coexist (groups especially), the difference must be legible and consistent across
  surfaces via `trustState` — including during/after migration.
- **Soft-deterrence honesty.** `notificationPreviewMode`, `secureAppSwitcher`,
  `allowSensitiveExport` (roadmap) promise *friction*, not prevention. Copy must never imply
  screenshot/export is blocked.

---

## 9. Reliability and QA Gates

These gates define "polished." Commands below are the **actual** repo commands where they exist;
items marked *(new)* must be added.

| Gate | Command / mechanism | Status |
| --- | --- | --- |
| Protocol parity (TS) | `npm test --workspace=packages/protocol` | Exists |
| Protocol parity (Rust) | `cargo test -p emberchamber-relay-protocol` | Exists |
| Shared core tests | `cargo test -p emberchamber-core -p emberchamber-relay-protocol` | Exists |
| Relay unit tests | `npm test --workspace=apps/relay` | Exists (thin — only 2 files; expand) |
| Web build/lint/type-check | `npm run lint --workspace=apps/web`; `npm run build --workspace=apps/web`; `npm run type-check` | Exists |
| Web E2E (Playwright) | `npm run e2e --workspace=apps/web` (specs: `e2e/ci-new-user-flow.spec.ts`, `e2e/invite-continuation.spec.ts`) | Exists (expand coverage) |
| Mobile verify | `npm run verify --workspace=apps/mobile` (expo-doctor + type-check); `npm run verify:android` | Exists |
| Desktop shell check | `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml` | Exists |
| Desktop/Ubuntu smoke | `npm run ubuntu:ready` (detached `screen` `ember-relay`); `docs/ubuntu-install-and-test.md` | Exists |
| Repo-contract check | `npm run check:repo-contracts` | Exists |
| Audit gate | `npm run audit:high` (`--audit-level=high --omit=dev`) | Exists |
| Full active sweep | `npm run verify:all` | Exists |
| **Visual regression baselines** | Playwright `toHaveScreenshot` baselines for web routes + desktop shell *(new — currently screenshots are captured but never diffed, per `docs/ci-screenshots.md`)* | **Missing** |
| **Accessibility checks** | `@axe-core/playwright` step in `ci-web.yml` *(new)* | **Missing** |
| **Performance checks** | Lighthouse-CI / web-vitals budget on key web routes *(new)* | **Missing** |
| **Release checklist** | Per-surface "polished release" checklist doc *(new)* | **Missing** |

**Proposed release checklist (gate before claiming a surface "polished"):**
1. Path-relevant verify command(s) green.
2. Visual baselines updated + reviewed (no unintended diffs).
3. a11y (axe) clean on changed routes; keyboard-only pass.
4. Empty/loading/error states present for every async surface touched.
5. Delivery/retry states verified manually (incl. offline).
6. Notification behavior verified with preview-mode on/off (where applicable).
7. Trust copy reviewed against `docs/operator-playbook.md` and §8.
8. Screenshot attached for every perceptible change (existing repo norm).

---

## 10. Prioritized Roadmap

Sizing: **S** (<1 day) · **M** (1–3 days) · **L** (3–7 days) · **XL** (>1 week or multi-surface).
"AI-safe?" = can an AI agent implement without a human in the loop.

### P0 — Stop Embarrassing Gaps

**P0-1 — Desktop trust/parity audit + token un-fork (start).**
*Why:* desktop renders a bespoke 7,158-line `index.html` that visually diverges from web/mobile —
the most visible "unfinished" signal. *Paths:* `apps/desktop/shell/index.html`,
`packages/ui/src/tokens.ts`. *Notes:* generate CSS-variable token export and replace desktop's
inline `:root` copy with it; do **not** yet rewrite the shell. *Validation:* `cargo check
--manifest-path apps/desktop/src-tauri/Cargo.toml`; desktop-shell screenshot diff. *Deps:* §6 token
export. *Size:* M. *Risk:* Medium. *AI-safe:* Yes (mechanical token mapping).

**P0-2 — Failed-send never drops; explicit retry everywhere.**
*Why:* silent message loss is the single most trust-destroying defect for a messenger. *Paths:*
`apps/web/src/components/chat/message-row.tsx`, mobile `ConversationScreen.tsx`/`MessageBubble.tsx`,
relay `handlers/messages.ts`. *Validation:* manual airplane-mode send/retry on web+mobile; relay
tests. *Deps:* none for UI; protocol field only if state isn't already exposed. *Size:* M. *Risk:*
Medium. *AI-safe:* Needs review (touches send pipeline).

**P0-3 — Honest trust badges (no E2EE overclaim on hosted flows).**
*Why:* showing "encrypted" on relay-hosted groups is a privacy-credibility and arguably legal
risk. *Paths:* conversation headers on all surfaces; `packages/ui/src/tokens.ts` `trustState`.
*Validation:* manual: hosted group vs device-encrypted DM render distinct badges; copy review vs §8.
*Deps:* surface to read hosted-vs-encrypted from existing data. *Size:* M. *Risk:* Medium (copy
correctness). *AI-safe:* Human review required (privacy copy).

**P0-4 — No dead ends: empty/loading/error sweep on signed-in routes.**
*Why:* blank panels and raw spinners read as broken. *Paths:* all client surfaces; reuse
`apps/web/src/components/chat/skeletons.tsx`, `apps/mobile/src/components/Shimmer.tsx`. *Validation:*
route sweep + screenshots. *Deps:* §6 conventions. *Size:* L. *Risk:* Low. *AI-safe:* Yes.

**P0-5 — Visual-regression baselines (turn captured screenshots into a gate).**
*Why:* polish regresses silently today — screenshots are captured but never compared. *Paths:*
`apps/web/e2e/*`, `apps/web/playwright.config.*` (new), `.github/workflows/ci-web.yml`. *Validation:*
intentional UI change fails the diff; baseline review flow works. *Deps:* none. *Size:* M. *Risk:*
Medium (flakiness). *AI-safe:* Yes.

### P1 — Messaging App Polish Baseline

**P1-1 — Web + desktop notifications (web-push SW; Tauri native).**
*Why:* a messenger without notifications isn't a messenger on web/desktop. *Paths:* `apps/web`
(new SW + push), `apps/desktop/src-tauri/src/lib.rs`, relay `handlers/queue.ts`. *Validation:*
manual notify with preview on/off; foreground/background/locked. *Deps:* relay preview-safe
payloads; §8. *Size:* XL. *Risk:* High. *AI-safe:* Human review required (privacy-sensitive).

**P1-2 — Settings IA completeness (decompose web settings; align mobile).**
*Why:* "complete-feeling" settings are a maturity signal. *Paths:*
`apps/web/src/app/app/settings/page.tsx`, `apps/mobile/src/screens/SettingsScreen.tsx`, relay
`handlers/{devices,me}.ts`. *Validation:* web build/lint; revoke/link round-trip. *Deps:* §8.
*Size:* L. *Risk:* Medium. *AI-safe:* Yes (UI), Needs review (session/device endpoints).

**P1-3 — Accessibility gate + first remediation pass.**
*Why:* a11y is table stakes and currently near-absent (~33 files). *Paths:* `.github/workflows/ci-web.yml`
(axe), `apps/web/src/**`, `apps/mobile/src/**`. *Validation:* axe clean on key routes; keyboard pass.
*Deps:* §9. *Size:* L. *Risk:* Medium. *AI-safe:* Yes.

**P1-4 — Delivery-state state machine unified in shared code.**
*Why:* ambiguous ticks across surfaces erode trust. *Paths:* `packages/protocol`,
`packages/ui/.../MessageBubble.tsx`, web/mobile bubbles. *Validation:* protocol parity (both sides);
visual compare. *Deps:* P0-2. *Size:* L. *Risk:* Medium-High (protocol). *AI-safe:* Needs review.

**P1-5 — Attachment state matrix (uploading/failed/retry/downloaded) consistent.**
*Why:* media reliability is core to the ICP (media-sharing groups, per roadmap). *Paths:*
`apps/mobile/src/lib/attachmentManager.ts`, relay `handlers/attachments.ts`, web/mobile chat.
*Validation:* attachment matrix manual run; relay tests. *Deps:* P1-4. *Size:* L. *Risk:* Medium.
*AI-safe:* Needs review.

### P2 — Cross-Surface Maturity

**P2-1 — Desktop shell to true parity (shared tokens/components or embedded web workspace).**
*Why:* desktop can't track web/mobile polish as a bespoke HTML file. *Paths:* `apps/desktop/shell/`,
`apps/desktop/src-tauri/`, `packages/ui`. *Notes:* decision needed — (a) embed the `apps/web`
workspace in Tauri, or (b) rebuild the shell on shared components. Recommend evaluating (a) first
(maximizes reuse). *Validation:* desktop screenshot parity vs web; Ubuntu smoke (`npm run
ubuntu:ready`). *Deps:* P0-1, §6. *Size:* XL. *Risk:* High. *AI-safe:* Human review required
(architecture decision).

**P2-2 — Canonical light theme + token propagation across all surfaces.**
*Why:* one theme switch, one personality. *Paths:* `packages/ui/src/tokens.ts`,
`apps/desktop/shell/index.html`, `apps/mobile/src/styles.ts`, web Tailwind. *Validation:* build all;
visual diff light/dark/OLED. *Deps:* P0-1. *Size:* L. *Risk:* Medium. *AI-safe:* Yes.

**P2-3 — Mobile god-component decomposition (enabling, per `2026-04-09-mobile-modularization-plan.md`).**
*Why:* `App.tsx` (~2,985 lines) makes every mobile polish change risky. *Paths:* `apps/mobile/App.tsx`,
`apps/mobile/src/styles.ts`. *Validation:* `npm run verify --workspace=apps/mobile`; on-device smoke.
*Deps:* follow the existing modularization plan. *Size:* XL. *Risk:* Medium. *AI-safe:* Needs review.

**P2-4 — Conversation-row + bubble unification through `packages/ui`.**
*Why:* the same metaphors must read identically. *Paths:*
`packages/ui/src/components/messaging/{ConversationRow,MessageBubble}.tsx`, web/mobile/desktop.
*Validation:* per-surface build; screenshot compare. *Deps:* P2-2. *Size:* L. *Risk:* Medium.
*AI-safe:* Yes.

### P3 — Delight and Differentiation

**P3-1 — Shared motion vocabulary + tasteful desktop transitions** (S/M, Low, AI-safe: Yes) —
pull all surfaces from `animation`/`motionRoles` tokens; reduced-motion safe.

**P3-2 — "Trusted circles" visual signature motif** across onboarding/thread-entry/invite moments
(M, Low, AI-safe: Needs review — brand-sensitive).

**P3-3 — Perceived-speed micro-polish:** optimistic everything, prefetch on hover/focus, skeleton
timing tuning (M, Low, AI-safe: Yes).

**P3-4 — Presence / quiet-state metadata** where appropriate without reintroducing discovery
(M, Medium, AI-safe: Needs review — must respect privacy boundary).

---

## 11. Agent-Ready Task Backlog

Concrete, pick-up-one-at-a-time tasks. Each is scoped so a single agent can complete and verify it.
Run the **smallest** relevant verify command for the paths touched (see §9 / `AGENTS.md`).

```md
### TASK-POLISH-001: Export design tokens as CSS variables from packages/ui

**Goal:** Produce a generated CSS-variable (and Tailwind-theme) export from
`packages/ui/src/tokens.ts` so web and desktop can consume one source instead of duplicating values.
**User impact:** Foundation for cross-surface visual consistency (indirect, enabling).
**Paths:** `packages/ui/src/tokens.ts`, `packages/ui/src/index.ts`, `packages/ui` build config.
**Steps:**
1. Add a generator that emits `:root` CSS variables for `colorRoles`, `textRoles`, `spacing`, `borderRadius`, `animation`, `iconSizes`.
2. Export it from the package (e.g. a `tokens.css` artifact) without changing existing JS exports.
3. Keep all current named exports intact (web/mobile already import them).

**Validation:**
- [ ] `npm run build --workspace=packages/ui`
- [ ] `npm run build --workspace=apps/web` still green
- [ ] Generated CSS vars match `tokens.ts` values (spot check)

**Risks:** Low — additive.
**Depends on:** none.
**Agent safety:** Safe.
```

```md
### TASK-POLISH-002: Replace desktop shell inline :root with generated tokens

**Goal:** Make `apps/desktop/shell/index.html` consume the generated token CSS variables instead of
its private inline `:root` block.
**User impact:** Desktop starts matching the canonical palette/spacing — first step off the fork.
**Paths:** `apps/desktop/shell/index.html`, `packages/ui` token CSS from TASK-POLISH-001.
**Steps:**
1. Inline (or bundle) the generated token CSS into the shell `<head>`.
2. Remove the hand-maintained `--bg/--accent/...` values, repointing to the shared variables.
3. Keep dark as default until the canonical light theme lands (TASK-POLISH-010).

**Validation:**
- [ ] `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml`
- [ ] Desktop shell Playwright screenshot visually unchanged or closer to web

**Risks:** Medium — visual regression possible.
**Depends on:** TASK-POLISH-001.
**Agent safety:** Needs review.
```

```md
### TASK-POLISH-003: Add Playwright visual-regression baselines for web

**Goal:** Turn the already-captured web screenshots into a failing gate on unexpected UI change.
**User impact:** Prevents silent polish regressions.
**Paths:** `apps/web/e2e/*`, new `apps/web/playwright.config.*`, `.github/workflows/ci-web.yml`.
**Steps:**
1. Add a Playwright config with `toHaveScreenshot` for `/start`, `/app`, a DM thread, and settings.
2. Commit baselines; document the update flow in `docs/ci-screenshots.md`.
3. Add a CI step that runs the visual checks (separate from the gallery capture).

**Validation:**
- [ ] CI visual job passes on an unchanged tree
- [ ] An intentional pixel change fails the diff

**Risks:** Medium — baseline flakiness; pin fonts/viewport.
**Depends on:** none.
**Agent safety:** Safe.
```

```md
### TASK-POLISH-004: Add @axe-core/playwright accessibility checks to web CI

**Goal:** Establish an accessibility gate on key web routes.
**User impact:** Keyboard/screen-reader users get a usable product; prevents a11y regressions.
**Paths:** `.github/workflows/ci-web.yml`, `apps/web/e2e/*`.
**Steps:**
1. Add `@axe-core/playwright` and a test scanning `/start`, `/login`, `/app`, a chat route.
2. Fail on serious/critical violations; allow a reviewed baseline for known issues.
3. Document remediation expectations.

**Validation:**
- [ ] axe run produces a report in CI
- [ ] At least the highest-traffic routes pass with no critical violations

**Risks:** Medium — may surface many existing issues; start with critical-only.
**Depends on:** none.
**Agent safety:** Safe.
```

```md
### TASK-POLISH-005: Failed-message recoverable row + explicit retry (web)

**Goal:** A web send that fails stays visible as a recoverable row with a Retry action; never drops.
**User impact:** No silent message loss — core trust.
**Paths:** `apps/web/src/components/chat/message-row.tsx`, `apps/web/src/lib/relay.ts`/`store.ts`.
**Steps:**
1. Model a `failed` delivery state distinct from pending/sent.
2. Render a Retry affordance on failed rows; preserve content.
3. Re-enqueue on retry with backoff (`apps/web/src/lib/backoff.ts`).

**Validation:**
- [ ] `npm run lint --workspace=apps/web` && `npm run build --workspace=apps/web`
- [ ] Manual: kill relay mid-send, confirm row persists + retries

**Risks:** Medium.
**Depends on:** none (mirror to mobile in TASK-POLISH-006).
**Agent safety:** Needs review.
```

```md
### TASK-POLISH-006: Failed-message recoverable row + explicit retry (mobile)

**Goal:** Mobile parity for TASK-POLISH-005.
**User impact:** Same no-silent-loss guarantee on the primary surface.
**Paths:** `apps/mobile/src/screens/ConversationScreen.tsx`, `apps/mobile/src/components/MessageBubble.tsx`, `apps/mobile/src/lib/relayClient.ts`.
**Steps:**
1. Add `failed` state + Retry affordance with haptic feedback (`src/lib/haptics.ts`).
2. Preserve outgoing in local DB (`src/lib/db.ts`); re-send on retry.
3. Reflect failed count in chat-list row.

**Validation:**
- [ ] `npm run verify --workspace=apps/mobile`
- [ ] On-device airplane-mode send/retry smoke

**Risks:** Medium.
**Depends on:** ideally TASK-POLISH-005 (shared state shape).
**Agent safety:** Needs review.
```

```md
### TASK-POLISH-007: Honest trust badge driven by trustState (conversation headers)

**Goal:** Conversation headers show distinct badges for device-encrypted vs relay-hosted, using
`packages/ui` `trustState`; no "encrypted" affordance on hosted flows.
**User impact:** Truthful privacy signaling.
**Paths:** web chat header in `apps/web/src/app/app/chat/[id]`, `apps/mobile/src/screens/ConversationScreen.tsx`, `packages/ui/src/tokens.ts`.
**Steps:**
1. Determine hosted-vs-encrypted from existing conversation data (do not invent protocol fields if avoidable).
2. Map to `trustState.secure` / `trustState.hosted`; short label + progressive-disclosure explainer.
3. Align copy with §8 and `docs/operator-playbook.md`.

**Validation:**
- [ ] web build/lint; mobile type-check
- [ ] Manual: DM vs legacy group render distinct badges; copy reviewed

**Risks:** Medium — copy correctness is privacy-sensitive.
**Depends on:** none.
**Agent safety:** Human review required.
```

```md
### TASK-POLISH-008: Empty/loading/error sweep for signed-in web routes

**Goal:** Every `/app/*` route has explicit empty, loading, and error states.
**User impact:** No blank panels or raw spinners.
**Paths:** `apps/web/src/app/app/**`, `apps/web/src/components/chat/skeletons.tsx`, `apps/web/src/components/companion-route-boundary.tsx`.
**Steps:**
1. Inventory each route's async surfaces.
2. Add skeletons for loading, friendly empties (one next step), and recoverable error states.
3. Follow `docs/product/ui-patterns.md` empty-state rules (no marketing copy when signed in).

**Validation:**
- [ ] `npm run build --workspace=apps/web`
- [ ] Screenshot each state; add to visual baselines (TASK-POLISH-003)

**Risks:** Low.
**Depends on:** TASK-POLISH-003 for baselines (optional).
**Agent safety:** Safe.
```

```md
### TASK-POLISH-009: Web push notifications (service worker + Web Push)

**Goal:** Web receives message notifications with a clear permission flow, honoring notification
preview mode (no content leak when previews are off).
**User impact:** Web becomes a real messenger; trustworthy, privacy-respecting alerts.
**Paths:** `apps/web` (new service worker + push lib + permission UI), relay `handlers/queue.ts` + push queue.
**Steps:**
1. Add a service worker + Web Push (VAPID) subscription; store subscription via relay.
2. Build permission UX (request at the right moment, not on load).
3. Ensure relay push payloads carry only preview-safe metadata; respect `notificationPreviewMode`.

**Validation:**
- [ ] `npm run build --workspace=apps/web`; relay tests
- [ ] Manual: notify with preview on vs off; background/foreground

**Risks:** High — new surface, privacy-sensitive payloads.
**Depends on:** relay preview-safe payload shaping; §8.
**Agent safety:** Human review required.
```

```md
### TASK-POLISH-010: Canonical light theme in packages/ui tokens

**Goal:** Add a canonical light-theme `colorRoles` map so web + desktop share one theme switch.
**User impact:** Consistent, real light mode across surfaces.
**Paths:** `packages/ui/src/tokens.ts`, generated CSS export (TASK-POLISH-001), web Tailwind, `apps/desktop/shell/index.html`.
**Steps:**
1. Define light-theme role values meeting AA contrast.
2. Emit a `.light` (or `[data-theme=light]`) variable set alongside dark.
3. Verify the existing web theme switch consumes canonical values (not local overrides).

**Validation:**
- [ ] `npm run build --workspace=packages/ui` then `apps/web`
- [ ] Manual: toggle light/dark/OLED on web; check contrast

**Risks:** Medium — contrast/regression.
**Depends on:** TASK-POLISH-001.
**Agent safety:** Safe.
```

```md
### TASK-POLISH-011: Settings IA decomposition (web)

**Goal:** Break the monolithic `apps/web/src/app/app/settings/page.tsx` into clear sections
(account, identity, privacy/media, notifications, sessions/devices, recovery, trust & safety).
**User impact:** Settings feel complete and navigable.
**Paths:** `apps/web/src/app/app/settings/page.tsx`, `apps/web/src/components/{device-link-panel,recovery-panel}.tsx`.
**Steps:**
1. Extract section components; keep behavior identical.
2. Surface session list + revoke and device link/unlink clearly.
3. Add privacy/media-default and notification controls (align with `docs/roadmap.md`).

**Validation:**
- [ ] `npm run lint --workspace=apps/web` && `npm run build --workspace=apps/web`
- [ ] Manual: revoke a session, link/unlink a device

**Risks:** Medium.
**Depends on:** TASK-POLISH-007/§8 for trust copy.
**Agent safety:** Needs review.
```

```md
### TASK-POLISH-012: Unify conversation-row grammar through packages/ui

**Goal:** Web, mobile, and desktop chat lists render the same row metaphor via
`packages/ui` `ConversationRow` (avatar, unread, preview truncation, pin/mute/archive modifiers).
**User impact:** One product feel across surfaces.
**Paths:** `packages/ui/src/components/messaging/ConversationRow.tsx`, `apps/web/src/components/chat-rail.tsx`, `apps/mobile/src/screens/ChatListScreen.tsx`, `apps/desktop/shell/index.html`.
**Steps:**
1. Make `ConversationRow` the reference contract (props for all states).
2. Reconcile web `chat-rail` to it; mirror behavior on mobile/desktop.
3. Use shared avatar-color logic on all surfaces.

**Validation:**
- [ ] web build/lint; mobile type-check
- [ ] Screenshot compare chat lists across surfaces

**Risks:** Medium.
**Depends on:** TASK-POLISH-002/010 token propagation.
**Agent safety:** Safe (web/mobile), Needs review (desktop).
```

```md
### TASK-POLISH-013: Reduced-motion + shared motion vocabulary audit

**Goal:** Every surface pulls durations/easings from `animation`/`motionRoles` tokens and fully
honors reduced-motion.
**User impact:** Consistent, accessible motion; no motion-sickness triggers.
**Paths:** `packages/ui/src/tokens.ts`, `apps/web/src/app/globals.css`, `apps/mobile/src/lib/motion.ts`, `apps/desktop/shell/index.html`.
**Steps:**
1. Grep for hardcoded durations/easings per surface; repoint to tokens.
2. Verify `prefers-reduced-motion`/`ReduceMotion.System` collapses all new motion.
3. Add a couple of tasteful desktop transitions using shared values.

**Validation:**
- [ ] web build; mobile type-check; desktop cargo check
- [ ] Manual: OS reduce-motion on each surface collapses motion

**Risks:** Low.
**Depends on:** none.
**Agent safety:** Safe.
```

```md
### TASK-POLISH-014: Deleted/unavailable message tombstones

**Goal:** Deleted or device-unavailable messages render an explicit tombstone row, not a gap.
**User impact:** Honest local-first history; no confusing blanks.
**Paths:** web `message-row.tsx`, mobile `MessageBubble.tsx`, shared message normalization.
**Steps:**
1. Define tombstone variants ("message deleted", "not available on this device").
2. Render distinctly from real messages; calm copy.
3. Ensure grouping/scroll math handles tombstones.

**Validation:**
- [ ] web build; mobile type-check
- [ ] Manual: delete a message; open thread on a second device

**Risks:** Low-Medium.
**Depends on:** TASK-POLISH-006 (shared message shape) helpful.
**Agent safety:** Safe.
```

```md
### TASK-POLISH-015: Define release-checklist doc + wire into PR template

**Goal:** Codify the §9 release checklist so "polished" has a concrete bar.
**User impact:** Indirect — sustained quality.
**Paths:** new `docs/release-checklist.md`, `.github/` PR template, link from `AGENTS.md`/`docs/README.md`.
**Steps:**
1. Write the per-surface checklist (verify cmd, visual baseline, a11y, states, delivery/retry, notifications, trust copy, screenshot).
2. Reference exact commands from §9.
3. Link it from contributor docs.

**Validation:**
- [ ] `npm run check:repo-contracts`
- [ ] Doc renders; links resolve

**Risks:** Low.
**Depends on:** TASK-POLISH-003/004 for the gates it references.
**Agent safety:** Safe.
```

---

### Sequencing note

Land **P0** first (desktop token un-fork, no-drop sends, honest badges, no-dead-ends, visual
baselines) — these remove the "looks broken / feels untrustworthy" signals. **P1** brings the
messaging baseline (notifications, settings depth, a11y, delivery/attachment states). **P2** makes
the three surfaces feel like one product (desktop true parity, light theme, mobile decomposition,
component unification). **P3** is delight. Treat the desktop shared-shell decision (P2-1 /
TASK-POLISH-002) as the highest-leverage architectural choice in the whole program: until desktop
consumes the shared design system, every other surface's polish keeps leaving Windows/Ubuntu
behind.
