# Mobile improvements plan

## Goal

Use lessons from Telegram Android and Telegram X source review to improve `apps/mobile` without drifting away from EmberChamber's current beta contract.

## Status on 2026-04-04

Implemented in this pass:

- persisted signed-in shell state for the last top-level section, chat view, filter, and conversation
- replaced the chat list `ScrollView` with a virtualized `FlatList`
- stopped unconditional thread scroll-to-end behavior and only auto-scroll when the user is near the bottom or opening a fresh thread
- centralized attachment open, download, decrypt, preview preparation, retry behavior, and retention-aware cleanup behind a shared attachment manager path
- added a shared screen scaffold with reusable header action slots so chats, invites, and settings stop re-solving the same shell
- pulled conversation catalog state and persisted signed-in shell state out of `App.tsx` into dedicated hooks
- refreshed previews and unread state from SQLite whenever mailbox sync or thread refresh writes land in cache
- restored thread anchor position for re-entry instead of only restoring the selected conversation
- added a larger-screen chats workspace that keeps the list visible and opens the conversation in a secondary pane on wider layouts

Core plan status:

- Phases 1 through 6 are implemented in the current mobile client
- the remaining work is follow-on polish, not missing structural pieces from this plan

Follow-on polish outside the core plan:

- tighten cache-retention heuristics as product rules evolve
- add dedicated media or call surfaces if those features become dense enough to justify them
- extend the larger-screen pane model to settings subflows and richer detail surfaces later

## Product guardrails

This plan must preserve:

- invite-only onboarding
- adults-only access
- local-first history
- small encrypted groups
- private trusted-circle positioning
- web as a secondary surface

This plan must not introduce:

- phone-number identity
- public discovery
- channel-first product growth
- cloud-first message history assumptions
- command-line-first interaction patterns that collapse durable screens into one-shot outputs

## Current pressure points in `apps/mobile`

- `App.tsx` is carrying too much orchestration responsibility.
- chat list rendering is scaffold-grade and not ready for larger local inboxes.
- conversation scroll behavior is simple but fragile.
- attachment handling is still too close to the bubble UI.
- screen infrastructure is inconsistent across chat, settings, and future management flows.

## Improvement themes

### 1. Split app state by domain

Create separate modules or stores for:

- auth and session state
- conversations and unread state
- active thread and mailbox sync
- attachments and media cache
- device-link and session management

Target outcome:

- `App.tsx` becomes a thin bootstrap and route shell instead of the main logic owner.

### 2. Upgrade list infrastructure

Replace current chat-list rendering with a virtualized list implementation.

Target work:

- move chat list to `FlatList` or `FlashList`
- keep stable per-conversation keys
- preserve swipe actions and pinned or archived affordances
- prepare for larger inboxes without rendering the full list at once

Target outcome:

- better scroll performance
- less rerender pressure
- cleaner room for unread jumps and future inbox sections

### 3. Fix conversation scroll and history behavior

Adopt explicit scroll rules instead of always jumping to bottom on row-count changes.

Target work:

- only auto-scroll when the user is already near the bottom
- preserve anchor when prepending older history
- support unread jump behavior later without layout fights
- record and restore thread position for re-entry

Target outcome:

- message sync feels stable instead of jumpy
- future pagination and unread navigation become tractable

### 4. Build a dedicated attachment pipeline

Move attachment lifecycle out of message bubble UI and into a shared attachment manager.

Target work:

- track attachment states: idle, downloading, decrypting, ready, failed
- cache decrypted local files safely with retention-aware cleanup
- centralize image preview, file open, and error handling
- prepare for client-side encrypted upload and uniform encrypted attachment support

Target outcome:

- less duplicate media logic
- fewer UI race conditions
- clearer path to stronger encrypted attachment behavior

### 5. Introduce reusable screen infrastructure

Take the right lesson from Telegram X: screens should inherit shared behavior rather than each solving layout and scroll from scratch.

Target work:

- common mobile screen shell
- shared list screen primitives
- shared sheet and modal patterns
- shared bottom inset and keyboard behavior
- common loading, empty, and error states
- section-level primary action slots so chats, invites, settings, and future people or sessions flows do not all invent their own header actions
- larger-screen variants that can support an optional secondary detail pane without forking the whole navigation model

Target outcome:

- lower UI complexity
- easier consistency across chats, invites, settings, and sessions

### 6. Build a real navigation shell

Take the right lesson from Telegram Android's launch and tab shell:

Target work:

- separate bootstrap or launch concerns from signed-in surface concerns
- keep the signed-in shell responsible for section orchestration, not the root app bootstrap
- define navigation restoration rules for:
  - last active conversation
  - last selected top-level section
  - settings or device-management subflows
- define per-section action behavior so the primary action can adapt to the active surface
- support tap-again-to-scroll-top behavior for major list surfaces later
- avoid making the root component the direct owner of every visible screen state

Target outcome:

