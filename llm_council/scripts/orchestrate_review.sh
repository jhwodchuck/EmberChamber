#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

BASE_REF="${1:-main}"
HEAD_REF="${2:-HEAD}"
REVIEW_TARGET="${3:-manual-review}"

cd "$REPO_ROOT"

bash "$SCRIPT_DIR/collect_changed_files.sh" "$BASE_REF" "$HEAD_REF"
bash "$SCRIPT_DIR/collect_repo_facts.sh" repo-facts.md
python3 -B "$SCRIPT_DIR/build_evidence_pack.py" --review-target "$REVIEW_TARGET" --base-ref "$BASE_REF" --head-ref "$HEAD_REF" --changed-files changed-files.txt --out evidence-pack.md
python3 -B "$SCRIPT_DIR/route_reviewers.py" changed-files.txt > recommended-reviewers.txt

echo "Generated:"
echo "  - changed-files.txt"
echo "  - changed-files.md"
echo "  - repo-facts.md"
echo "  - evidence-pack.md"
echo "  - recommended-reviewers.txt"
