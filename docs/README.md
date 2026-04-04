# Documentation Index

## Active Beta Docs

- [`../CONTRIBUTING.md`](../CONTRIBUTING.md): human contributor quickstart, active paths, and verification defaults
- [`../repo-map.yaml`](../repo-map.yaml): machine-readable active-versus-legacy path map, ownership, risk, and change-routing metadata
- [`../llm_council/README.md`](../llm_council/README.md): repo-specific AI review council, routing, and evidence-pack workflow
- [`../scripts/check-repo-contracts.mjs`](../scripts/check-repo-contracts.mjs): repo contract and doc/runtime drift checker
- [`architecture.md`](architecture.md): current runtime map, storage planes, client-surface status, and migration gaps
- [`launch-targets.md`](launch-targets.md): what the repo can actually build and distribute today
- [`ubuntu-install-and-test.md`](ubuntu-install-and-test.md): Ubuntu install, local build, and desktop smoke-test guide
- [`roadmap.md`](roadmap.md): agreed product contract, roadmap phases, scope boundaries, and acceptance criteria
- [`api/relay-http.md`](api/relay-http.md): active Cloudflare relay endpoint map
- [`security/threat-model.md`](security/threat-model.md): current-vs-target security posture and claim discipline
- [`product/personas.md`](product/personas.md): current beta personas and flows
- [`operator-playbook.md`](operator-playbook.md): operational guidance aligned with current tooling

## Transitional Docs

- [`architecture/overview.md`](architecture/overview.md): short redirect to the active architecture set

## Work Plans

- [`plansforwork/2026-04-02-roadmap-phase0-phase1-implementation-plan.md`](plansforwork/2026-04-02-roadmap-phase0-phase1-implementation-plan.md): execution plan for the roadmap phase 0 and phase 1 repo pass
- [`plansforwork/2026-04-02-roadmap-phase2-implementation-plan.md`](plansforwork/2026-04-02-roadmap-phase2-implementation-plan.md): execution plan for the first roadmap phase 2 relay and web slice
- [`plansforwork/2026-04-02-ubuntu-copy-polish-plan.md`](plansforwork/2026-04-02-ubuntu-copy-polish-plan.md): Ubuntu copy, docs, and testing alignment plan
- [`plansforwork/relay-hardening-and-relay-first-migration.md`](plansforwork/relay-hardening-and-relay-first-migration.md): relay hardening and relay-first migration program plan

- [`plansforwork/2026-04-04-ui-surface-punch-list.md`](plansforwork/2026-04-04-ui-surface-punch-list.md): repo-ready UI punch list grouped by surface, component, and priority

## Legacy Prototype Docs

- [`api/openapi.yaml`](api/openapi.yaml): legacy Express/Postgres prototype API spec for `apps/api`

## Maintenance Notes

- Prefer `current implementation` and `target direction` wording over flat capability claims.
- Keep legacy Express/Postgres material explicitly labeled as legacy.
- If a client surface is hybrid, name both backends instead of flattening them into one story. If it is relay-first, say that directly.
