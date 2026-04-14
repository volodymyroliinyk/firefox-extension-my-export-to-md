#!/usr/bin/env bash

set -euo pipefail

release_dir=".release"
artifact_name="addon.zip"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command not found: $1" >&2
    exit 1
  fi
}

sync_manifest_version() {
  node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
manifest.version = pkg.version;
fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 2) + '\n');
"
}

run_quality_gates() {
  echo "Running lint..."
  npm run lint
  echo "Lint passed."

  echo "Running tests..."
  npm run test
  echo "Tests passed."
}

build_bundles() {
  echo "Building JavaScript bundles..."
  mkdir -p dist
  ./node_modules/.bin/esbuild src/content.ts --bundle --outfile=dist/content.js
  ./node_modules/.bin/esbuild src/background.ts --bundle --outfile=dist/background.js
}

prepare_release_dir() {
  echo "Preparing clean release directory..."
  rm -rf "$release_dir"
  mkdir -p "$release_dir"
  cp manifest.json "$release_dir/"
  cp -r dist "$release_dir/"
  cp -r icons "$release_dir/"
}

lint_release_dir() {
  echo "Running lint on clean release directory..."
  ./sh/lint-webext.sh "./$release_dir"
}

create_zip_artifact() {
  echo "Creating ${artifact_name}..."
  rm -f "$artifact_name"
  (cd "$release_dir" && zip -X -r "../$artifact_name" manifest.json dist/ icons/ >/dev/null)
}

require_cmd npm
require_cmd node
require_cmd zip

sync_manifest_version
run_quality_gates
build_bundles
prepare_release_dir
lint_release_dir
create_zip_artifact

echo "Build complete. ${artifact_name} is ready for AMO upload."
