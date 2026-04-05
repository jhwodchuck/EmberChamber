# Self-serve invite validation and magic-link resend

Date: 2026-04-05

## Problem

The current support page routes three common onboarding failures through manual email:

- expired or over-used invite codes
- missing magic-link emails
- login problems after registration

The product is invite-gated and email-bootstrap-based, which means these are the most common support requests in the early beta. Routing them all through a 1–2 business day manual email loop adds real friction and support cost.

## Goal

Add a minimal self-serve flow that handles the three most frequent cases without any engineering intervention or support email.

## Flows to build

### 1. Invite code check

User enters their invite code. The relay looks it up and returns:

- valid and unused: show confirmation, proceed to register
- valid but exhausted: show "this invite has no uses remaining — ask whoever shared it to send a fresh one"
- valid but expired: show "this invite expired on [date] — ask whoever shared it for a new one"
- not found: show "this code was not found — check for typos or ask for a new one"

This replaces the current answer "ask whoever sent yours to confirm it's still active, then email us."

### 2. Magic-link resend

User enters their email. If the email matches a registered account, the relay queues a new magic-link email. Response is always the same generic message whether the account exists or not (prevents account enumeration).

This replaces the current answer "check your spam folder, if it's not there email support and we'll resend manually."

### 3. Account / device bootstrap state

User with an existing session can check:

- which devices are linked to their account
- when each session was last active
- whether their device bundle is registered

This is already partially covered by the session listing in settings, but a dedicated support-facing path makes recovery more legible.

## Relay changes

### Invite check endpoint

```
POST /v1/invite/check
Body: { code: string }
Response: { status: "valid" | "exhausted" | "expired" | "not_found", expiresAt?: string, usesRemaining?: number }
```

This endpoint does not consume the invite, it only reads the current state. Rate-limit aggressively.

### Magic-link resend endpoint

This is a variant of the existing magic-link flow. The relay already sends magic-link emails — the change is exposing a self-serve resend path that does not require the invite token or registration form.

```
POST /v1/auth/resend-magic-link
Body: { email: string }
Response: { sent: boolean }  // always true regardless of whether the account exists
```

Rate-limit per IP and per email.

## Web changes

### New route: `/support/invite`

Simple form: one text input for invite code, a "Check invite" button, and a clear status message. No auth required.

### New route: `/support/resend`

Simple form: one email input, a "Resend sign-in link" button, and a confirmation message. No auth required.

### Support page update

Replace the current quickAnswers for invite and magic-link problems with direct links to `/support/invite` and `/support/resend` instead of routing to email.

## Mobile changes

Link to the web self-serve pages from the onboarding error states, or mirror the invite check flow natively in the onboarding screen if that is a better UX.

## Product constraints

- Do not expose account existence through error messages (generic responses for resend)
- Rate-limit all unauthenticated self-serve endpoints
- Keep the relay-side invite model read-only for this check — do not allow self-serve invite extension or reactivation

## Verification

- relay: `npm run build --workspace=apps/relay` and `npm test --workspace=apps/relay`
- web: `npm run lint --workspace=apps/web` and `npm run build --workspace=apps/web`
