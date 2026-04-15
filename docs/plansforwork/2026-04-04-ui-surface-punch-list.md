# UI Surface Punch List (Repo-Ready)

Date: 2026-04-04  
Scope: active beta runtime surfaces (`apps/mobile`, `apps/web`, `apps/desktop`)  
Input: cross-surface UX audit converted into implementation-oriented backlog.

## How to Use This Punch List

- Treat **P0** as immediate quality-lift work that should land first.
- Treat **P1** as follow-up polish that depends on P0 layout and IA decisions.
- Treat **P2** as differentiation work after core usability is stable.
- For desktop UI changes, prioritize shared workspace components in `apps/web` first, then validate shell behavior in `apps/desktop`.

## Delivery Checklist (Tracking)

Status key: `[ ]` not started, `[~]` in progress, `[x]` done.

- [x] Convert UX audit into repo-mapped punch list (this document).
- [~] Ship mobile messenger-first signed-in home slice (`MainScreen`, `ChatListScreen`, `ConversationScreen`).
  - 2026-04-04 progress: added a top-of-list “Resume thread” card and first-chat empty-state CTA in `ChatListScreen`.
- [~] Ship marketing hero/product-preview/CTA hierarchy slice (`apps/web` public homepage).
  - 2026-04-04 progress: reduced hero CTA sprawl (primary + secondary), moved tertiary links into lightweight text links, and increased preview framing.
- [~] Ship authenticated workspace conversation-first hierarchy slice (`/app`, `/app/chat/[id]`).
  - 2026-04-04 progress: added a “Resume thread” hero card on `/app`, reduced dashboard-like stats blocks, and softened chat trust-copy density.
- [~] Ship invite-review and onboarding premium-flow slice (mobile + web).
  - 2026-04-04 progress: pending implementation.
- [~] Ship cross-surface token/component alignment slice and publish shared UI-spec notes.
  - 2026-04-04 progress: aligned “resume thread” pattern language and attachment-chip treatment between mobile and web.
- [~] Run per-slice verification commands and attach screenshots for perceptible UI changes.
  - 2026-04-04 progress: command checks executed; screenshot capture blocked because browser screenshot tooling is unavailable in this runtime.

## P0 — Fastest Lift in Perceived Product Quality

### 1) Mobile signed-in home should read as messenger-first

**Primary files/components**

- `apps/mobile/src/screens/MainScreen.tsx`
- `apps/mobile/src/screens/ChatListScreen.tsx`
- `apps/mobile/src/screens/ConversationScreen.tsx`
- `apps/mobile/src/components/StatusCard.tsx`
- `apps/mobile/src/components/DeviceLinkCard.tsx`

**Problems to solve**

- Infrastructure diagnostics currently compete with conversation resumption.
- Thread resumption is not visually dominant.
- Group selection reads like an admin picker instead of a modern inbox.

**Implementation tasks**

- Move relay/session/vault/account instrumentation behind collapsible “Debug + diagnostics” in `SettingsScreen` or a hidden developer affordance.
- Redesign top of `MainScreen` to prioritize:
  1. “Resume last thread” card,
  2. recent conversations list with preview + timestamp + unread badge,
  3. secondary action for invite entry.
- Shift group selection behavior into `ChatListScreen` list patterns (pinned/recent, unread emphasis, avatar/identity treatment).
- Keep device-linking affordances accessible but demote from home surface to settings/account areas.

**Definition of done**

- First viewport on signed-in mobile contains conversation-oriented actions only.
- Diagnostics are still reachable but no longer first-class on home.
- Time-to-first-thread-resume becomes one tap from main landing.

---

### 2) Public homepage hero + product preview needs stronger visual conviction

**Primary files/components**

- `apps/web/src/app/page.tsx`
- `apps/web/src/components/marketing/*` (hero/path cards/proof sections)
- `apps/web/src/app/(public)/*` routes tied to Start/Download/Privacy/Trust/Support

**Problems to solve**

- Homepage is clear and credible but text-heavy and section-repetitive.
- CTA hierarchy is diffuse (too many “first” actions).
- Product screenshots/mockups are not yet dominant enough for a messaging product.

**Implementation tasks**

- Reduce hero to one primary action + one secondary action; demote tertiary links.
- Replace repeated trust paragraphs with visual “boundary proof” blocks (relay boundary, local vault, invite gating).
- Increase UI screenshot density and size in hero and near-fold sections.
- Convert FAQ into concise accordion with one-line summaries per item.
- Reorder sections into narrative: value proposition -> product UI proof -> trust boundary proof -> route-specific CTAs.

**Definition of done**

- The fold has a single obvious primary CTA.
- At least one high-fidelity product visual appears before deep narrative copy.
- Trust model remains clear with fewer repeated paragraphs.

---

### 3) Authenticated web workspace should feel conversation-first, not dashboard-first

**Primary files/components**

