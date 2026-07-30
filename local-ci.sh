#!/usr/bin/env bash
set -euo pipefail

log() { echo "[local-ci] $*"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export CI=true

# --- Cleanup ---
log "🧹 Cleaning up artifact folders..."
rm -rf allure-report allure-results playwright test-results
log "   Done."

# --- Setup ---
log "🔧 Running setup..."
npm run setup

# --- Tests ---
log "🧪 Running tests..."
TEST_EXIT_CODE=0
npm test || TEST_EXIT_CODE=$?

if [ "$TEST_EXIT_CODE" -ne 0 ]; then
    log "⚠️  Tests finished with failures (exit code $TEST_EXIT_CODE). Proceeding to report generation..."
fi

# --- Allure report (always runs) ---
log "📊 Generating Allure report..."
npm run allure:generate

# --- Summary ---
if [ "$TEST_EXIT_CODE" -eq 0 ]; then
    log "✅ All done! Tests passed."
else
    log "❌ Done, but tests failed (exit code $TEST_EXIT_CODE)."
fi

exit "$TEST_EXIT_CODE"
