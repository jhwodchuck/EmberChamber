# Frontmatter Schema

Use the following keys in outputs as applicable.

```yaml
---
report_type: persona_review
persona_id: C-03
persona_name: Web Client Reviewer
review_target: <feature, PR, issue, branch, or commit range>
repo: jhwodchuck/EmberChamber
base_ref: <base ref>
head_ref: <head ref>
commit_range: <base>..<head>
generated_at: <ISO-8601 UTC timestamp>
status: complete
scope:
  - <path or surface>
changed_paths:
  - <path>
evidence_inputs:
  - review-request.yaml
  - evidence-pack.md
recommended_followups:
  - C-09
severity_summary:
  critical: 0
  high: 1
  medium: 2
  low: 1
  note: 1
token_budget_tier: normal
---
```

For `evidence_pack`, set:

- `report_type: evidence_pack`
- `persona_id: C-13`

For `moderator_synthesis`, set:

- `report_type: moderator_synthesis`
- `persona_id: C-00`

```

```
