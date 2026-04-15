---
report_type: evidence_pack
persona_id: C-13
persona_name: Data Collection and Evidence Packager
review_target: <feature, PR, issue, branch, or commit range>
repo: jhwodchuck/EmberChamber
base_ref: <base ref>
head_ref: <head ref>
commit_range: <base>..<head>
generated_at: <ISO-8601 UTC timestamp>
status: complete
scope:
  - repo-intake
changed_paths:
  - <path>
evidence_inputs:
  - review-request.yaml
recommended_followups:
  - C-00
severity_summary:
  critical: 0
  high: 0
  medium: 0
  low: 0
  note: 0
token_budget_tier: normal
---

# Executive summary

<short summary of the change and likely review needs>

# Review target and intent

- **Request type:** <feature / refactor / bugfix / release / audit>
- **Stated goal:** <goal>
- **Suspected risk level:** <low / medium / high>

# Changed paths grouped by domain

## Relay

- `apps/relay/...`

## Web

- `apps/web/...`

## Mobile

- `apps/mobile/...`

## Desktop

- `apps/desktop/...`

## Protocol and shared contracts

- `packages/protocol/...`
- `crates/relay-protocol/...`

## Rust core

- `crates/core/...`

## Legacy

- `apps/api/...`
- `services/...`

# Architecture and runtime impact

- <impacted runtime surfaces>
- <auth/session/protocol/storage consequences>
- <legacy path implications>

# Test, build, and release signals

- <tests run or missing>
- <CI workflows touched>
- <release surface touched>

# Security and privacy flags

- <auth, crypto, metadata, storage, logs, attachments, abuse, recovery>

# Suggested reviewer set

- `C-00` because <why>
- `C-XX` because <why>

# Snippet appendix

## Snippet 1

```text
<relevant snippet>
```
