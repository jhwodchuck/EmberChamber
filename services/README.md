# Legacy Rust Services

These crates are archived legacy scaffolds from the older Rust service architecture.

They are intentionally not part of the root Cargo workspace used for the active beta runtime.

Keep them only for reference or explicit legacy maintenance:

- `control-api`
- `realtime-gateway`
- `relay-gateway`
- `media-worker`
- `push-worker`
- `directory-ca`

If you need to inspect one directly, use an explicit manifest path such as:

```bash
cargo check --manifest-path services/control-api/Cargo.toml
```
