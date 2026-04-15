# Output Format

All council outputs must be Markdown files with YAML frontmatter.

The default tone is findings-first. Do not pad the report with praise or a walkthrough of the diff.

## Output file types

- `persona_review`: specialist review
- `evidence_pack`: data collection packet
- `moderator_synthesis`: merged council result
- `review_request`: intake file for orchestration

## Required Markdown structure for `persona_review`

1. Executive summary
2. Scope observed
3. Findings table
4. Detailed findings
5. Open questions or residual risks
6. Routed notes for other personas
7. Recommended next actions
8. Verification after fix

If there are no material findings, state `No material findings.` in the executive summary and leave the findings table empty except for a `none` row.

## Required Markdown structure for `evidence_pack`

1. Executive summary
2. Review target and intent
3. Changed paths grouped by domain
4. Architecture and runtime impact
5. Test/build/release signals
6. Security and privacy flags
7. Legacy path flags
8. Suggested reviewer set
9. Snippet appendix

## Required Markdown structure for `moderator_synthesis`

1. Overall call
2. Priority-ranked findings
3. Conflicts resolved
4. Consolidated action plan
5. Review coverage map
6. Deferred items
7. Final ship/no-ship or merge guidance

## Severity vocabulary

Use only:

- `critical`
- `high`
- `medium`
- `low`
- `note`

## Actionability requirement

Every `critical`, `high`, or `medium` finding must include:

- why it matters
- exact evidence
- concrete fix
- owner area
- what to test afterward

## Ordering requirement

- Order findings from highest severity to lowest severity.
- Put the strongest, most defensible finding first.
- Do not include filler `note` findings just to reach a quota.
