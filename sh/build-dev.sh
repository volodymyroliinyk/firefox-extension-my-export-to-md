#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "$0")/lib/amo-auth.sh"

release_dir=".release-dev"
artifacts_dir="web-ext-artifacts-dev"
zip_name="addon-dev.zip"
xpi_name="addon-dev.xpi"

run_checks() {
  echo "Running lint..."
  if npm run lint; then
    echo "Lint passed."
  else
    echo "Lint failed. Tests and build skipped."
    exit 1
  fi

  echo "Running tests..."
  if npm run test; then
    echo "Tests passed."
  else
    echo "Tests failed. Build skipped."
    exit 1
  fi
}

build_bundles() {
  echo "Building JavaScript bundles..."
  mkdir -p dist
  ./node_modules/.bin/esbuild src/content.ts --bundle --outfile=dist/content.js
  ./node_modules/.bin/esbuild src/background.ts --bundle --outfile=dist/background.js
}

prepare_release_dir() {
  echo "Preparing clean dev release directory..."
  rm -rf "$release_dir"
  mkdir -p "$release_dir"
  cp manifest.json "$release_dir/"
  cp package.json "$release_dir/"
  cp -r dist "$release_dir/"
  cp -r icons "$release_dir/"

  node -e "
const fs = require('fs');
const manifestPath = '${release_dir}/manifest.json';
const packagePath = '${release_dir}/package.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

pkg.name = 'my-export-to-md-dev';
manifest.name = 'MyExportToMD (DEV)';
manifest.browser_specific_settings ??= {};
manifest.browser_specific_settings.gecko ??= {};
manifest.browser_specific_settings.gecko.id = 'firefox-extension-my-export-to-md-dev@volodymyroliinyk.com';
manifest.action ??= {};
manifest.action.default_title = 'MyExportToMD (DEV)';

fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\\n');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\\n');
"
}

lint_release_dir() {
  echo "Running lint on clean dev release directory..."
  ./sh/lint-webext.sh "./$release_dir"
}

create_zip() {
  echo "Creating ${zip_name}..."
  rm -f "$zip_name"
  (cd "$release_dir" && zip -r "../$zip_name" manifest.json package.json dist/ icons/)
}

sign_dev_build() {
  echo "Signing dev build with AMO unlisted channel..."
  resolve_amo_credentials
  print_amo_auth_source

  rm -rf "$artifacts_dir"
  mkdir -p "$artifacts_dir"

  ./node_modules/.bin/web-ext sign \
    --source-dir "./$release_dir" \
    --artifacts-dir "$artifacts_dir" \
    --api-key "$AMO_API_KEY" \
    --api-secret "$AMO_API_SECRET" \
    --no-input \
    --channel unlisted

  local latest_xpi
  latest_xpi="$(ls -1t "$artifacts_dir"/*.xpi | head -n1)"
  if [[ -z "$latest_xpi" ]]; then
    echo "Error: web-ext sign did not produce an .xpi artifact." >&2
    exit 1
  fi

  cp "$latest_xpi" "$xpi_name"
  echo "Signed dev artifact copied to $xpi_name"
}

run_checks
build_bundles
prepare_release_dir
lint_release_dir
create_zip
sign_dev_build

echo "Dev build complete. ${zip_name} and ${xpi_name} are ready."
