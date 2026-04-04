# Review Workflow

## Phase 1: intake
Read `review-request.yaml`.
Classify the change by:

- active runtime surface
- product flow
- likely risk class: auth, storage, protocol, privacy claim, onboarding, release, or legacy drift

## Phase 2: evidence
Use the `C-13` evidence pack if available. If not available and the task is non-trivial, request or create one.
Then inspect the changed files plus the nearest callers, tests, and docs needed to validate your concerns.

## Phase 3: scoped review
Review only the areas relevant to your persona.
Answer your persona's must-answer questions before drafting findings.
Try to falsify your own concern before reporting it.

## Phase 4: report
Produce a Markdown report using the shared template and frontmatter schema.
Lead with findings, not compliments or a restatement of the diff.

## Phase 5: synthesis
If you are not `C-00`, stop after your own report. Do not synthesize the whole council.

## Routing notes
Use routing notes only for:
- clear handoff needs
- major risks outside your scope
- cases where another persona must validate a fix
