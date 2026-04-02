# Documentation Index

## Active Beta Docs

- [`architecture.md`](/home/jason/gh/PrivateMesh/docs/architecture.md): current runtime map, storage planes, client-surface status, and migration gaps
- [`launch-targets.md`](/home/jason/gh/PrivateMesh/docs/launch-targets.md): what the repo can actually build and distribute today
- [`ubuntu-install-and-test.md`](/home/jason/gh/PrivateMesh/docs/ubuntu-install-and-test.md): Ubuntu install, local build, and desktop smoke-test guide
- [`roadmap.md`](/home/jason/gh/PrivateMesh/docs/roadmap.md): agreed product contract, roadmap phases, scope boundaries, and acceptance criteria
- [`api/relay-http.md`](/home/jason/gh/PrivateMesh/docs/api/relay-http.md): active Cloudflare relay endpoint map
- [`security/threat-model.md`](/home/jason/gh/PrivateMesh/docs/security/threat-model.md): current-vs-target security posture and claim discipline
- [`product/personas.md`](/home/jason/gh/PrivateMesh/docs/product/personas.md): current beta personas and flows
- [`operator-playbook.md`](/home/jason/gh/PrivateMesh/docs/operator-playbook.md): operational guidance aligned with current tooling

## Transitional Docs

- [`architecture/overview.md`](/home/jason/gh/PrivateMesh/docs/architecture/overview.md): short redirect to the active architecture set

## Work Plans

- [`plansforwork/2026-04-02-roadmap-phase0-phase1-implementation-plan.md`](/home/jason/gh/PrivateMesh/docs/plansforwork/2026-04-02-roadmap-phase0-phase1-implementation-plan.md): execution plan for the roadmap phase 0 and phase 1 repo pass
- [`plansforwork/2026-04-02-roadmap-phase2-implementation-plan.md`](/home/jason/gh/PrivateMesh/docs/plansforwork/2026-04-02-roadmap-phase2-implementation-plan.md): execution plan for the first roadmap phase 2 relay and web slice
- [`plansforwork/2026-04-02-ubuntu-copy-polish-plan.md`](/home/jason/gh/PrivateMesh/docs/plansforwork/2026-04-02-ubuntu-copy-polish-plan.md): Ubuntu copy, docs, and testing alignment plan
- [`plansforwork/relay-hardening-and-relay-first-migration.md`](/home/jason/gh/PrivateMesh/docs/plansforwork/relay-hardening-and-relay-first-migration.md): relay hardening and relay-first migration program plan

## Legacy Prototype Docs

- [`api/openapi.yaml`](/home/jason/gh/PrivateMesh/docs/api/openapi.yaml): legacy Express/Postgres prototype API spec for `apps/api`

## Maintenance Notes

- Prefer `current implementation` and `target direction` wording over flat capability claims.
- Keep legacy Express/Postgres material explicitly labeled as legacy.
- If a client surface is hybrid, name both backends instead of flattening them into one story. If it is relay-first, say that directly.
