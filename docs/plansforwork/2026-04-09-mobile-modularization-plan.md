# 2026-04-09 Mobile Modularization Plan

## Purpose

Capture the recommended mobile modularization direction, the cross-surface design-system foundation work, and the Android-native seam strategy in one place so the work can be planned, tracked, and split into issues.

This plan was written after reviewing the current EmberChamber direction and mobile shape:

- Android, Windows, Ubuntu, and web are the first committed beta surfaces
- the mobile app is already using Expo / React Native
- the product benefits more from better boundaries and shared foundations than from a UI-stack rewrite

## Executive summary

The right next step is **not** to replace the Android stack.

The right next step is to:

1. split the mobile app into feature-owned modules instead of continuing to grow a top-level orchestrator
2. define shared design tokens and cross-surface UI patterns so Android, web, and desktop stay aligned
3. keep explicit Android-native escape hatches for security-sensitive, reliability-sensitive, and OS-integration-heavy capabilities

## Recommendation

### Keep the current Android UI direction

Continue using:

- React Native / Expo for most Android UI
- Rust for secure core / protocol / shared logic where it belongs
- platform-specific native Android code only where it clearly solves a real problem

### Do not treat this as one vague feature request

This should be handled as:

- one parent architecture / foundation epic
- several child issues with clear ownership and success criteria

## Why this work matters

### Current pain points

The current mobile shape is likely to become expensive to evolve if the top-level app entrypoint keeps owning too many responsibilities at once.

Typical symptoms:

- large top-level state surfaces
- relay calls mixed directly into UI orchestration
- multiple user flows coupled together in one file
- difficult isolated testing
- fragile cross-surface consistency
- no explicit Android-native seams for long-term hard problems

### Risks if deferred too long

- every new feature increases coupling
- refactors get harder because too many flows depend on the same top-level orchestration
- Android, web, and desktop drift in layout language and interaction style
- future Android-native capability work gets bolted on reactively instead of planned intentionally

## Target architecture

### Mobile app structure

Organize the mobile app by domain responsibility, not by one oversized orchestration file.

Suggested feature areas:

- auth
- device-link
- conversations
- invites
- attachments
- profile
- settings
- notifications
- sync

Suggested direction:

```text
apps/mobile/src/
  app/
    AppProviders.tsx
    AppBootstrap.tsx
    AppShell.tsx

  features/
    auth/
    deviceLink/
    conversations/
    invites/
    attachments/
    profile/
    settings/
    notifications/
    sync/

  shared/
    api/
    lib/
    storage/
    ui/
```

### Service boundaries

Move network and platform boundaries out of screen orchestration.

Examples:

- `authApi`
- `deviceLinkApi`
- `conversationApi`
- `inviteApi`
- `attachmentService`
- `pushService`
- `mailboxSyncService`

### Feature hooks

Replace broad top-level state ownership with feature-local hooks.

Examples:

- `useMagicLinkAuth()`
- `useDeviceLinkFlow()`
- `useConversationThread()`
- `useInvitePreview()`
- `useAttachmentComposer()`
- `useMailboxSync()`

## Cross-surface design-system direction

### Shared tokens

Create shared semantic tokens for:

- color roles
- text roles
- spacing scale
- radius scale
- border roles
- elevation / shadow roles
- motion timing roles
- icon size roles

Example package direction:

```text
packages/design/
  tokens/
    colors.ts
    spacing.ts
    radius.ts
    typography.ts
    motion.ts
    shadows.ts
```

### Shared UI patterns

Define product-level patterns for:

- app shell
- onboarding shell
- screen header
- status banner
- buttons
- input fields
- filter chips
- chat rows
- unread badge
- conversation header
- docked composer
- sheets / modals
- settings rows
- empty states
- avatar presentation

The goal is to share **design language and behavior**, not force one literal component implementation across every surface.

## Android-native seam strategy

Keep the main Android app in React Native, but define clean native seams for areas where Android-specific implementations are likely to matter.

Primary candidates:

- push and notification behavior
- secure key storage / Android Keystore-backed secrets
- background sync / scheduled jobs
- media and file pipeline edge cases
- share intents and deeper OS integrations

Rule of thumb:

Use native Android where it solves a real security, reliability, performance, or OS-integration problem.

## Proposed issue breakdown

## Parent epic

### Title

```text
[Architecture]: Modularize mobile app shell and establish cross-surface UI foundations
```

### Body

