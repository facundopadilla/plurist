#!/usr/bin/env bash
# check-license-reviews.sh — Fail if a dependency requires a license review doc that is missing.
#
# Currently enforces:
#   tldraw → docs/licenses/tldraw-bsl-review.md
#
# Called from CI (GitHub Actions) and can be run locally: ./scripts/check-license-reviews.sh

set -euo pipefail

ERRORS=0

# ── tldraw BSL-1.1 gate ────────────────────────────────────────────
if grep -q '"tldraw"' frontend/package.json 2>/dev/null; then
  if [ ! -f docs/licenses/tldraw-bsl-review.md ]; then
    echo "❌ tldraw is declared in frontend/package.json but docs/licenses/tldraw-bsl-review.md is missing."
    echo "   A BSL-1.1 license review is required before merging to main."
    ERRORS=$((ERRORS + 1))
  else
    echo "✅ tldraw license review found."
  fi
fi

# ── Add more license gates here as needed ───────────────────────────

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "License review check failed with $ERRORS error(s)."
  exit 1
fi

echo "All license reviews passed."
