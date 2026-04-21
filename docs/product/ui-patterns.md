# UI Patterns

## Purpose

Define the shared EmberChamber product vocabulary for shells, messaging surfaces, and semantic design tokens so Android, web, and desktop can evolve without drifting into separate UI languages.

## Token Foundation

Canonical semantic tokens live in `packages/ui/src/tokens.ts`.

Current role groups:

- color roles
- text roles
- border roles
- elevation roles
- motion roles
- icon sizes
- spacing scale
- radius scale

Surface guidance:

- mobile maps the semantic roles in `apps/mobile/src/styles.ts`
- web and desktop-web should map the same roles into CSS variables or Tailwind theme keys instead of reintroducing raw palette values
- use semantic names like `brandPrimary`, `panel`, `textSecondary`, and `warningBackground` instead of surface-local color aliases

## Shell Patterns

### Onboarding shell

- lead with one primary action and one fallback path
- keep the hero compact: brand mark, short title, one explanatory paragraph
- show trust-boundary copy below the primary form instead of mixing policy language into every field
- onboarding status belongs in inline status cards, not banners detached from the current step

### App shell

- preserve a clear split between navigation chrome and the active conversation or settings surface
- narrow layouts should prioritize the active conversation over persistent tab chrome when keyboard space is constrained
- restoring cached state should use a lightweight empty/loading state, not a full onboarding shell

### Screen header

- title first, metadata second
- actions stay on the same row only when they do not compete with the title
- destructive actions should never be the most visually prominent control in the header

## Messaging Patterns

### Status banner

- use semantic tones: `info`, `success`, `warning`, `error`
- tie each status to the current user action or current sync state
- success copy should confirm the next visible outcome, not just the completed API call

### Chat row

- lead with circle title and unread state
- latest-message preview is secondary and should truncate before crowding metadata
- pinned, muted, and archived states should read as modifiers layered on the same base row pattern

### Conversation header

- keep room identity, privacy mode, and member affordances together
- history-mode differences should appear as supporting labels, not separate layouts

### Docked composer

- attachments, location, and send stay attached to the text-entry surface
- editing state should appear inline in the composer, with an explicit cancel path
- when vertical space collapses on mobile, preserve composer access before preserving non-essential chrome

### Message attachment handling

- attachment failures should degrade to a recoverable status instead of removing the message row
- encrypted and relay-hosted attachments should share the same visual treatment unless the difference changes user action

## Utility Patterns

### Buttons

- primary buttons carry the next irreversible or forward-moving action
- secondary buttons support review, preview, or alternate flow entry
- ghost buttons are for low-risk navigation or inline utilities

### Input field

- label above input, helper text below
- validation errors replace or follow helper text in the same block
- placeholder copy should hint at format, not policy

### Filter chips

- use for mutually exclusive list scopes such as unread, pinned, or archived
- chips should change list scope immediately without extra submit actions

### Sheet or modal

- use sheets for short action menus and focused pickers
- use full-screen routes when the task needs long-form editing or dense context

### Settings row

- present one setting decision per row
- supporting explanation belongs directly under the row label, not in a detached paragraph
- toggles are for immediate local preference changes, not for destructive account actions

### Empty state

- explain why the surface is empty
- give one obvious next step
- avoid marketing copy in signed-in empty states

### Avatar presentation

- keep avatar treatment consistent between chat list, conversation header, members list, and settings
- fallback initials should use the same radius and emphasis rules as image avatars

## Behavioral Consistency

- loading states should keep layout shape stable instead of replacing the whole screen with a spinner
- retry states should preserve cached local data whenever available
- destructive actions need explicit confirmation language
- attachment entry affordances should stay in the same location across mobile, web, and desktop
- conversation navigation should preserve the last active thread when the surface supports local restoration
- narrow and wide layouts should feel like the same product, not separate feature sets

## Implementation Notes

- add or update semantic tokens in `packages/ui/src/tokens.ts` first
- map those tokens into surface styles instead of introducing new raw values
- if a platform needs a unique implementation, keep the behavior and naming aligned with these patterns even when the literal component differs