```markdown
Affected surface: Android, Web, Desktop (Windows/Ubuntu)

What feels wrong?
The mobile app has grown around a large top-level orchestrator, and the cross-surface UI language is still mostly implicit instead of formalized. That makes feature work riskier, slows down changes, and makes it too easy for Android, web, and desktop to drift apart in structure and presentation.

What were you trying to do?
Keep moving EmberChamber forward on Android, web, and desktop without forcing a rewrite, while making the codebase easier to extend, test, and maintain.

What happens now?
A large amount of app coordination still lives near the mobile entrypoint, including boot flow, session flow, relay access, device linking, mailbox sync, attachment handling, and other concerns. At the same time, visual patterns exist across surfaces, but they are not yet captured as shared tokens and reusable product-level UI patterns. Android also needs explicit seams for native implementations where React Native is not the strongest long-term fit.

What would feel better?
EmberChamber should keep the current product direction and stack, but formalize the architecture underneath it:
- break the mobile app into feature-owned modules with smaller responsibilities
- define shared cross-surface design tokens and core UI patterns
- preserve Android native escape hatches for security-sensitive, reliability-sensitive, and OS-integration-heavy capabilities

Goals:
- reduce coupling in the mobile app
- make feature work safer and faster
- improve testability
- keep Android, web, and desktop visually aligned without forcing one literal UI codebase
- make room for targeted Android-native capabilities without rewriting the app

Non-goals:
- not a full rewrite of mobile
- not a switch away from React Native / Expo
- not a forced single-rendering model across all platforms
- not a visual redesign for its own sake

Implementation direction:
- introduce feature boundaries for auth, device-link, conversations, invites, attachments, settings, profile, notifications, and sync
- move relay/network logic into service modules instead of keeping it inside top-level UI orchestration
- create shared design tokens for color, spacing, radius, typography, and elevation
- define product-level UI patterns for shells, cards, banners, chat rows, composer behavior, sheets, and settings rows
- establish Android-native bridge seams for areas like push behavior, secure key storage, and background sync

Child issues:
- split apps/mobile/App.tsx into feature-owned flows
- create shared cross-surface design tokens
- define cross-surface messaging and shell UI patterns
- add Android native bridge seams for platform-critical capabilities

Comparisons or references:
Well-structured multi-surface products usually share design language, interaction patterns, and domain logic without forcing every surface into the exact same UI implementation. EmberChamber should do the same: shared foundations where that helps, native/platform-specific implementations where that is the right fit.
```

## Child issue 1

### Title

```text
[Architecture]: Split apps/mobile/App.tsx into feature-owned flows
```

### Body

```markdown
Affected surface: Android

What feels wrong?
The mobile app entrypoint is carrying too many responsibilities at once. It is acting as boot loader, auth coordinator, relay client, device-link coordinator, sync controller, attachment pipeline, session manager, and UI router all in one place.

What were you trying to do?
Add features and improve the Android client without every change turning into a high-risk edit inside one large orchestrator.

What happens now?
Too much logic is centralized near the top-level app component. That makes the code harder to reason about, harder to test in isolation, and easier to break when changing flows that should be independent.

What would feel better?
The Android app should be organized by feature and responsibility instead of by one oversized orchestration file. The top-level app component should mostly compose providers, shell routing, and bootstrap decisions, while feature modules own their own state and behavior.

Initial extraction targets:
- auth
- device-link
- conversations
- invites
- attachments
- profile
- notifications
- sync
- settings

Implementation direction:
- move relay and network calls into service modules
- replace broad top-level state with feature-specific hooks
- move mailbox sync and push registration out of UI orchestration
- reduce oversized prop surfaces by introducing feature containers
- keep App.tsx focused on boot, signed-out vs signed-in routing, and main shell composition

Success criteria:
- App.tsx becomes substantially smaller and easier to read
- major flows can be tested with less top-level wiring
- feature changes touch fewer unrelated files
- state ownership is clearer
- adding new messaging or settings capabilities does not require expanding a single orchestration file further

Comparisons or references:
This follows a standard feature-module approach rather than a rewrite. The goal is better boundaries, not more abstraction for its own sake.
```

## Child issue 2

### Title

```text
[Design System]: Create shared cross-surface design tokens
```

### Body

```markdown
Affected surface: Android, Web, Desktop (Windows/Ubuntu)

What feels wrong?
EmberChamber already has the start of a recognizable UI language, but the design foundations are still mostly local to each surface instead of being defined once and reused consistently.

What were you trying to do?
Keep Android, web, and desktop aligned in visual identity and hierarchy without forcing the exact same implementation details on every platform.

What happens now?
Colors, spacing, radius, text roles, and visual hierarchy are applied in surface-specific code, but not yet formalized as shared design tokens. That increases the chance of gradual drift between clients.

What would feel better?
The product should have a shared design-token layer that defines the visual system once and lets each surface implement it naturally for its environment.

Initial token targets:
- color roles
- text roles
- spacing scale
- radius scale
- border roles
- elevation / shadow roles
- motion timing roles
- icon size roles

Implementation direction:
- create a shared package for design tokens
- use semantic token names instead of hard-coded per-surface visual values
- map tokens into React Native styles on mobile
- map tokens into CSS variables / Tailwind-compatible values on web and desktop-web surfaces
- keep token naming product-focused rather than platform-focused

Success criteria:
- core visual values are defined once
- Android, web, and desktop share the same semantic design language
- visual changes can be rolled out more consistently
- future component work has a stable foundation

Comparisons or references:
Strong multi-surface products usually share tokens and design intent even when they do not share literal component code.
```

