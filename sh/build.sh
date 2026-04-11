#!/usr/bin/env bash

set -euo pipefail

release_dir=".release"

echo "Building JavaScript bundles..."
mkdir -p dist
./node_modules/.bin/esbuild src/content.ts --bundle --outfile=dist/content.js
./node_modules/.bin/esbuild src/background.ts --bundle --outfile=dist/background.js

echo "Running tests..."
npm run test

echo "Preparing clean release directory..."
rm -rf "$release_dir"
mkdir -p "$release_dir"
cp manifest.json "$release_dir/"
cp -r dist "$release_dir/"

echo "Running lint on clean release directory..."
./node_modules/.bin/web-ext lint --source-dir "./$release_dir" --warnings-as-errors

echo "Creating addon.zip..."
rm -f addon.zip
(cd "$release_dir" && zip -r ../addon.zip manifest.json dist/)

echo "Build complete. Tests and release lint passed; addon.zip is ready."
