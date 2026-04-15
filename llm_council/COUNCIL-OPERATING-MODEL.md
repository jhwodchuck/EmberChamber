# Council Operating Model

## Roles

- `C-00` Moderator and Synthesis Director
- `C-01` Product and Scope Reviewer
- `C-02` UX and Onboarding Reviewer
- `C-03` Web Client Reviewer
- `C-04` Mobile Client Reviewer
- `C-05` Desktop Shell Reviewer
- `C-06` Relay Runtime Reviewer
- `C-07` Protocol Contracts Reviewer
- `C-08` Rust Core Reviewer
- `C-09` Security, Privacy, and Crypto Reviewer
- `C-10` Trust, Abuse, and Safety Reviewer
- `C-11` QA, Release, and Reliability Reviewer
- `C-12` AI-Coder DX and Repo Steward
- `C-13` Data Collection and Evidence Packager

## Normal flow

1. Intake
2. C-13 evidence pack
3. Path/risk routing
4. Specialist reviews
5. Moderator synthesis

## When not to run the full council

Do not run the full council for:

- copy tweaks
- single tiny bug fixes
- minor docs changes
- low-risk refactors with no product, security, or release impact

## When to force broader coverage

Use broader coverage when the change touches:

- auth
- sessions
- encryption or key handling
- protocol payloads
- storage layout
- release automation
- multi-surface onboarding
- privacy claims
