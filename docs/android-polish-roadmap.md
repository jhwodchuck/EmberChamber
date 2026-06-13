# Android Polish Roadmap

Goal: raise the Expo Android client (`apps/mobile`) to a Telegram/Signal level of motion,
gesture, and micro-interaction polish. This document is the planning source of truth for that
effort and is meant to be worked in parallel by multiple agents.

Scope is **presentation and interaction only**. It does not change the relay wire contract, the
E2EE model, the local-first sync, or the product constraints in `AGENTS.md` / `docs/roadmap.md`.

## Current-state assessment (2026-06)

The app is functionally rich (E2EE threads, device linking, attachments, reactions, replies,
edits, typing indicators, swipe-to-archive, scroll-position memory, local-first caching) but the
motion/gesture/micro-interaction layer is basic.

The single biggest lever: **none of the libraries that produce native-grade feel are installed.**
`apps/mobile/package.json` has no `react-native-reanimated`, `react-native-gesture-handler`,
`@shopify/flash-list`, `expo-haptics`, `expo-blur`, `expo-linear-gradient`, or
`react-native-keyboard-controller`. Everything animates through the legacy `Animated` +
`PanResponder` API and renders through plain `FlatList`.

Concrete gaps vs. Telegram/Signal:

| Area | Today | Target |
| --- | --- | --- |
| Message bubbles | meta line `You · 12:34 ✓✓` at top, no tails, no avatars, no grouping | tails, grouped runs, avatar gutter, time+ticks bottom-right |
| Long-press menu | bottom-sheet `Modal` (`MessageContextMenu.tsx`) | bubble lifts over blurred backdrop, reactions arc in |
| Reply | long-press → menu → reply | swipe-to-reply on the bubble |
| Typing | plain text banner | animated dots |
| Reactions | static chips | pop/scale animation + haptic |
| Date headers | inline text label | floating sticky pill |
| Keyboard | KAV inert on Android, `softwareKeyboardLayoutMode: pan` (jank source) | interactive, finger-tracked |
| Lists | `FlatList` | FlashList, jump-to-bottom FAB w/ unread count |
| Haptics | none | send, long-press, reaction, swipe thresholds |
| Send feedback | state flips | optimistic pending→sent→delivered→read with motion |
| Theme | single dark theme, faked rgba "orbs" | light/dark/OLED, real gradients |

Structural drag (survivable, but slows every phase): `App.tsx` is a ~3,000-line god component
holding all state; `src/styles.ts` is a single ~2,500-line `StyleSheet`. New visual work should
prefer **co-located `*.styles.ts` modules** that import from `@emberchamber/ui/tokens` rather than
growing the monolith further.

## Out-of-scope decisions

- **Voice messages** are intentionally excluded. `RECORD_AUDIO` is in `app.json` `blockedPermissions`
  by product decision. Matching that Telegram/Signal staple would reverse a product call — revisit
  only on explicit request.
- **react-navigation** migration (real screen-push/gesture-back stack) is optional. The app uses a
  hand-rolled tab switch. Treat a nav-stack migration as an opt-in Phase 2.5, not baseline.

## Phases

Phases are ordered so each ships visible polish on its own. **Phase 0 is the hard prerequisite** —
little else builds without it.

### Phase 0 — Foundation (enablers)

- Add via `npx expo install` (SDK-55-aligned, to satisfy the single-React-version override and the
  pre-commit `expo-doctor` gate): `react-native-reanimated`, `react-native-gesture-handler`,
  `@shopify/flash-list`, `expo-haptics`, `expo-blur`, `expo-linear-gradient`,
  `react-native-keyboard-controller`.
- Create `babel.config.js` with the worklets plugin (Reanimated 4 uses `react-native-worklets/plugin`).
- Wire `GestureHandlerRootView` + `KeyboardProvider` at the root (`src/app/AppProviders.tsx`).
- Add `src/lib/haptics.ts` and `src/lib/motion.ts` (shared spring/timing presets) as the single
  vocabulary every later phase pulls from.
- **Gate:** clean `prebuild:android` + `npm run verify --workspace=apps/mobile` must pass before
  building on this — these are native-module additions.

### Phase 1 — Chat surface (highest visual ROI)

- Rebuild `MessageBubble.tsx`: time + status ticks bottom-right inline; bubble tails; **group
  consecutive same-sender messages** (collapse meta, tighten spacing); avatar gutter for group
  threads with deterministic color-from-name hash.
- Animated read-state ticks (✓ → ✓✓) and animated typing indicator (three bouncing dots)
  replacing the text banner in `ConversationScreen.tsx`.
- Floating sticky date pill + unread-divider line.
- Jump-to-bottom FAB with unread count when scrolled up (scroll math already in `ConversationScreen.tsx`).

### Phase 2 — Gesture & motion

- Swipe-to-reply on bubbles (gesture-handler + Reanimated, haptic at threshold).
- Replace the bottom-sheet long-press menu with a contextual menu: bubble scales up over a blurred
  backdrop, reaction row animates in (`expo-blur` + Reanimated).
- Reaction pop/scale animation + haptic; animate chip add/remove.
- Re-implement the chat-list swipe (`ChatListScreen.tsx`) on Reanimated/gesture-handler with haptic
  detents.
- Migrate both lists to FlashList.

### Phase 3 — Keyboard & composer

- Adopt `react-native-keyboard-controller` for finger-tracked avoidance; retire the inert KAV
  workarounds; re-evaluate `softwareKeyboardLayoutMode` in `app.json`.
- Animated send button (grows/morphs when text present), animated attachment tray, smooth
  reply/edit banner transitions.
- Image viewer (`ImageViewerModal.tsx`) → pinch-to-zoom + swipe-to-dismiss.

### Phase 4 — System & theme polish

- Light/dark/OLED theming off the existing `@emberchamber/ui/tokens` roles; real gradients via
  `expo-linear-gradient` replacing the rgba orbs.
- Animated app entry / splash continuity; tab-bar transition polish; pull-to-refresh; skeleton
  shimmer.
- Swap deprecated `Clipboard` from `react-native` → `expo-clipboard` (`MessageBubble.tsx`).

## Verification

Each phase ends with `npm run verify --workspace=apps/mobile` (expo-doctor + type-check) and a
manual run on an Android device/emulator. Phase 0's native additions specifically require a clean
`npm run prebuild:android:preserve-worktree` pass before building on the work. Keep the root
`overrides` (single React version) intact when adding React-dependent deps.

## Parallelization notes

- Phase 0 is serial and must land first.
- After Phase 0, the highest-ROI independent slices (bubble redesign; typing/date/FAB; theme;
  clipboard swap) can run in parallel **if each owns disjoint files** and adds co-located
  `*.styles.ts` rather than editing `src/styles.ts` concurrently.
- Phase 2's contextual-menu rework couples to `MessageBubble.tsx`, so it should follow Phase 1's
  bubble redesign rather than race it.
