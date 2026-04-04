# EmberChamber Council Prompt Kit v2

This kit is a lower-token, higher-discipline review council for EmberChamber.

It is designed around the current repo reality:
- active beta runtime in `apps/relay`, `apps/web`, `apps/mobile`, `apps/desktop`, `crates/core`, `crates/relay-protocol`, and `packages/protocol`
- retained legacy paths in `apps/api`, `infra`, and `services/*`
- cross-surface risk areas around encrypted groups, attachment encryption, recovery, push maturity, and release reliability

## What changed from v1

Version 2 improves the council in four major ways:

1. Adds **C-13 Data Collection and Evidence Packager**.
2. Gives every persona harder scope boundaries to reduce overlap.
3. Adds token-budget rules and a path-based reviewer router.
4. Ships premade scripts to build an evidence pack before specialist review.

## Recommended operating model

### Step 1 — intake
Create `review-request.yaml` from `llm_council/templates/review-request.template.yaml`.

### Step 2 — evidence
Run `C-13` first for any non-trivial review.
It should produce:
- `changed-files.txt`
- `changed-files.md`
- `repo-facts.md`
- `evidence-pack.md`
- `recommended-reviewers.txt`

### Step 3 — minimal reviewer activation
Only run the reviewers suggested by routing and actual risk.

### Step 4 — specialist reports
Each specialist writes a Markdown report with YAML frontmatter using `templates/report-template.md`.

### Step 5 — synthesis
`C-00` merges the evidence pack and specialist reports into one decision.

All generated council artifacts land in the repo root and are gitignored by default:
- `review-request.yaml`
- `changed-files.txt`
- `changed-files.md`
- `repo-facts.md`
- `evidence-pack.md`
- `recommended-reviewers.txt`

## Directory layout

- `personas/`: one Markdown prompt per persona
- `shared/`: shared rules and grounding
- `templates/`: report and intake templates
- `scripts/`: premade evidence-collection and routing scripts
- `persona-zips/`: one self-contained zip per persona

## Recommended default reviewer sets

### Web/UI change
- `C-13`
- `C-02`
- `C-03`
- `C-11`
- `C-00`

### Mobile change
- `C-13`
- `C-02`
- `C-04`
- `C-11`
- `C-00`

### Relay/backend change
- `C-13`
- `C-06`
- `C-09`
- `C-11`
- `C-00`

### Protocol/auth/crypto change
- `C-13`
- `C-07`
- `C-08` if `crates/core` is touched
- `C-09`
- `C-11`
- `C-00`

### Repo/process/tooling change
- `C-13`
- `C-12`
- `C-11` if CI or release is touched
- `C-00`

## Token-saving guidance

The council becomes expensive when every reviewer re-discovers the same context. Avoid that.

Use this pattern:
- one evidence pack
- targeted snippets
- the smallest correct reviewer set
- concise specialist reports
- one synthesis pass

Do not feed every reviewer the entire repo or every report from every other reviewer.

## Best first run

1. Copy `llm_council/templates/review-request.template.yaml` to `review-request.yaml` and fill it out
2. For the current dirty worktree, run `npm run council:review -- HEAD WORKTREE "current-worktree"`
3. For a branch or PR range, run `npm run council:review -- main HEAD "manual-review"`
4. Open `recommended-reviewers.txt`
5. Run only those persona prompts plus `shared/*`, the evidence pack, and relevant snippets
6. Finish with `C-00`

If you want to bypass `npm`, the direct entrypoint is `bash llm_council/scripts/orchestrate_review.sh`.

## Notes

This kit is intentionally opinionated.
It prioritizes:
- product-fit review for the actual EmberChamber beta
- security/privacy discipline
- AI-coder maintainability
- lower token burn through shared evidence and path routing
