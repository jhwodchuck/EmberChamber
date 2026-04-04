# Routing Matrix

## Path-based routing

| Changed path or risk | Recommended reviewers |
| --- | --- |
| `apps/web/**` | `C-13`, `C-02`, `C-03`, `C-11`, `C-00` |
| `apps/mobile/**` | `C-13`, `C-02`, `C-04`, `C-11`, `C-00` |
| `apps/desktop/**` | `C-13`, `C-05`, `C-11`, `C-00` |
| `apps/relay/**` | `C-13`, `C-06`, `C-09`, `C-11`, `C-00` |
| `packages/protocol/**` | `C-13`, `C-07`, `C-09`, `C-11`, `C-00` |
| `crates/relay-protocol/**` | `C-13`, `C-07`, `C-09`, `C-11`, `C-00` |
| `crates/core/**` | `C-13`, `C-08`, `C-09`, `C-11`, `C-00` |
| `AGENTS.md`, `README.md`, `docs/**` | `C-13`, `C-12`, optional `C-01`, `C-00` |
| `.github/workflows/**` | `C-13`, `C-11`, `C-12`, `C-00` |
| `apps/api/**`, `infra/**`, `services/**` | `C-13`, `C-12`, plus the relevant domain reviewer, `C-00` |

## Risk-based routing overlays

| Risk flag | Add reviewers |
| --- | --- |
| auth | `C-09` |
| crypto | `C-09` |
| protocol | `C-07`, `C-09` |
| storage | `C-06` and/or `C-08`, plus `C-09` |
| release | `C-11` |
| ui_flow | `C-02` |
| legacy_paths | `C-12` |
| app_store | `C-11` |

## Optional reviewers

- `C-01` when product direction or scope may drift
- `C-10` when invite abuse, blocking, reporting, or safety boundary language changes
