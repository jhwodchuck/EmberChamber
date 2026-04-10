# Token Budget Rules

The council is designed to be cheap by default.

## Budget rules

1. Never send the whole repo to every reviewer.
2. Run `C-13` first whenever there is enough complexity to justify it.
3. Activate only reviewers whose scope matches changed paths or major risks.
4. Cap routine specialist reviews at 3-5 findings.
5. Cap routed notes at 3 items.
6. Reuse the same evidence pack across specialists.
7. Prefer snippets and summaries to large file dumps.
8. Prefer path-level routing to broad open-ended review.

## Default budget tiers

### Tiny change

Examples: text tweak, single small UI fix, simple doc update

- reviewers: 1 specialist + optional moderator
- evidence pack: optional micro pack
- target specialist output: <= 500 words

### Normal feature or refactor

Examples: multi-file feature, UI flow change, relay change without protocol break

- reviewers: 2 to 4 specialists + moderator
- evidence pack: required
- target specialist output: <= 900 words

### High-risk change

Examples: auth, crypto, protocol, storage, release automation

- reviewers: 4 to 6 specialists + moderator
- evidence pack: required
- target specialist output: <= 1200 words

## Anti-bloat rules

Do not:

- restate the evidence pack
- explain repo history at length
- give tutorials unless requested
- list every minor nit
- produce duplicated “consider testing” filler
