#!/usr/bin/env python3
from __future__ import annotations
import sys
from pathlib import Path

def route(paths: list[str], risk_flags: dict[str, bool] | None = None) -> list[str]:
    risk_flags = risk_flags or {}
    reviewers = {"C-00", "C-13"}

    def touched(prefix: str) -> bool:
        return any(p.startswith(prefix) for p in paths)

    def touched_path(path: str) -> bool:
        return path in paths

    def touched_fragment(fragment: str) -> bool:
        return any(fragment in p for p in paths)

    if touched("apps/web/"):
        reviewers.update({"C-02", "C-03", "C-11"})
    if touched("apps/mobile/"):
        reviewers.update({"C-02", "C-04", "C-11"})
    if touched("apps/desktop/"):
        reviewers.update({"C-05", "C-11"})
    if touched("apps/relay/"):
        reviewers.update({"C-06", "C-09", "C-11"})
    if touched("packages/protocol/") or touched("crates/relay-protocol/"):
        reviewers.update({"C-07", "C-09"})
    if touched("crates/core/"):
        reviewers.update({"C-08", "C-09"})
    if touched("apps/api/") or touched("services/") or touched("infra/"):
        reviewers.update({"C-12"})
    if touched(".github/workflows/"):
        reviewers.update({"C-11", "C-12"})
    if touched_path("README.md") or touched_path("AGENTS.md") or touched("docs/"):
        reviewers.update({"C-12"})

    if touched("apps/web/src/app/start") or touched("apps/web/src/app/login") or touched("apps/web/src/app/register") or touched("apps/web/src/components/bootstrap-auth-form") or touched("apps/web/src/components/start-here-guide") or touched_fragment("/invite/"):
        reviewers.update({"C-01", "C-02"})

    if touched("apps/web/src/app/page.tsx") or touched("apps/web/src/app/download") or touched("apps/web/src/lib/site") or touched("docs/launch-targets") or touched("docs/roadmap") or touched("docs/product/") or touched_path("README.md"):
        reviewers.update({"C-01"})

    if touched("docs/security/") or touched("apps/web/src/app/privacy") or touched("apps/web/src/app/trust-and-safety") or touched("apps/web/src/app/support") or touched("docs/operator-playbook") or touched_fragment("privacy-boundary"):
        reviewers.update({"C-09"})

    if touched("docs/operator-playbook") or touched("apps/web/src/app/trust-and-safety") or touched("apps/web/src/app/support") or touched_fragment("report") or touched_fragment("block") or touched_fragment("safety"):
        reviewers.update({"C-10"})

    if risk_flags.get("auth") or risk_flags.get("crypto") or risk_flags.get("protocol") or risk_flags.get("storage"):
        reviewers.update({"C-09"})
    if risk_flags.get("release") or risk_flags.get("app_store"):
        reviewers.update({"C-11"})
    if risk_flags.get("ui_flow"):
        reviewers.update({"C-02"})
    if risk_flags.get("legacy_paths"):
        reviewers.update({"C-12"})

    return sorted(reviewers)

if __name__ == "__main__":
    if len(sys.argv) > 1 and Path(sys.argv[1]).exists():
        paths = [line.strip() for line in Path(sys.argv[1]).read_text().splitlines() if line.strip()]
        print("\n".join(route(paths)))
    else:
        print("Usage: route_reviewers.py <changed-files.txt>", file=sys.stderr)
        sys.exit(1)
