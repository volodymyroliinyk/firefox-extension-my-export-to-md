#!/usr/bin/env bash

set -euo pipefail

source_dir="${1:-./}"

read -r -d '' js_code <<'JS' || true
const report = JSON.parse(process.argv[1]);
const allowedWarningCodes = new Set(['BACKGROUND_SERVICE_WORKER_IGNORED']);

const disallowedWarnings = (report.warnings || []).filter(
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

if ((report.summary?.warnings ?? 0) > 0) {
  console.log('web-ext lint warnings are allowed by policy only for: BACKGROUND_SERVICE_WORKER_IGNORED');
}
JS

lint_output="$(./node_modules/.bin/web-ext lint \
  --source-dir "$source_dir" \
  --output json \
  --boring \
  --ignore-files "sh/*" "*.zip" "node_modules/*" ".git/*" ".idea/*" "ai_prompts/*" "*.md" "package-lock.json" "package.json" "tsconfig.json" \
  2>/dev/null | tail -n 1)"

if [[ -z "$lint_output" ]]; then
  echo "Error: failed to read web-ext lint JSON output." >&2
  exit 1
fi

node -e "$js_code" "$lint_output"
