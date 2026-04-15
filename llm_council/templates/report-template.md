---
report_type: persona_review
persona_id: C-XX
persona_name: <Persona Name>
review_target: <feature, PR, issue, branch, or commit range>
repo: jhwodchuck/EmberChamber
base_ref: <base ref>
head_ref: <head ref>
commit_range: <base>..<head>
generated_at: <ISO-8601 UTC timestamp>
status: complete
scope:
  - <surface or path>
changed_paths:
  - <path>
evidence_inputs:
  - review-request.yaml
  - evidence-pack.md
recommended_followups:
  - <optional reviewer ids>
severity_summary:
  critical: 0
  high: 0
  medium: 0
  low: 0
  note: 0
token_budget_tier: normal
---

# Executive summary

## Overall call

<one short paragraph>

## Scope observed

- <what you reviewed>
- <what you did not review>

# Findings table

| ID      | Severity | Title   | Why it matters | Owner area     |
| ------- | -------- | ------- | -------------- | -------------- |
| C-XX-01 | medium   | <title> | <short impact> | <path or team> |

If there are no material findings, use:

| ID   | Severity | Title                | Why it matters                                    | Owner area |
| ---- | -------- | -------------------- | ------------------------------------------------- | ---------- |
| none | note     | No material findings | No concrete defect found in this persona's scope. | n/a        |

# Detailed findings

## C-XX-01 — <title>

**Severity:** medium  
**Evidence:** <paths, snippets, or evidence-pack references>  
**Why it matters:** <specific impact>  
**Concrete fix:** <exact next action>  
**What to test after fix:** <focused verification>

# Open questions or residual risks

- <question or `none`>

# Routed notes for other personas

- `<persona id>`: <short routed note or `none`>

# Recommended next actions

1. <highest-value next action>
2. <second action>
3. <third action>

# Verification after fix

- <targeted verification command or scenario>
- <targeted verification command or scenario>
