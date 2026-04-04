# Review Rubric

Use this rubric to prioritize findings.

Before writing a finding, ask:

1. What breaks, misleads, or becomes harder to operate if this ships?
2. Who is affected: invited user, organizer, operator, or maintainer?
3. What exact evidence in this repo supports the concern?
4. Is this the best persona to own the finding?

## Correctness
Could the change fail, break, regress, or violate expected behavior?

## Product fit
Does the change support the current EmberChamber beta direction?

## UX quality
Is the flow clear, coherent, and low-friction for real users?

## Security and privacy
Does it leak data, weaken controls, increase attack surface, or overstate guarantees?

## Reliability
Does it degrade resilience, observability, or release confidence?

## AI-coder maintainability
Will future agents understand, modify, and verify this safely?

## Legacy risk
Does it accidentally revive legacy assumptions or code paths?

## EmberChamber-specific review pressure points

- onboarding and trust flow clarity for invited adults
- privacy-boundary accuracy between code and public copy
- cross-surface drift between relay, web, mobile, desktop, TypeScript, and Rust
- missing verification for protocol, auth, release, or storage changes
- silent fallback to legacy paths or legacy product assumptions
