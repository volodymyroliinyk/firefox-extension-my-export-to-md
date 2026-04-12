#!/usr/bin/env bash

set -euo pipefail

source_dir="${1:-./}"

stdout_file="$(mktemp)"
stderr_file="$(mktemp)"

cleanup() {
  rm -f "$stdout_file" "$stderr_file"
}
trap cleanup EXIT

if ! ./node_modules/.bin/web-ext lint \
  --source-dir "$source_dir" \
  --output json \
  --boring \
  --ignore-files "sh/*" "*.zip" "node_modules/*" ".git/*" ".idea/*" "ai_prompts/*" "*.md" "package-lock.json" "package.json" "tsconfig.json" \
  >"$stdout_file" 2>"$stderr_file"; then
  cat "$stderr_file" >&2 || true
  cat "$stdout_file" >&2 || true
  echo "Error: web-ext lint command failed." >&2
  exit 1
fi

# Keep diagnostics visible instead of suppressing stderr.
if [[ -s "$stderr_file" ]]; then
  cat "$stderr_file" >&2
fi

lint_output="$(grep -E '^\{' "$stdout_file" | tail -n 1)"
if [[ -z "$lint_output" ]]; then
  cat "$stdout_file" >&2 || true
  echo "Error: failed to parse web-ext lint JSON output." >&2
  exit 1
fi

node - "$lint_output" <<'JS'
const report = JSON.parse(process.argv[2]);
const allowedWarningCodes = new Set(['BACKGROUND_SERVICE_WORKER_IGNORED']);

const warnings = report.warnings || [];
const disallowedWarnings = warnings.filter(
  (warning) => !allowedWarningCodes.has(warning.code)
);

if ((report.summary?.errors ?? 0) > 0 || disallowedWarnings.length > 0) {
  if ((report.summary?.errors ?? 0) > 0) {
    console.error('web-ext lint errors found.');
  }

  if (disallowedWarnings.length > 0) {
    console.error('web-ext lint has disallowed warnings:');
    for (const warning of disallowedWarnings) {
      console.error(`- ${warning.code}: ${warning.message}`);
    }
  }

  process.exit(1);
}

if (warnings.length > 0) {
  console.log('web-ext lint warnings are allowed by policy only for: BACKGROUND_SERVICE_WORKER_IGNORED');
}
JS
