# Evidence Pack Spec

The evidence pack is the single most important token-saving artifact in this system.

## Producer

`C-13 Data Collection and Evidence Packager`

## Consumer

All specialist reviewers and the moderator

## Required goals

1. Summarize the review target clearly.
2. Group changed paths by domain.
3. Identify active-runtime and legacy-path impact.
4. Flag likely auth, crypto, protocol, storage, release, and UI-flow risk.
5. Include only the most relevant diff snippets.
6. Recommend the smallest useful reviewer set.

## Good evidence pack characteristics

- short enough to be reused by many reviewers
- specific enough that reviewers do not need to rediscover context
- neutral in tone
- factual rather than verdict-heavy
- explicit about uncertainty

## Recommended contents

- YAML frontmatter
- executive summary
- review target and request type
- changed paths grouped by domain
- likely impacted surfaces
- workflow/release impact
- security/privacy flags
- legacy path flags
- suggested reviewer set
- snippet appendix

## What not to include

- full-file dumps
- giant logs unless necessary
- broad product opinions
- final ship/no-ship decisions