## Child issue 3

### Title

```text
[Design System]: Define cross-surface messaging and shell UI patterns
```

### Body

```markdown
Affected surface: Android, Web, Desktop (Windows/Ubuntu)

What feels wrong?
The product already has recognizable shell and messaging patterns, but many of those patterns are still implicit instead of formally defined. That makes it easier for screens to evolve in parallel and lose consistency.

What were you trying to do?
Create a clearer product-level UI system for EmberChamber so that the active surfaces feel intentionally related, not merely similar.

What happens now?
Patterns such as chat rows, screen headers, composer layouts, status banners, cards, sheets, filters, and settings rows exist, but they are mostly encoded as local implementation details instead of reusable product patterns.

What would feel better?
EmberChamber should define a shared set of UI patterns for the major product surfaces and interaction types, while still allowing each client to implement those patterns in platform-appropriate ways.

Initial pattern targets:
- app shell
- onboarding shell
- screen header
- status banner
- primary / secondary / ghost buttons
- input field
- filter chip row
- chat row
- unread badge
- conversation header
- docked composer
- modal / bottom sheet
- settings toggle row
- empty state
- avatar presentation

Behavioral consistency targets:
- loading states
- empty states
- retry states
- destructive action treatment
- attachment entry affordances
- conversation navigation behavior
- narrow vs wide layout shell behavior

Implementation direction:
- document the patterns with semantic names and intended usage
- keep one product-level pattern vocabulary across active clients
- let each surface implement those patterns natively for its environment
- avoid forcing literal shared components where that would hurt platform quality

Success criteria:
- common product patterns are named and documented
- new screens and refactors use an explicit UI vocabulary
- cross-surface drift is reduced
- the product feels more coherent without requiring identical rendering everywhere

Comparisons or references:
The goal is consistency of product language and interaction patterns, not pixel-identical cloning across every surface.
```

## Child issue 4

### Title

```text
[Android]: Add native bridge seams for platform-critical capabilities
```

### Body

```markdown
Affected surface: Android

What feels wrong?
React Native is the right main UI approach for EmberChamber, but some Android capabilities are likely to need native implementations over time. Those seams should be designed intentionally instead of added ad hoc later.

What were you trying to do?
Keep the current Android stack while preserving the ability to add targeted native Android behavior where security, reliability, performance, or OS integration demand it.

What happens now?
The current app can move forward in React Native / Expo, but the long-term Android-native insertion points are not yet clearly defined. That can turn future platform work into reactive patching instead of deliberate architecture.

What would feel better?
The Android app should keep React Native for most UI, but formalize native escape hatches for the places where Android-specific implementations may become the better long-term path.

Initial native seam targets:
- push and notification behavior
- secure key storage / keystore-backed secrets
- background sync and scheduled work
- media and file pipeline edge cases
- share intents and deep OS integration

Implementation direction:
- define capability interfaces rather than calling native behavior directly from screen code
- keep platform-specific behavior behind service boundaries
- use native Android implementations only where they solve a real product or engineering problem
- preserve Expo / React Native velocity for the main app surface

Success criteria:
- Android-native capabilities have clear architectural seams
- future native additions do not require broad UI rewrites
- security-critical and reliability-critical work has a clean home
- the app stays primarily React Native without becoming “React Native only at all costs”

Comparisons or references:
This is not an argument for rewriting Android in Kotlin UI. It is an argument for using native Android deliberately where React Native is weakest and EmberChamber is most demanding.
```

## Suggested labels

```text
enhancement
architecture
android
design-system
mobile
foundation
```

## Suggested sequencing

1. Parent architecture epic
2. Split `App.tsx` into feature-owned flows
3. Create shared design tokens
4. Define shared UI patterns
5. Add Android-native seam interfaces

## First implementation pass

### Phase 1

- identify the current top-level responsibilities in the mobile app
- extract relay/network calls into service modules
- extract feature-local hooks for auth, device-link, and conversations
- reduce the app entrypoint to boot, routing, and shell composition

### Phase 2

- introduce shared design tokens
- migrate the most common mobile visual roles to semantic token names
- document shell, card, banner, chat row, and composer patterns

### Phase 3

- define Android-native capability interfaces
- choose one candidate seam to prove the pattern, likely push or secure storage

## Desired outcome

The mobile app becomes easier to evolve, the active surfaces become more coherent, and Android-specific hard problems get clean long-term seams without forcing a rewrite of the UI stack.
