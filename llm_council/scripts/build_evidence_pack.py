#!/usr/bin/env python3
from __future__ import annotations
import argparse
import datetime as dt
from pathlib import Path
from collections import defaultdict
import subprocess

DOMAINS = [
    ("apps/relay/", "Relay"),
    ("apps/web/", "Web"),
    ("apps/mobile/", "Mobile"),
    ("apps/desktop/", "Desktop"),
    ("packages/protocol/", "Protocol and shared contracts"),
    ("crates/relay-protocol/", "Protocol and shared contracts"),
    ("crates/core/", "Rust core"),
    ("apps/api/", "Legacy"),
    ("services/", "Legacy"),
    ("infra/", "Legacy"),
    (".github/workflows/", "Release and CI"),
    ("docs/", "Documentation"),
]

def group_paths(paths: list[str]) -> dict[str, list[str]]:
    grouped: dict[str, list[str]] = defaultdict(list)
    for p in paths:
        matched = False
        for prefix, name in DOMAINS:
            if p.startswith(prefix):
                grouped[name].append(p)
                matched = True
                break
        if not matched:
            grouped["Other"].append(p)
    return grouped

def run_diff(command: list[str]) -> str:
    result = subprocess.run(
        command,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )
    if result.returncode not in (0, 1):
        return ""
    return result.stdout.strip()

def is_untracked(path: str) -> bool:
    result = subprocess.run(
        ["git", "ls-files", "--others", "--exclude-standard", "--", path],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )
    return bool(result.stdout.strip())

def get_diff(base_ref: str, head_ref: str, path: str) -> str:
    if head_ref == "WORKTREE":
        if is_untracked(path):
            return run_diff(["git", "diff", "--no-index", "--unified=3", "/dev/null", path])
        return run_diff(["git", "diff", "--unified=3", base_ref, "--", path])
    return run_diff(["git", "diff", "--unified=3", base_ref, head_ref, "--", path])

def get_snippets(base_ref: str, head_ref: str, paths: list[str], limit: int = 8) -> list[tuple[str, str]]:
    snippets = []
    for path in paths[:limit]:
        diff = get_diff(base_ref, head_ref, path)
        if diff:
            snippets.append((path, diff[:3000]))
    return snippets

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--review-target", required=True)
    ap.add_argument("--base-ref", default="main")
    ap.add_argument("--head-ref", default="HEAD")
    ap.add_argument("--changed-files", default="changed-files.txt")
    ap.add_argument("--out", default="evidence-pack.md")
    args = ap.parse_args()

    changed = Path(args.changed_files)
    paths = [line.strip() for line in changed.read_text().splitlines() if line.strip()] if changed.exists() else []
    grouped = group_paths(paths)
    snippets = get_snippets(args.base_ref, args.head_ref, paths)

    lines = []
    now = dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    lines.extend([
        "---",
        "report_type: evidence_pack",
        "persona_id: C-13",
        "persona_name: Data Collection and Evidence Packager",
        f"review_target: {args.review_target}",
        "repo: jhwodchuck/EmberChamber",
        f"base_ref: {args.base_ref}",
        f"head_ref: {args.head_ref}",
        f"commit_range: {args.base_ref}..{args.head_ref}",
        f"generated_at: {now}",
        "status: complete",
        "scope:",
        "  - repo-intake",
        "changed_paths:",
    ])
    for p in paths[:50]:
        lines.append(f"  - {p}")
    lines.extend([
        "evidence_inputs:",
        "  - review-request.yaml",
        "  - changed-files.txt",
        "recommended_followups:",
        "  - C-00",
        "severity_summary:",
        "  critical: 0",
        "  high: 0",
        "  medium: 0",
        "  low: 0",
        "  note: 0",
        "token_budget_tier: normal",
        "---",
        "",
        "# Executive summary",
        "",
        f"{len(paths)} changed path(s) detected across {len(grouped)} domain bucket(s). Use routing to activate only the minimum useful reviewer set.",
        "",
        "# Changed paths grouped by domain",
        "",
    ])
    for domain, items in grouped.items():
        lines.append(f"## {domain}")
        for item in items:
            lines.append(f"- `{item}`")
        lines.append("")
    lines.extend([
        "# Architecture and runtime impact",
        "",
        "- Determine whether active runtime paths were touched.",
        "- Flag any protocol, auth, storage, or release-surface changes.",
        "- Flag legacy-path touches for C-12 review.",
        "",
        "# Suggested reviewer set",
        "",
        "Run `npm run council:route -- changed-files.txt` for the initial reviewer set.",
        "",
        "# Snippet appendix",
        "",
    ])
    for idx, (path, diff) in enumerate(snippets, start=1):
        lines.extend([
            f"## Snippet {idx} — `{path}`",
            "```diff",
            diff,
            "```",
            "",
        ])

    Path(args.out).write_text("\n".join(lines).rstrip() + "\n")
    print(f"Wrote {args.out}")

if __name__ == "__main__":
    main()