- the app reopens feeling stateful instead of rebuilt from scratch
- chat, settings, invites, and future contacts or sessions surfaces fit inside one coherent shell

### 7. Make SQLite-backed local state more authoritative

The local store already exists. The next step is to lean on it more directly.

Target work:

- hydrate previews and unread state from local cache first
- reconcile relay fetches into the cache instead of only in-memory state
- make thread rendering resilient to offline and slow-relay conditions
- persist enough metadata to restore recent navigation state reliably

Target outcome:

- stronger local-first behavior
- reduced dependency on immediate network success

### 8. Preserve durable mobile surfaces

Take the right negative lesson from `vysheng/tg`:

Target work:

- keep dialogs, thread history, profiles, and group-management flows as persistent mobile surfaces
- avoid turning core actions into detached one-shot flows that dump output and lose context
- expose explicit operations without sacrificing section state, navigation continuity, or media affordances

Target outcome:

- the app stays stateful and legible under more features
- explicit actions do not come at the cost of mobile usability

### 9. Prepare larger-screen pane evolution

Take the right lesson from Telegram Desktop:

Target work:

- keep the current phone shell simple while making room for tablet or foldable split-view later
- define which surfaces can become secondary panes on larger screens:
  - conversation details
  - media collections
  - member lists
  - settings subflows
- treat media viewer, call UI, and other dense flows as candidates for dedicated surfaces when inline UI becomes overloaded
- translate desktop context-action density into mobile-friendly sheets, menus, and long-press actions instead of copying right-click behavior directly

Target outcome:

- larger-screen layouts can evolve without re-architecting the app again
- phone UX stays focused while secondary surfaces grow more capable on bigger canvases

## Proposed phases

## Phase 1

- carve `App.tsx` into session, conversations, and attachment modules
- keep existing UI mostly intact
- reduce prop drilling into `MainScreen`

Exit criteria:

- root app shell is smaller
- main logic no longer depends on one file owning every state transition

## Phase 2

- replace chat list `ScrollView` with a virtualized list
- keep swipe actions and filters working
- verify performance with larger seeded conversation counts

Exit criteria:

- list remains smooth with a materially larger local inbox

## Phase 3

- refactor thread scrolling behavior
- add explicit bottom-anchor logic
- stop unconditional scroll-to-end behavior

Exit criteria:

- new messages do not yank the user unexpectedly
- prepending history keeps the viewport stable

## Phase 4

- introduce attachment manager
- move download/decrypt/open logic out of `MessageBubble`
- add reusable media state tracking

Exit criteria:

- message UI becomes thinner
- attachment retries and failures are easier to reason about

## Phase 5

- add shared list screen and screen-shell primitives
- align settings, invites, sessions, and future device-management screens on one pattern
- add shared top-level section behavior for scroll restore, primary action placement, and header wiring
- prepare tablet and foldable layout improvements later, including optional detail-pane surfaces

Exit criteria:

- new screens can be added without repeating layout and inset logic

## Phase 6

- introduce a proper signed-in navigation shell
- restore last active section and thread deliberately
- decouple app bootstrap from in-app screen orchestration
- prepare for section-specific actions and later scroll-to-top behavior without more `App.tsx` state growth

Exit criteria:

- app relaunch returns the user to a coherent place
- screen state is no longer primarily managed by the root component

## What to borrow from each reference

### Borrow from Telegram Android

- subsystem boundaries
- media pipeline separation
- list diffing and large-list discipline
- deliberate handling of storage and message lifecycle

### Borrow from Telegram X

- clearer navigation shell
- pager-like signed-in section shell
- controller boundaries
- reusable recycler screen infrastructure
- dedicated message manager layer between screen and message data
- section-specific primary action behavior
- shared scroll-to-top and screen restore affordances
- mode-based reusable controllers instead of proliferating one-off pages

### Learn from Telegram Desktop without copying it

- pane-based workspace ideas for larger screens
- optional detail-pane thinking
- dedicated media and call surfaces when inline UI gets too dense
- stronger action taxonomy, but translated into mobile sheets and menus

### Learn from tg without copying it

- explicit verbs and clear operational boundaries
- simple discoverability around what actions exist
- a strong reminder not to replace durable mobile surfaces with command-style one-shot outputs

## What not to borrow

- singleton-heavy Java architecture as-is
- Telegram's feature bloat
- Telegram's cloud-first product assumptions
- public-facing growth and monetization surfaces
- CLI-style interaction as a primary navigation model
- desktop multi-window and right-click assumptions as the default mobile interaction model

## Recommended next implementation step

This plan is now implemented.

The next sensible follow-on work should be a separate plan focused on:

- richer larger-screen detail panes beyond chat threads
- denser media-management surfaces if attachment use grows
- more explicit section-level actions like tap-again-to-scroll-top and deep settings subflows

## Verification

For these doc changes:

- `npm run check:repo-contracts`

For future implementation in `apps/mobile`:

- `npm run type-check --workspace=apps/mobile`
