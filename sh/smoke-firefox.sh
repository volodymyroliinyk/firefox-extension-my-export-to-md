#!/usr/bin/env bash

set -euo pipefail

if [[ "${RUN_SMOKE_TEST:-false}" != "true" ]]; then
  echo "Firefox smoke test skipped (set RUN_SMOKE_TEST=true to enable)."
  exit 0
fi

if ! command -v firefox >/dev/null 2>&1; then
  echo "Error: firefox binary not found for smoke test." >&2
  exit 1
fi

if [[ ! -d .release ]]; then
  echo "Error: .release not found. Run npm run build first." >&2
  exit 1
fi

profile_dir="$(mktemp -d)"
log_file="$(mktemp)"

cleanup() {
  rm -rf "$profile_dir" "$log_file"
}
trap cleanup EXIT

echo "Running Firefox smoke test (30s timeout)..."
set +e
timeout 30s ./node_modules/.bin/web-ext run \
  --source-dir ./.release \
  --firefox "$(command -v firefox)" \
  --firefox-profile "$profile_dir" \
  --start-url "https://example.com" \
  --no-input \
  --browser-console \
  >"$log_file" 2>&1
status=$?
set -e

if [[ $status -eq 124 ]]; then
  echo "Smoke test passed: extension launched and stayed running during timeout window."
  exit 0
fi

if [[ $status -ne 0 ]]; then
  cat "$log_file" >&2 || true
  echo "Error: Firefox smoke test failed." >&2
  exit $status
fi

echo "Smoke test passed."