- `apps/web/src/app/app/page.tsx`
- `apps/web/src/app/app/chat/[id]/page.tsx`
- `apps/web/src/components/app-shell/*`
- `apps/web/src/components/chat/*`

**Problems to solve**

- `/app` overview reads as control center instead of conversation home.
- Conversation previews and thread layout lack emotional hierarchy.
- Connection/trust status copy is informative but visually over-prominent.

**Implementation tasks**

- Reframe `/app` around recent threads first; move operations cards below thread list.
- Add richer conversation preview rows (avatar/space identity, unread state, attachment markers, relative time).
- Tighten chat composer hierarchy: one primary send action, clearer attachment chip states, calmer utilities.
- Restyle connection state to subtle persistent indicator instead of primary block.
- Harmonize headers for DM/group/community/room with clear space-type grammar.

**Definition of done**

- Opening `/app` makes thread continuation the dominant action.
- Chat route visual weight favors messages and composer over infrastructure metadata.
- Workspace and desktop shell feel like the same “conversation” product.

---

### 4) Invite review + onboarding should feel premium and deliberate

**Primary files/components**

- `apps/mobile/src/screens/OnboardingScreen.tsx`
- `apps/mobile/src/screens/ProfileSetupScreen.tsx`
- `apps/web/src/app/(public)/start/*`
- `apps/web/src/app/app/review-invite/*`

**Problems to solve**

- Trust-boundary moments feel procedural rather than ceremonial.
- Age gate and invite entry are functional but visually under-expressive.
- Copy is honest but often too dense for first-run mobile/web flows.

**Implementation tasks**

- Replace plain invite-token reveal with cleaner expandable card pattern.
- Elevate age-gate styling into deliberate branded confirmation step.
- Split long explanatory copy into progressive disclosure (short default, expandable “learn more”).
- Add success-transition moment between onboarding completion and profile setup.
- Standardize invite review visual language across mobile + web.

**Definition of done**

- Invite/age/identity steps scan quickly with short copy and clear progression.
- Trust boundary flows feel designed, not just validated.
- Shared vocabulary and visual motifs are consistent across mobile and web.

---

### 5) Cross-surface design system continuity

**Primary files/components**

- `apps/mobile/src/styles.ts`
- `apps/web/src/components/*` shared UI primitives/tokens
- `apps/desktop` shell chrome (validation only unless shell-specific fix is required)

**Problems to solve**

- Surfaces feel structurally related but not emotionally unified.
- Brand personality (“quiet, intimate, premium”) is stronger in copy than in UI.

**Implementation tasks**

- Define cross-surface token pass: spacing scale, border radii, elevation, muted/primary text ramps.
- Align key component metaphors: conversation row, trust badge, attachment chip, empty state card.
- Establish “beta truth” presentation conventions (contained info callouts, not dominant page framing).
- Produce a small shared UI-spec page (internal docs) with before/after references.

**Definition of done**

- Mobile/public-web/auth-web surfaces are recognizably one product family.
- Informational integrity is preserved without crowding primary messaging actions.

## P1 — Follow-up UX and Content Polish

### Mobile (`apps/mobile`)

- Add richer empty states for chat list, invite list, and first-thread surfaces.
- Improve composer ergonomics: attachment tray/chips and tighter send affordance.
- Translate technical setting labels into user language while preserving current semantics.
- Add clear tab-level separation between Chats, Invites, Settings.

### Public web (`apps/web` public routes)

- Improve section rhythm with stronger alternation in density/visual tone.
- Add concise differentiator block (“why this trust model”) without competitor-heavy copy.
- Rebalance navigation to user-intent pathways (new visitor vs invited user vs returning member).

### Auth workspace (`apps/web` app routes)

- Expand search prominence and interaction quality.
- Standardize creation flows (new DM/group/community) into one consistent wizard grammar.
- Refine settings IA for recovery/security tasks where web is especially valuable.

## P2 — Brand and Interaction Depth

- Introduce stronger visual signature motif for “trusted circles” across all surfaces.
- Add conversation mood metadata patterns (presence/quiet states/space identity) where appropriate.
- Improve animation rhythm and transition quality for onboarding, thread-entry, and invite verification moments.
- Build lightweight UI QA matrix for mobile + web + desktop-shell parity.

## Suggested Execution Sequence

1. Mobile messenger-first home rewrite (`MainScreen`, `ChatListScreen`).
2. Web `/app` overview and chat route hierarchy pass.
3. Marketing hero/product-preview/CTA simplification.
4. Invite + onboarding premium treatment (mobile + web).
5. Cross-surface token and component alignment pass.

## Verification Checklist (when implementing slices)

- Mobile UI slices: `npm run type-check --workspace=apps/mobile`
- Web UI slices: `npm run lint --workspace=apps/web` and `npm run build --workspace=apps/web`
- Desktop-shell-impacting workspace changes: `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml`
- If routing/guidance/docs constraints change: `npm run check:repo-contracts`
