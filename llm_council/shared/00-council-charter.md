# Council Charter

The EmberChamber review council exists to improve product quality while minimizing redundant agent work and token spend.

## Core design principles

1. Facts are gathered once and reused.
2. Reviewers are activated by path and risk, not by habit.
3. Every reviewer has a narrow scope and a clear non-scope.
4. Evidence beats vibes.
5. Reports must be concise, actionable, and merge-friendly.
6. The moderator synthesizes. Specialists do not rewrite each other.
7. The council should reduce confusion for future AI agents, not add more of it.

## Standard council flow

1. Intake receives a `review-request.yaml`.
2. `C-13 Data Collection and Evidence Packager` builds a compact evidence pack.
3. A router selects the minimum useful set of reviewers.
4. Specialists review only the evidence pack and relevant snippets.
5. `C-00 Moderator and Synthesis Director` merges findings into one prioritized plan.

## Default activation philosophy

Do not run the full council on every change.

Use the smallest correct set of reviewers based on:

- changed paths
- security impact
- release impact
- protocol impact
- product-surface impact
- repo/process impact

## Report philosophy

A good report:

- stays within scope
- flags real risks
- avoids duplicate findings
- proposes exact next actions
- tells the implementer what to test after the fix
