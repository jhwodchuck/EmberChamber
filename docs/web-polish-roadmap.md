# Web Polish Roadmap

Goal: bring the Next.js web workspace (`apps/web`, the authenticated `/app/*` surface) to the same
motion / micro-interaction quality the Expo Android client reached in
`docs/android-polish-roadmap.md`, so the two surfaces feel like one product.

Scope is **presentation and interaction only**. It does not change the relay wire contract, the
E2EE model, local-first sync, or the product constraints in `AGENTS.md`. There are **no protocol
changes**, so no `packages/protocol` parity work was involved.

## Starting point (2026-06)

The web workspace already had **feature** parity with Android — reactions, replies, edits, typing
indicators, light/dark/system theme, and pin/mute/archive. What it lacked was the **polish** layer:
each message rendered as a standalone bubble with top-left metadata and a static `✓✓`, the typing
indicator was a plain text banner, loading was a spinner, and there was no message grouping, avatar
gutter, or jump-to-bottom.

## Translation principle (Android → web)

The native polish was built on Reanimated worklets + gesture-handler + haptics. The web does not
get those. This work is **CSS-first**: CSS transitions, a small set of `@keyframes` in
`globals.css`, and lightweight React state — every animation gated behind
`@media (prefers-reduced-motion: reduce)` (the web analog of the mobile `ReduceMotion.System`
discipline). **No new dependencies** were added; the React-19 `overrides` and the expo-doctor gate
are untouched.

### Intentionally excluded (mobile-only, no sensible web analog)

- Haptics, finger-tracked keyboard avoidance, swipe-to-reply / swipe gestures.
- Pull-to-refresh — web already refreshes on window focus/visibility and has a manual refresh
  button on the rail.
- FlashList virtualization — the web list is capped at 80 messages and stays a plain scroll
  container.

## What shipped

### Foundation

- `apps/web/src/lib/avatar-color.ts` — verbatim port of `apps/mobile/src/lib/avatarColor.ts`
  (same palette + hash) so a participant reads with the same color on both surfaces.
- `apps/web/src/app/globals.css` — a polish layer: keyframes (`ec-typing-bounce`,
  `ec-reaction-pop`, `ec-message-enter`, `ec-fade-in`, `ec-banner-enter`, `ec-shimmer`), the
  `.oled` true-black theme variant, the `.workspace-ember` background utility (port of the mobile
  `GradientBackground`), own-bubble typography overrides, and a `prefers-reduced-motion` guard.

### Phase 1 — Chat surface

`apps/web/src/components/chat/*` + `apps/web/src/app/app/chat/[id]/page.tsx`:

- `message-row.tsx` — grouped runs (same sender within 5 min collapse), avatar gutter with
  name-hash colors (incoming group/room, last-in-group only), bubble tails, and a bottom-right
  footer carrying time + edited + delivery label + animated read ticks. Also fixed a latent bug:
  reply quotes / edited / deleted / read counts were previously cast onto the normalized message
  shape but never populated — `threadMessages` now carries those fields.
- `read-ticks.tsx`, `typing-dots.tsx` (replaces the text banner, anchored at the conversation
  bottom), `jump-to-bottom.tsx` (FAB + unread badge, pin-aware auto-scroll), and sticky floating
  date pills.

### Phase 2 — Interaction & motion

- `reaction-chip.tsx` — pop on mount / re-pop on count change.
- `message-context-menu.tsx` — right-click (and a hover `⋯` button) opens a quick-reaction row +
  Copy / Reply / Edit / Delete over a dimmed backdrop, capability-gated like the mobile menu.
- `image-lightbox.tsx` — full-screen image viewer with wheel/click zoom and Esc / backdrop
  dismiss (web analog of the mobile pinch-zoom + swipe-dismiss).

### Phase 3 — Composer

- Animated send button (scales/brightens when the composer has content) and slide-in transitions
  for the reply/edit banners and the selected-file preview.

### Phase 4 — System & theme

- OLED true-black option in Settings → Appearance, applied pre-paint via the `themeInitScript` in
  `layout.tsx` (OLED implies dark).
- Ember gradient workspace background behind the `/app` shell (`companion-shell.tsx`); OLED
  collapses it to true black.
- Skeleton shimmer (`skeletons.tsx`) replacing the chat-rail "Syncing…" text and the conversation
  loading spinner.

## Verification

- `npm run type-check --workspace=apps/web`
- `npm run lint --workspace=apps/web`
- `npm run build --workspace=apps/web`
- Manual: `npm run dev`, then exercise a DM, a group, and a room thread; toggle OS reduce-motion
  and confirm all new motion collapses to static states; toggle the OLED switch in
  Settings → Appearance.
