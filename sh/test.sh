#!/usr/bin/env bash

set -euo pipefail

mkdir -p .test-build

echo "Running TypeScript type check..."
./node_modules/.bin/tsc --noEmit

./node_modules/.bin/esbuild src/export-config.ts --platform=node --format=cjs --outfile=.test-build/export-config.js >/dev/null
./node_modules/.bin/esbuild src/utils.ts --platform=node --format=cjs --outfile=.test-build/utils.js >/dev/null
./node_modules/.bin/esbuild src/content.ts --platform=node --format=cjs --outfile=.test-build/content.js >/dev/null
./node_modules/.bin/esbuild src/background.ts --platform=node --format=cjs --outfile=.test-build/background.js >/dev/null

readarray -t test_files < <(find tests -type f \( -name "*.test.js" -o -name "*.test.mjs" -o -name "*.test.cjs" \) | sort)

if [[ ${#test_files[@]} -eq 0 ]]; then
  echo "No JS test files found in tests/."
  exit 0
fi

echo "Running tests..."
node --test "${test_files[@]}"
