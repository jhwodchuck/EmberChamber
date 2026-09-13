# Documentation Index

## Active Beta Docs

- [`../CONTRIBUTING.md`](../CONTRIBUTING.md): human contributor quickstart, active paths, and verification defaults
- [`../repo-map.yaml`](../repo-map.yaml): machine-readable active-versus-legacy path map, ownership, risk, and change-routing metadata
- [`../llm_council/README.md`](../llm_council/README.md): repo-specific AI review council, routing, and evidence-pack workflow
- [`../llm_council/COUNCIL-CHARTER.md`](../llm_council/COUNCIL-CHARTER.md): operating charter for the LLM council review roles
- [`../scripts/check-repo-contracts.mjs`](../scripts/check-repo-contracts.mjs): repo contract and doc/runtime drift checker
- [`architecture.md`](architecture.md): current runtime map, storage planes, client-surface status, and migration gaps
- [`launch-targets.md`](launch-targets.md): what the repo can actually build and distribute today
- [`ubuntu-install-and-test.md`](ubuntu-install-and-test.md): Ubuntu install, local build, and desktop smoke-test guide
- [`release-checklist.md`](release-checklist.md): pre-release gate — automated commands, per-surface smoke tests, and GitHub Release steps
- [`roadmap.md`](roadmap.md): agreed product contract, roadmap phases, scope boundaries, and acceptance criteria
- [`api/relay-http.md`](api/relay-http.md): active Cloudflare relay endpoint map
- [`security/threat-model.md`](security/threat-model.md): current-vs-target security posture and claim discipline
- [`product/personas.md`](product/personas.md): current beta personas and flows
- [`product/ui-patterns.md`](product/ui-patterns.md): shared product-level shell, messaging, and design-token vocabulary for active clients
- [`product/market-research.md`](product/market-research.md): market research on messaging subsystem architecture and desktop pane layouts
- [`operator-playbook.md`](operator-playbook.md): operational guidance aligned with current tooling

## Transitional Docs

- [`architecture/overview.md`](architecture/overview.md): short redirect to the active architecture set

## Work Plans

- [`plansforwork/2026-07-18-strategic-plan-1mo-3mo-1yr-5yr.md`](plansforwork/2026-07-18-strategic-plan-1mo-3mo-1yr-5yr.md): product strategy (1 month / 3 months / 1 year / 5 years) plus the consolidated outstanding engineering backlog; supersedes the retired relay-hardening, polish, modularization, and phase-2 plan docs, whose completed work is recorded in `roadmap.md`

## Maintenance Notes

- Prefer `current implementation` and `target direction` wording over flat capability claims.
- Keep legacy Express/Postgres material explicitly labeled as legacy.
- If a client surface is hybrid, name both backends instead of flattening them into one story. If it is relay-first, say that directly.
